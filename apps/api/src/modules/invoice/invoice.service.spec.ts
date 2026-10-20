import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { ContractRepository } from '../contract/contract.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { TenantRepository } from '../tenant/tenant.repository';
import { MeterReadingRepository } from '../meter-reading/meter-reading.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import { RealtimeGateway } from '../../infra/socket/socket.gateway';
import { FcmService } from '../../infra/fcm/fcm.service';
import { ContractStatus, InvoiceStatus, UserRole } from '../../common/constants';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: jest.Mocked<Partial<InvoiceRepository>>;
  let contractRepo: jest.Mocked<Partial<ContractRepository>>;
  let propertyRepo: jest.Mocked<Partial<PropertyRepository>>;
  let roomRepo: jest.Mocked<Partial<RoomRepository>>;
  let tenantRepo: jest.Mocked<Partial<TenantRepository>>;
  let meterRepo: jest.Mocked<Partial<MeterReadingRepository>>;
  let orgRepo: jest.Mocked<Partial<OrganizationRepository>>;
  let counterRepo: jest.Mocked<Partial<CounterRepository>>;
  let realtime: jest.Mocked<Partial<RealtimeGateway>>;
  let fcm: jest.Mocked<Partial<FcmService>>;

  const mockUser: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@example.com',
    organizationId: 'org-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  const mockTenantUser: AuthenticatedUser = {
    userId: 'user-tenant-1',
    email: 'tenant@example.com',
    organizationId: 'org-1',
    role: UserRole.TENANT,
    tenantId: 'tenant-123',
    permissions: [],
  };

  beforeEach(() => {
    invoiceRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      findActiveByContractAndPeriod: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn(),
      findPaginated: jest.fn(),
    };
    contractRepo = { findByIdOrThrow: jest.fn() };
    propertyRepo = { findById: jest.fn(), findByIdOrThrow: jest.fn() };
    roomRepo = { findById: jest.fn(), findByIdOrThrow: jest.fn() };
    tenantRepo = { findById: jest.fn() };
    meterRepo = { findByRoomAndPeriod: jest.fn() };
    orgRepo = { findById: jest.fn() };
    counterRepo = { getNextSequence: jest.fn().mockResolvedValue(123) };
    realtime = { emitToTenant: jest.fn(), emitToOrganization: jest.fn() };
    fcm = { sendPushNotification: jest.fn() };

    service = new InvoiceService(
      invoiceRepo as unknown as InvoiceRepository,
      contractRepo as unknown as ContractRepository,
      propertyRepo as unknown as PropertyRepository,
      roomRepo as unknown as RoomRepository,
      tenantRepo as unknown as TenantRepository,
      meterRepo as unknown as MeterReadingRepository,
      orgRepo as unknown as OrganizationRepository,
      counterRepo as unknown as CounterRepository,
      realtime as unknown as RealtimeGateway,
      fcm as unknown as FcmService,
    );
  });

  describe('generateDraftInvoice', () => {
    it('sinh hóa đơn DRAFT với mã INV-YYMM-000123 từ counters', async () => {
      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({
        _id: 'contract-1',
        contractNo: 'HD-2026-001',
        propertyId: 'prop-1',
        roomId: 'room-1',
        tenantId: 'tenant-1',
        status: ContractStatus.ACTIVE,
        rent: 3500000,
      });

      (invoiceRepo.findActiveByContractAndPeriod as jest.Mock).mockResolvedValue(null);
      (orgRepo.findById as jest.Mock).mockResolvedValue({
        settings: { roundingStep: 1000, invoiceDueDays: 5 },
      });
      (propertyRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({
        _id: 'prop-1',
        billingConfig: { electricityUnitPrice: 3500, waterUnitPrice: 25000 },
      });
      (meterRepo.findByRoomAndPeriod as jest.Mock).mockResolvedValue({
        electricityOld: 100,
        electricityNew: 150,
        waterOld: 10,
        waterNew: 14,
      });

      (invoiceRepo.create as jest.Mock).mockImplementation((_orgId, data) =>
        Promise.resolve({ _id: 'inv-created-1', ...data }),
      );

      const res = await service.generateDraftInvoice(mockUser, {
        contractId: 'contract-1',
        billingPeriodId: '2026-10',
      });

      expect(counterRepo.getNextSequence).toHaveBeenCalledWith('invoices_org-1_2610');
      expect(res.invoiceNumber).toBe('INV-2610-000123');
      expect(res.invoiceNo).toBe('INV-2610-000123');
      expect(res.status).toBe(InvoiceStatus.DRAFT);
    });
  });

  describe('PATCH /invoices/:id (chỉ cho phép khi DRAFT)', () => {
    it('cho phép sửa khi invoice đang ở trạng thái DRAFT', async () => {
      (invoiceRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({
        _id: 'inv-draft',
        status: InvoiceStatus.DRAFT,
        items: [{ quantity: 1, unitPrice: 3000000, amount: 3000000 }],
        paidAmount: 0,
      });
      (orgRepo.findById as jest.Mock).mockResolvedValue({ settings: { roundingStep: 1000 } });
      (invoiceRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) =>
        Promise.resolve({ _id: 'inv-draft', ...update.$set }),
      );

      const res = await service.updateDraftInvoice(mockUser, 'inv-draft', {
        discount: 100000,
        notes: 'Giảm giá đầu năm',
      });

      expect(res!.discount).toBe(100000);
      expect(res!.totalAmount).toBe(2900000);
      expect(res!.remainingAmount).toBe(2900000);
    });

    it('ném lỗi 422 nếu cố tình sửa invoice đã ISSUED hoặc PAID', async () => {
      (invoiceRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({
        _id: 'inv-issued',
        status: InvoiceStatus.ISSUED,
      });

      await expect(
        service.updateDraftInvoice(mockUser, 'inv-issued', { discount: 50000 }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });
  });

  describe('POST /invoices/:id/cancel (không hủy được PAID)', () => {
    it('ném lỗi 422 nếu cố hủy hóa đơn đã PAID', async () => {
      (invoiceRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({
        _id: 'inv-paid',
        status: InvoiceStatus.PAID,
      });

      await expect(
        service.cancelOrVoidInvoice(mockUser, 'inv-paid', { reason: 'Khách trả phòng' }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('hủy hóa đơn ISSUED thành VOIDED kèm lý do và nhả active constraint', async () => {
      (invoiceRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({
        _id: 'inv-issued',
        status: InvoiceStatus.ISSUED,
      });
      (invoiceRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) =>
        Promise.resolve({ _id: 'inv-issued', ...update.$set }),
      );

      const res = await service.cancelOrVoidInvoice(mockUser, 'inv-issued', {
        reason: 'Hóa đơn tính nhầm chỉ số',
      });

      expect(res!.status).toBe(InvoiceStatus.VOIDED);
      expect(res!.active).toBe(false);
      expect(res!.cancellationReason).toBe('Hóa đơn tính nhầm chỉ số');
    });
  });

  describe('GET /invoices/:id/payment-qr & /pdf', () => {
    it('sinh đúng link VietQR với bankAccount, invoiceNo và số tiền remaining', async () => {
      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-qr',
        invoiceNo: 'INV-2610-000123',
        propertyId: 'prop-1',
        remainingAmount: 3935000,
        tenantId: 'tenant-123',
      });
      (propertyRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'prop-1',
        bankAccount: { bankCode: 'MB', accountNo: '0987654321', accountName: 'NGUYEN VAN A' },
      });

      const qrRes = await service.getPaymentQr(mockUser, 'inv-qr');
      expect(qrRes.bankCode).toBe('MB');
      expect(qrRes.accountNo).toBe('0987654321');
      expect(qrRes.amount).toBe(3935000);
      expect(qrRes.transferContent).toBe('INV-2610-000123');
      expect(qrRes.qrUrl).toContain('https://img.vietqr.io/image/MB-0987654321-compact2.png');
      expect(qrRes.qrUrl).toContain('amount=3935000');
    });

    it('TENANT truy cập invoice của người khác bị trả 404', async () => {
      (invoiceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'inv-other',
        tenantId: 'tenant-other-999',
      });

      await expect(service.getInvoiceById(mockTenantUser, 'inv-other')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('GET /debts (báo cáo công nợ & aging buckets)', () => {
    it('gom nợ theo phòng/tenant và chia đúng bucket: current, 1-7, 8-30, >30 ngày', async () => {
      const today = new Date();
      const createDate = (diffDays: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - diffDays);
        return d;
      };

      (invoiceRepo.find as jest.Mock).mockResolvedValue([
        {
          _id: 'inv-1',
          roomId: 'room-101',
          tenantId: 'tenant-1',
          remainingAmount: 1000000,
          dueDate: createDate(-5), // Due date in future (+5 days) -> current
          status: InvoiceStatus.ISSUED,
        },
        {
          _id: 'inv-2',
          roomId: 'room-101',
          tenantId: 'tenant-1',
          remainingAmount: 500000,
          dueDate: createDate(3), // Overdue 3 days -> bucket 1-7
          status: InvoiceStatus.ISSUED,
        },
        {
          _id: 'inv-3',
          roomId: 'room-102',
          tenantId: 'tenant-2',
          remainingAmount: 2000000,
          dueDate: createDate(15), // Overdue 15 days -> bucket 8-30
          status: InvoiceStatus.PARTIALLY_PAID,
        },
        {
          _id: 'inv-4',
          roomId: 'room-103',
          tenantId: 'tenant-3',
          remainingAmount: 3000000,
          dueDate: createDate(45), // Overdue 45 days -> bucket >30
          status: InvoiceStatus.OVERDUE,
        },
      ]);

      (roomRepo.findById as jest.Mock).mockImplementation((_orgId, roomId) =>
        Promise.resolve({ _id: roomId, code: roomId.replace('room-', '') }),
      );
      (tenantRepo.findById as jest.Mock).mockImplementation((_orgId, tenantId) =>
        Promise.resolve({ _id: tenantId, fullName: `Tenant ${tenantId}`, phone: '0900000000' }),
      );

      const debtsRes = await service.getDebts(mockUser, {});

      expect(debtsRes.totalDebt).toBe(6500000);
      expect(debtsRes.totalDebtors).toBe(3);
      expect(debtsRes.summary.current).toBe(1000000);
      expect(debtsRes.summary.bucket_1_7).toBe(500000);
      expect(debtsRes.summary.bucket_8_30).toBe(2000000);
      expect(debtsRes.summary.bucket_over_30).toBe(3000000);
    });
  });
});
