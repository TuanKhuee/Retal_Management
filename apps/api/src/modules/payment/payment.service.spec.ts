import { Connection } from 'mongoose';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { InvoiceRepository } from '../invoice/invoice.repository';
import { RealtimeGateway } from '../../infra/socket/socket.gateway';
import { FcmService } from '../../infra/fcm/fcm.service';
import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '../../common/constants';
import {
  BusinessRuleViolationException,
  IdempotencyConflictException,
  OptimisticLockException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

describe('PaymentService', () => {
  let service: PaymentService;
  let connection: jest.Mocked<Partial<Connection>>;
  let paymentRepo: jest.Mocked<Partial<PaymentRepository>>;
  let invoiceRepo: jest.Mocked<Partial<InvoiceRepository>>;
  let realtime: jest.Mocked<Partial<RealtimeGateway>>;
  let fcm: jest.Mocked<Partial<FcmService>>;

  const mockUser: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'tuankhue81@gmail.com',
    organizationId: 'org-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  const mockTenantUser: AuthenticatedUser = {
    userId: 'user-tenant-1',
    email: 'tenant@example.com',
    organizationId: 'org-1',
    role: UserRole.TENANT,
    tenantId: 'tenant-1',
    permissions: [],
  };

  beforeEach(() => {
    connection = {
      startSession: jest.fn().mockRejectedValue(new Error('Standalone mongo mode')),
    };

    paymentRepo = {
      findByIdempotencyKey: jest.fn(),
      findByMethodAndReference: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
      findPaginated: jest.fn(),
    };

    invoiceRepo = {
      findById: jest.fn(),
      updateWithOptimisticLock: jest.fn(),
    };

    realtime = { emitToOrganization: jest.fn() };
    fcm = { sendPushNotification: jest.fn() };

    service = new PaymentService(
      connection as unknown as Connection,
      paymentRepo as unknown as PaymentRepository,
      invoiceRepo as unknown as InvoiceRepository,
      realtime as unknown as RealtimeGateway,
      fcm as unknown as FcmService,
    );
  });

  describe('processPayment', () => {
    it('thanh toán một phần -> hóa đơn cập nhật PARTIALLY_PAID', async () => {
      (paymentRepo.findByIdempotencyKey as jest.Mock).mockResolvedValue(null);
      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        contractId: 'contract-1',
        tenantId: 'tenant-1',
        status: InvoiceStatus.ISSUED,
        totalAmount: 4000000,
        paidAmount: 0,
        remainingAmount: 4000000,
        version: 0,
      });

      (invoiceRepo.updateWithOptimisticLock as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        paidAmount: 1500000,
        remainingAmount: 2500000,
        status: InvoiceStatus.PARTIALLY_PAID,
      });

      (paymentRepo.create as jest.Mock).mockImplementation((_orgId, data) =>
        Promise.resolve({ _id: 'pay-1', ...data }),
      );

      const res = await service.processPayment(mockUser, {
        invoiceId: 'inv-1',
        amount: 1500000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      });

      expect(invoiceRepo.updateWithOptimisticLock).toHaveBeenCalledWith(
        'org-1',
        'inv-1',
        0,
        {
          $set: {
            paidAmount: 1500000,
            remainingAmount: 2500000,
            status: InvoiceStatus.PARTIALLY_PAID,
          },
        },
        undefined,
      );
      expect(res.status).toBe(PaymentStatus.CONFIRMED);
    });

    it('thanh toán đủ toàn bộ remaining -> hóa đơn cập nhật PAID', async () => {
      (paymentRepo.findByIdempotencyKey as jest.Mock).mockResolvedValue(null);
      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        contractId: 'contract-1',
        tenantId: 'tenant-1',
        status: InvoiceStatus.PARTIALLY_PAID,
        totalAmount: 4000000,
        paidAmount: 1500000,
        remainingAmount: 2500000,
        version: 1,
      });

      (invoiceRepo.updateWithOptimisticLock as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        paidAmount: 4000000,
        remainingAmount: 0,
        status: InvoiceStatus.PAID,
      });

      (paymentRepo.create as jest.Mock).mockImplementation((_orgId, data) =>
        Promise.resolve({ _id: 'pay-2', ...data }),
      );

      await service.processPayment(mockUser, {
        invoiceId: 'inv-1',
        amount: 2500000,
        paymentMethod: PaymentMethod.CASH,
      });

      expect(invoiceRepo.updateWithOptimisticLock).toHaveBeenCalledWith(
        'org-1',
        'inv-1',
        1,
        {
          $set: {
            paidAmount: 4000000,
            remainingAmount: 0,
            status: InvoiceStatus.PAID,
          },
        },
        undefined,
      );
    });

    it('chặn thanh toán vượt quá số tiền còn lại (amount > remaining) -> ném 422', async () => {
      (paymentRepo.findByIdempotencyKey as jest.Mock).mockResolvedValue(null);
      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        status: InvoiceStatus.ISSUED,
        totalAmount: 3000000,
        paidAmount: 0,
        remainingAmount: 3000000,
      });

      await expect(
        service.processPayment(mockUser, {
          invoiceId: 'inv-1',
          amount: 3500000, // Vượt quá 3,000,000
          paymentMethod: PaymentMethod.BANK_TRANSFER,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('Concurrency: 2 người ghi payment song song -> OptimisticLock chặn người thứ hai', async () => {
      (paymentRepo.findByIdempotencyKey as jest.Mock).mockResolvedValue(null);
      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        status: InvoiceStatus.ISSUED,
        totalAmount: 3000000,
        paidAmount: 0,
        remainingAmount: 3000000,
        version: 0,
      });

      // Người 1 cập nhật thành công làm tăng version từ 0 lên 1
      // Người 2 cố cập nhật với version 0 cũ -> updateWithOptimisticLock ném OptimisticLockException
      (invoiceRepo.updateWithOptimisticLock as jest.Mock).mockRejectedValue(
        new OptimisticLockException('Version changed'),
      );

      await expect(
        service.processPayment(mockUser, {
          invoiceId: 'inv-1',
          amount: 2000000,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
        }),
      ).rejects.toThrow(OptimisticLockException);
    });

    it('chặn duplicate giao dịch ngân hàng theo Unique (method, reference) -> ném 422', async () => {
      (paymentRepo.findByMethodAndReference as jest.Mock).mockResolvedValue({
        _id: 'pay-existing',
        transactionReference: 'FT123456789',
      });

      await expect(
        service.processPayment(mockUser, {
          invoiceId: 'inv-1',
          amount: 1000000,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          transactionReference: 'FT123456789',
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });
  });

  describe('Payment Claims Flow (TENANT claim -> OWNER confirm / reject / void)', () => {
    it('TENANT: gửi claim thanh toán chuyển khoản kèm ảnh chứng từ -> tạo bản ghi PENDING', async () => {
      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        tenantId: 'tenant-1',
        status: InvoiceStatus.ISSUED,
        remainingAmount: 3000000,
      });

      (paymentRepo.create as jest.Mock).mockImplementation((_orgId, data) =>
        Promise.resolve({ _id: 'claim-1', ...data }),
      );

      const claim = await service.createPaymentClaim(mockTenantUser, 'inv-1', {
        amount: 3000000,
        transactionReference: 'MB12345',
        proofAttachmentId: 'att-proof-1',
        notes: 'Đã chuyển khoản qua app MB',
      });

      expect(claim.status).toBe(PaymentStatus.PENDING);
      expect(claim.proofAttachmentId).toBe('att-proof-1');
    });

    it('OWNER: xác nhận claim PENDING -> chuyển CONFIRMED và cập nhật công nợ', async () => {
      (paymentRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'claim-1',
        invoiceId: 'inv-1',
        amount: 3000000,
        status: PaymentStatus.PENDING,
      });

      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        totalAmount: 3000000,
        paidAmount: 0,
        remainingAmount: 3000000,
        version: 0,
      });

      (invoiceRepo.updateWithOptimisticLock as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        paidAmount: 3000000,
        remainingAmount: 0,
        status: InvoiceStatus.PAID,
      });

      (paymentRepo.updateOne as jest.Mock).mockResolvedValue({
        _id: 'claim-1',
        status: PaymentStatus.CONFIRMED,
      });

      const confirmed = await service.confirmPayment(mockUser, 'claim-1');
      expect(confirmed.status).toBe(PaymentStatus.CONFIRMED);
    });

    it('OWNER: void thanh toán đã CONFIRMED -> hoàn lại tiền nợ trên hóa đơn', async () => {
      (paymentRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 1000000,
        status: PaymentStatus.CONFIRMED,
      });

      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        totalAmount: 3000000,
        paidAmount: 1000000,
        remainingAmount: 2000000,
        version: 1,
      });

      (invoiceRepo.updateWithOptimisticLock as jest.Mock).mockResolvedValue({
        _id: 'inv-1',
        paidAmount: 0,
        remainingAmount: 3000000,
        status: InvoiceStatus.ISSUED,
      });

      (paymentRepo.updateOne as jest.Mock).mockResolvedValue({
        _id: 'pay-1',
        status: PaymentStatus.VOIDED,
      });

      const voided = await service.voidPayment(mockUser, 'pay-1', {
        reason: 'Khách yêu cầu hủy phiếu thu do chuyển nhầm tài khoản',
      });

      expect(voided.status).toBe(PaymentStatus.VOIDED);
      expect(invoiceRepo.updateWithOptimisticLock).toHaveBeenCalledWith(
        'org-1',
        'inv-1',
        1,
        {
          $set: {
            paidAmount: 0,
            remainingAmount: 3000000,
            status: InvoiceStatus.ISSUED,
          },
        },
        undefined,
      );
    });
  });
});
