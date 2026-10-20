import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';
import { PaymentRepository } from './payment.repository';
import { InvoiceRepository } from '../invoice/invoice.repository';
import {
  CreatePaymentDto,
  CreatePaymentClaimDto,
  RejectPaymentDto,
  VoidPaymentDto,
} from './dto/create-payment.dto';
import {
  BusinessRuleViolationException,
  IdempotencyConflictException,
  OptimisticLockException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import {
  InvoiceStatus,
  PaymentStatus,
  UserRole,
} from '../../common/constants';
import { RealtimeGateway } from '../../infra/socket/socket.gateway';
import { FcmService } from '../../infra/fcm/fcm.service';
import { PaymentDocument } from './schemas/payment.schema';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly paymentRepo: PaymentRepository,
    private readonly invoiceRepo: InvoiceRepository,
    private readonly realtime: RealtimeGateway,
    private readonly fcm: FcmService,
  ) {}

  /**
   * Helper session runner
   */
  private async getSession(): Promise<{ session: ClientSession | null; isTx: boolean }> {
    try {
      const session = await this.connection.startSession();
      session.startTransaction();
      return { session, isTx: true };
    } catch (err: any) {
      this.logger.warn(`MongoDB transaction not available: ${err.message}. Running standalone mode.`);
      return { session: null, isTx: false };
    }
  }

  /**
   * POST /payments (CASH | BANK_TRANSFER)
   * Trong transaction: kiểm amount <= remaining, insert CONFIRMED,
   * cập nhật paidAmount/remaining/status (ISSUED -> PARTIALLY_PAID -> PAID),
   * optimistic lock, audit, rồi bắn event notification.
   * Unique idempotencyKey và (method, reference).
   */
  async processPayment(
    user: AuthenticatedUser,
    dto: CreatePaymentDto,
    idempotencyKey?: string,
  ): Promise<PaymentDocument> {
    const orgId = user.organizationId;
    const amount = Math.round(dto.amount);

    if (amount <= 0) {
      throw new BusinessRuleViolationException('Payment amount must be greater than 0');
    }

    // 1. Kiểm tra Idempotency Key (nếu có)
    if (idempotencyKey) {
      const existingPayment = await this.paymentRepo.findByIdempotencyKey(orgId, idempotencyKey);
      if (existingPayment) {
        if (
          existingPayment.invoiceId.toString() === dto.invoiceId &&
          existingPayment.amount === amount
        ) {
          this.logger.log(`Idempotent request detected for key ${idempotencyKey}. Returning existing payment.`);
          return existingPayment;
        }
        throw new IdempotencyConflictException(
          `Idempotency-Key "${idempotencyKey}" already used with different parameters`,
        );
      }
    }

    // 2. Kiểm tra Unique (method, reference)
    if (dto.transactionReference) {
      const duplicateRef = await this.paymentRepo.findByMethodAndReference(
        orgId,
        dto.paymentMethod,
        dto.transactionReference.trim(),
      );
      if (duplicateRef) {
        throw new BusinessRuleViolationException(
          `Transaction reference "${dto.transactionReference}" has already been processed for payment method ${dto.paymentMethod}.`,
        );
      }
    }

    // 3. Thực thi trong transaction + Optimistic Locking
    const { session, isTx } = await this.getSession();

    try {
      const invoice = await this.invoiceRepo.findById(orgId, dto.invoiceId);
      if (!invoice) {
        throw new ResourceNotFoundException('Invoice');
      }

      if (user.role === UserRole.TENANT && invoice.tenantId.toString() !== user.tenantId) {
        throw new ResourceNotFoundException('Invoice');
      }

      if (
        invoice.status !== InvoiceStatus.ISSUED &&
        invoice.status !== InvoiceStatus.PARTIALLY_PAID &&
        invoice.status !== InvoiceStatus.OVERDUE
      ) {
        throw new BusinessRuleViolationException(
          `Cannot process payment for invoice in status '${invoice.status}'. Invoice must be ISSUED, PARTIALLY_PAID, or OVERDUE.`,
        );
      }

      if (amount > invoice.remainingAmount) {
        throw new BusinessRuleViolationException(
          `Payment amount (${amount.toLocaleString('vi-VN')} VND) exceeds remaining invoice balance (${invoice.remainingAmount.toLocaleString('vi-VN')} VND).`,
        );
      }

      const currentVersion = invoice.version;
      const newPaidAmount = invoice.paidAmount + amount;
      const newRemainingAmount = invoice.totalAmount - newPaidAmount;
      const newStatus =
        newRemainingAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      // Optimistic lock update invoice
      const updatedInvoice = await this.invoiceRepo.updateWithOptimisticLock(
        orgId,
        invoice._id.toString(),
        currentVersion,
        {
          $set: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
          },
        },
        session || undefined,
      );

      if (!updatedInvoice) {
        throw new OptimisticLockException();
      }

      // Tạo bản ghi Payment CONFIRMED
      const createdPayment = await this.paymentRepo.create(
        orgId,
        {
          invoiceId: invoice._id.toString(),
          contractId: invoice.contractId,
          tenantId: invoice.tenantId,
          amount,
          paymentMethod: dto.paymentMethod,
          idempotencyKey,
          transactionReference: dto.transactionReference?.trim(),
          paymentDate: new Date(),
          status: PaymentStatus.CONFIRMED,
          notes: dto.notes,
          confirmedBy: user.userId,
          confirmedAt: new Date(),
          active: true,
        } as any,
        session || undefined,
      );

      if (session && isTx) {
        await session.commitTransaction();
      }

      // Socket realtime & FCM push
      this.realtime.emitToOrganization(orgId, 'payment:received', {
        paymentId: createdPayment._id,
        invoiceId: invoice._id,
        amount,
        remainingAmount: newRemainingAmount,
      });

      this.fcm.sendPushNotification({
        topic: `tenant-${invoice.tenantId}`,
        title: 'Thanh toán thành công',
        body: `Đã ghi nhận thanh toán ${amount.toLocaleString('vi-VN')} VND cho hóa đơn ${invoice.invoiceNumber || invoice.invoiceNo}.`,
      });

      return createdPayment;
    } catch (error) {
      if (session && isTx) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * TENANT: POST /invoices/:id/payment-claims
   * Khách thuê báo đã chuyển khoản + ảnh chứng từ -> tạo bản ghi PENDING
   */
  async createPaymentClaim(
    user: AuthenticatedUser,
    invoiceId: string,
    dto: CreatePaymentClaimDto,
  ): Promise<PaymentDocument> {
    const orgId = user.organizationId;
    const amount = Math.round(dto.amount);

    if (amount <= 0) {
      throw new BusinessRuleViolationException('Payment amount must be greater than 0');
    }

    const invoice = await this.invoiceRepo.findById(orgId, invoiceId);
    if (!invoice) {
      throw new ResourceNotFoundException('Invoice');
    }

    if (user.role === UserRole.TENANT && invoice.tenantId.toString() !== user.tenantId) {
      throw new ResourceNotFoundException('Invoice');
    }

    if (
      invoice.status !== InvoiceStatus.ISSUED &&
      invoice.status !== InvoiceStatus.PARTIALLY_PAID &&
      invoice.status !== InvoiceStatus.OVERDUE
    ) {
      throw new BusinessRuleViolationException(
        `Cannot claim payment for invoice in status '${invoice.status}'.`,
      );
    }

    if (amount > invoice.remainingAmount) {
      throw new BusinessRuleViolationException(
        `Claimed amount (${amount.toLocaleString('vi-VN')} VND) exceeds remaining invoice balance (${invoice.remainingAmount.toLocaleString('vi-VN')} VND).`,
      );
    }

    const paymentMethod = dto.paymentMethod || 'BANK_TRANSFER';

    const claim = await this.paymentRepo.create(orgId, {
      invoiceId: invoice._id.toString(),
      contractId: invoice.contractId,
      tenantId: invoice.tenantId,
      amount,
      paymentMethod,
      transactionReference: dto.transactionReference?.trim(),
      proofAttachmentId: dto.proofAttachmentId,
      paymentDate: new Date(),
      status: PaymentStatus.PENDING,
      notes: dto.notes,
      active: true,
    } as any);

    // Bắn realtime thông báo cho OWNER / MANAGER
    this.realtime.emitToOrganization(orgId, 'payment_claim:submitted', {
      claimId: claim._id,
      invoiceId: invoice._id,
      amount,
      tenantId: invoice.tenantId,
    });

    return claim;
  }

  /**
   * OWNER: POST /payments/:id/confirm
   * Xác nhận claim PENDING -> chuyển CONFIRMED và cập nhật công nợ hóa đơn
   */
  async confirmPayment(
    user: AuthenticatedUser,
    paymentId: string,
  ): Promise<PaymentDocument> {
    const orgId = user.organizationId;
    const payment = await this.paymentRepo.findById(orgId, paymentId);
    if (!payment) {
      throw new ResourceNotFoundException('Payment');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BusinessRuleViolationException(
        `Cannot confirm payment in status '${payment.status}'. Must be PENDING.`,
      );
    }

    const { session, isTx } = await this.getSession();

    try {
      const invoice = await this.invoiceRepo.findById(orgId, payment.invoiceId.toString());
      if (!invoice) {
        throw new ResourceNotFoundException('Invoice');
      }

      if (payment.amount > invoice.remainingAmount) {
        throw new BusinessRuleViolationException(
          `Payment claim amount (${payment.amount.toLocaleString('vi-VN')} VND) exceeds current remaining invoice balance (${invoice.remainingAmount.toLocaleString('vi-VN')} VND).`,
        );
      }

      const currentVersion = invoice.version;
      const newPaidAmount = invoice.paidAmount + payment.amount;
      const newRemainingAmount = invoice.totalAmount - newPaidAmount;
      const newStatus =
        newRemainingAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await this.invoiceRepo.updateWithOptimisticLock(
        orgId,
        invoice._id.toString(),
        currentVersion,
        {
          $set: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
          },
        },
        session || undefined,
      );

      if (!updatedInvoice) {
        throw new OptimisticLockException();
      }

      const updatedPayment = await this.paymentRepo.updateOne(
        orgId,
        { _id: paymentId } as any,
        {
          $set: {
            status: PaymentStatus.CONFIRMED,
            confirmedBy: user.userId,
            confirmedAt: new Date(),
          },
        },
        session || undefined,
      );

      if (session && isTx) {
        await session.commitTransaction();
      }

      this.fcm.sendPushNotification({
        topic: `tenant-${invoice.tenantId}`,
        title: 'Thanh toán đã được xác nhận',
        body: `Chủ trọ đã xác nhận thanh toán ${payment.amount.toLocaleString('vi-VN')} VND cho hóa đơn ${invoice.invoiceNumber || invoice.invoiceNo}.`,
      });

      return updatedPayment!;
    } catch (error) {
      if (session && isTx) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * OWNER: POST /payments/:id/reject
   * Từ chối claim PENDING kèm lý do
   */
  async rejectPayment(
    user: AuthenticatedUser,
    paymentId: string,
    dto: RejectPaymentDto,
  ): Promise<PaymentDocument> {
    const orgId = user.organizationId;
    const payment = await this.paymentRepo.findById(orgId, paymentId);
    if (!payment) {
      throw new ResourceNotFoundException('Payment');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BusinessRuleViolationException(
        `Cannot reject payment in status '${payment.status}'. Must be PENDING.`,
      );
    }

    const updated = await this.paymentRepo.updateOne(
      orgId,
      { _id: paymentId } as any,
      {
        $set: {
          status: PaymentStatus.REJECTED,
          rejectionReason: dto.reason,
          rejectedAt: new Date(),
        },
      },
    );

    return updated!;
  }

  /**
   * OWNER: POST /payments/:id/void
   * Hủy thanh toán đã CONFIRMED (bắt buộc reason), hoàn lại tiền nợ trên hóa đơn
   */
  async voidPayment(
    user: AuthenticatedUser,
    paymentId: string,
    dto: VoidPaymentDto,
  ): Promise<PaymentDocument> {
    const orgId = user.organizationId;
    const payment = await this.paymentRepo.findById(orgId, paymentId);
    if (!payment) {
      throw new ResourceNotFoundException('Payment');
    }

    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BusinessRuleViolationException(
        `Cannot void payment in status '${payment.status}'. Only CONFIRMED payments can be voided.`,
      );
    }

    const { session, isTx } = await this.getSession();

    try {
      const invoice = await this.invoiceRepo.findById(orgId, payment.invoiceId.toString());
      if (!invoice) {
        throw new ResourceNotFoundException('Invoice');
      }

      const currentVersion = invoice.version;
      const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
      const newRemainingAmount = invoice.totalAmount - newPaidAmount;
      const newStatus =
        newPaidAmount === 0 ? InvoiceStatus.ISSUED : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await this.invoiceRepo.updateWithOptimisticLock(
        orgId,
        invoice._id.toString(),
        currentVersion,
        {
          $set: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
          },
        },
        session || undefined,
      );

      if (!updatedInvoice) {
        throw new OptimisticLockException();
      }

      const updatedPayment = await this.paymentRepo.updateOne(
        orgId,
        { _id: paymentId } as any,
        {
          $set: {
            status: PaymentStatus.VOIDED,
            active: false,
            voidReason: dto.reason,
            voidedAt: new Date(),
          },
        },
        session || undefined,
      );

      if (session && isTx) {
        await session.commitTransaction();
      }

      return updatedPayment!;
    } catch (error) {
      if (session && isTx) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  async getPaymentById(user: AuthenticatedUser, paymentId: string) {
    const payment = await this.paymentRepo.findById(user.organizationId, paymentId);
    if (!payment) {
      throw new ResourceNotFoundException('Payment');
    }

    if (user.role === UserRole.TENANT && payment.tenantId.toString() !== user.tenantId) {
      throw new ResourceNotFoundException('Payment');
    }

    return payment;
  }

  async listPayments(
    user: AuthenticatedUser,
    page = 1,
    limit = 20,
    invoiceId?: string,
  ) {
    const filter: any = {};
    if (invoiceId) filter.invoiceId = invoiceId;

    if (user.role === UserRole.TENANT) {
      if (!user.tenantId) {
        return { data: [], meta: { page: 1, limit, totalItems: 0, totalPages: 1, hasNext: false, hasPrev: false } };
      }
      filter.tenantId = user.tenantId;
    }

    return this.paymentRepo.findPaginated(user.organizationId, filter, page, limit);
  }
}
