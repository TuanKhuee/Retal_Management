import { Injectable, Logger } from '@nestjs/common';
import { InvoiceRepository } from './invoice.repository';
import { ContractRepository } from '../contract/contract.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { TenantRepository } from '../tenant/tenant.repository';
import { MeterReadingRepository } from '../meter-reading/meter-reading.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import {
  GenerateInvoiceDto,
  CancelInvoiceDto,
  UpdateInvoiceDto,
  BatchIssueInvoicesDto,
  QueryInvoicesDto,
  QueryDebtsDto,
} from './dto/create-invoice.dto';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import {
  ContractStatus,
  InvoiceItemType,
  InvoiceStatus,
  UserRole,
} from '../../common/constants';
import { BillingCalculator } from '../../common/utils/billing-calculator';
import { InvoiceItem } from './schemas/invoice.schema';
import { RealtimeGateway } from '../../infra/socket/socket.gateway';
import { FcmService } from '../../infra/fcm/fcm.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly contractRepo: ContractRepository,
    private readonly propertyRepo: PropertyRepository,
    private readonly roomRepo: RoomRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly meterRepo: MeterReadingRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly counterRepo: CounterRepository,
    private readonly realtime: RealtimeGateway,
    private readonly fcm: FcmService,
  ) {}

  /**
   * Helper sinh mã số hóa đơn theo counters: INV-YYMM-000123
   */
  async generateInvoiceNumber(organizationId: string, billingPeriod: string): Promise<string> {
    const yymm = billingPeriod.replace('-', '').slice(2, 6); // Vd: 2026-10 -> 2610
    const seq = await this.counterRepo.getNextSequence(`invoices_${organizationId}_${yymm}`);
    return `INV-${yymm}-${seq.toString().padStart(6, '0')}`;
  }

  async generateDraftInvoice(user: AuthenticatedUser, dto: GenerateInvoiceDto) {
    // 1. Fetch Contract & ensure active
    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      dto.contractId,
      'Contract',
    );

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BusinessRuleViolationException(
        `Cannot generate invoice for contract in status '${contract.status}'. Contract must be ACTIVE.`,
      );
    }

    // 2. Check unique active invoice for this period
    const existing = await this.invoiceRepo.findActiveByContractAndPeriod(
      user.organizationId,
      dto.contractId,
      dto.billingPeriodId,
    );
    if (existing) {
      throw new BusinessRuleViolationException(
        `An active invoice for contract #${contract.contractNumber || contract.contractNo} in period ${dto.billingPeriodId} already exists (Invoice #${existing.invoiceNumber}).`,
      );
    }

    // 3. Fetch Organization settings for roundingStep
    const org = await this.orgRepo.findById(user.organizationId);
    const roundingStep = org?.settings?.roundingStep ?? 1000;
    const dueDays = org?.settings?.invoiceDueDays ?? 5;

    // 4. Fetch Property for utility unit prices
    const property = await this.propertyRepo.findByIdOrThrow(
      user.organizationId,
      contract.propertyId,
      'Property',
    );

    // 5. Build snapshot line items
    const items: InvoiceItem[] = [];

    // Line item: Base Rent
    const rentAmount = contract.rent ?? contract.rentalPrice ?? 0;
    items.push({
      type: InvoiceItemType.RENT,
      description: `Tien phong ky ${dto.billingPeriodId}`,
      quantity: 1,
      unitPrice: rentAmount,
      amount: rentAmount,
    });

    // Line items: Meter readings (Electricity & Water)
    const meterReading = await this.meterRepo.findByRoomAndPeriod(
      user.organizationId,
      contract.roomId,
      dto.billingPeriodId,
    );

    const elecPrice =
      property.billingConfig?.electricityUnitPrice ??
      property.electricityUnitPrice ??
      3500;
    const waterPrice =
      property.billingConfig?.waterUnitPrice ??
      property.waterUnitPrice ??
      25000;
    const internetPrice =
      property.billingConfig?.internetUnitPrice ??
      property.internetUnitPrice ??
      0;
    const garbagePrice =
      property.billingConfig?.garbageUnitPrice ??
      property.garbageUnitPrice ??
      0;

    if (meterReading) {
      const elecOld = meterReading.electricityOld ?? 0;
      const elecNew = meterReading.electricityNew ?? elecOld;
      const waterOld = meterReading.waterOld ?? 0;
      const waterNew = meterReading.waterNew ?? waterOld;

      // Electricity
      const elecCalc = BillingCalculator.calculateUtility(
        {
          oldReading: elecOld,
          newReading: elecNew,
          unitPrice: elecPrice,
        },
        roundingStep,
      );
      items.push({
        type: InvoiceItemType.ELECTRICITY,
        description: `Tien dien (${elecOld} -> ${elecNew} kWh)`,
        quantity: elecCalc.units,
        unitPrice: elecPrice,
        amount: elecCalc.amount,
        meterReadingSnapshot: {
          oldReading: elecOld,
          newReading: elecNew,
        },
      });

      // Water
      const waterCalc = BillingCalculator.calculateUtility(
        {
          oldReading: waterOld,
          newReading: waterNew,
          unitPrice: waterPrice,
        },
        roundingStep,
      );
      items.push({
        type: InvoiceItemType.WATER,
        description: `Tien nuoc (${waterOld} -> ${waterNew} m3)`,
        quantity: waterCalc.units,
        unitPrice: waterPrice,
        amount: waterCalc.amount,
        meterReadingSnapshot: {
          oldReading: waterOld,
          newReading: waterNew,
        },
      });
    }

    // Common services: Internet & Garbage
    if (internetPrice > 0) {
      items.push({
        type: InvoiceItemType.SERVICE,
        description: 'Tien Internet',
        quantity: 1,
        unitPrice: internetPrice,
        amount: internetPrice,
      });
    }
    if (garbagePrice > 0) {
      items.push({
        type: InvoiceItemType.SERVICE,
        description: 'Tien ve sinh rac thai',
        quantity: 1,
        unitPrice: garbagePrice,
        amount: garbagePrice,
      });
    }

    // Additional custom items
    if (dto.additionalItems) {
      for (const item of dto.additionalItems) {
        items.push({
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: Math.round(item.quantity * item.unitPrice),
        });
      }
    }

    // 6. Calculate total with roundingStep
    const totals = BillingCalculator.calculateInvoiceTotal(
      items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      dto.discount || 0,
      roundingStep,
    );

    // 7. Calculate Due Date (now + dueDays)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const invoiceNo = await this.generateInvoiceNumber(user.organizationId, dto.billingPeriodId);

    return this.invoiceRepo.create(user.organizationId, {
      invoiceNumber: invoiceNo,
      invoiceNo,
      contractId: contract._id.toString(),
      propertyId: contract.propertyId,
      roomId: contract.roomId,
      tenantId: contract.tenantId || contract.primaryTenantId,
      billingPeriodId: dto.billingPeriodId,
      dueDate,
      status: InvoiceStatus.DRAFT,
      active: true,
      items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
      paidAmount: 0,
      remainingAmount: totals.totalAmount,
      version: 0,
      notes: dto.notes,
    } as any);
  }

  /**
   * PATCH /invoices/:id (chỉ cho phép sửa khi hóa đơn ở trạng thái DRAFT)
   */
  async updateDraftInvoice(user: AuthenticatedUser, invoiceId: string, dto: UpdateInvoiceDto) {
    const invoice = await this.invoiceRepo.findByIdOrThrow(
      user.organizationId,
      invoiceId,
      'Invoice',
    );

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BusinessRuleViolationException(
        `Cannot update invoice in status '${invoice.status}'. Only DRAFT invoices can be edited.`,
      );
    }

    const org = await this.orgRepo.findById(user.organizationId);
    const roundingStep = org?.settings?.roundingStep ?? 1000;

    let items = invoice.items || [];
    if (dto.items) {
      items = dto.items.map((it) => ({
        type: it.type,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: Math.round(it.quantity * it.unitPrice),
      }));
    }

    const discount = dto.discount !== undefined ? dto.discount : (invoice.discount || 0);

    const totals = BillingCalculator.calculateInvoiceTotal(
      items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      discount,
      roundingStep,
    );

    const updateSet: any = {
      items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
      remainingAmount: totals.totalAmount - (invoice.paidAmount || 0),
    };

    if (dto.dueDate) {
      updateSet.dueDate = new Date(dto.dueDate);
    }
    if (dto.notes !== undefined) {
      updateSet.notes = dto.notes;
    }

    return this.invoiceRepo.updateOne(
      user.organizationId,
      { _id: invoiceId } as any,
      { $set: updateSet },
    );
  }

  /**
   * POST /invoices/:id/issue: Freezes invoice into immutable ISSUED snapshot and notifies tenant
   */
  async issueInvoice(user: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.invoiceRepo.findByIdOrThrow(
      user.organizationId,
      invoiceId,
      'Invoice',
    );

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BusinessRuleViolationException(
        `Invalid state transition: Cannot issue invoice in status '${invoice.status}'. Must be in DRAFT.`,
      );
    }

    const updated = await this.invoiceRepo.updateOne(
      user.organizationId,
      { _id: invoiceId } as any,
      {
        $set: {
          status: InvoiceStatus.ISSUED,
        },
      },
    );

    // Realtime notification to Tenant room and FCM push
    this.realtime.emitToTenant(invoice.tenantId, 'invoice:issued', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate,
    });

    this.fcm.sendPushNotification({
      topic: `tenant-${invoice.tenantId}`,
      title: 'Hóa đơn tiền phòng mới',
      body: `Hóa đơn kỳ ${invoice.billingPeriodId} số tiền ${invoice.totalAmount.toLocaleString('vi-VN')} VND đã được phát hành.`,
    });

    return updated;
  }

  /**
   * POST /invoices/issue (phát hành hàng loạt)
   */
  async batchIssue(user: AuthenticatedUser, dto: BatchIssueInvoicesDto) {
    const filter: any = {
      status: InvoiceStatus.DRAFT,
      active: true,
    };

    if (dto.invoiceIds && dto.invoiceIds.length > 0) {
      filter._id = { $in: dto.invoiceIds };
    }
    if (dto.propertyId) {
      filter.propertyId = dto.propertyId;
    }
    if (dto.billingPeriodId) {
      filter.billingPeriodId = dto.billingPeriodId;
    }

    const draftInvoices = await this.invoiceRepo.find(user.organizationId, filter);
    const issuedIds: string[] = [];

    for (const inv of draftInvoices) {
      await this.issueInvoice(user, inv._id.toString());
      issuedIds.push(inv._id.toString());
    }

    return {
      message: `Issued ${issuedIds.length} invoices successfully`,
      issuedCount: issuedIds.length,
      invoiceIds: issuedIds,
    };
  }

  /**
   * POST /invoices/:id/cancel: Cancel draft invoice or void issued invoice with mandatory reason
   */
  async cancelOrVoidInvoice(
    user: AuthenticatedUser,
    invoiceId: string,
    dto: CancelInvoiceDto,
  ) {
    const invoice = await this.invoiceRepo.findByIdOrThrow(
      user.organizationId,
      invoiceId,
      'Invoice',
    );

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BusinessRuleViolationException(
        'Cannot cancel or void a fully paid invoice.',
      );
    }

    let targetStatus = InvoiceStatus.CANCELLED;
    if (
      invoice.status === InvoiceStatus.ISSUED ||
      invoice.status === InvoiceStatus.PARTIALLY_PAID ||
      invoice.status === InvoiceStatus.OVERDUE
    ) {
      targetStatus = InvoiceStatus.VOIDED;
    }

    const updated = await this.invoiceRepo.updateOne(
      user.organizationId,
      { _id: invoiceId } as any,
      {
        $set: {
          status: targetStatus,
          active: false, // Releases the unique partial index constraint
          cancellationReason: dto.reason,
          cancelledAt: new Date(),
        },
      },
    );

    return updated;
  }

  async getInvoiceById(user: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.invoiceRepo.findById(user.organizationId, invoiceId);
    if (!invoice) {
      throw new ResourceNotFoundException('Invoice');
    }

    // Ownership check for TENANT:
    // If tenant accesses another tenant's invoice -> return 404 (NOT 403)
    if (user.role === UserRole.TENANT) {
      if (!user.tenantId || invoice.tenantId.toString() !== user.tenantId) {
        throw new ResourceNotFoundException('Invoice');
      }
    }

    return invoice;
  }

  /**
   * GET /invoices/:id/payment-qr
   * VietQR từ property.bankAccount (bankCode, accountNo, accountName), nội dung=invoiceNo, số tiền=remaining
   */
  async getPaymentQr(user: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.getInvoiceById(user, invoiceId);
    const property = await this.propertyRepo.findById(user.organizationId, invoice.propertyId);

    const bankAccount = property?.bankAccount;
    const bankCode = bankAccount?.bankCode || 'MB';
    const accountNo = bankAccount?.accountNo || '0000000000';
    const accountName = bankAccount?.accountName || 'CHU NHA TRO';

    const invoiceNo = invoice.invoiceNo || invoice.invoiceNumber;
    const remainingAmount = invoice.remainingAmount;

    // VietQR URL QuickPay Format: https://img.vietqr.io/image/<BANK_CODE>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
    const encodedContent = encodeURIComponent(invoiceNo);
    const encodedName = encodeURIComponent(accountName);
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${remainingAmount}&addInfo=${encodedContent}&accountName=${encodedName}`;

    return {
      invoiceId: invoice._id,
      invoiceNo,
      bankCode,
      accountNo,
      accountName,
      amount: remainingAmount,
      transferContent: invoiceNo,
      qrUrl,
    };
  }

  /**
   * GET /invoices/:id/pdf
   * Render bản xem/in hóa đơn PDF có cấu trúc hoàn chỉnh
   */
  async getInvoicePdf(user: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.getInvoiceById(user, invoiceId);
    const property = await this.propertyRepo.findById(user.organizationId, invoice.propertyId);
    const room = await this.roomRepo.findById(user.organizationId, invoice.roomId);
    const tenant = await this.tenantRepo.findById(user.organizationId, invoice.tenantId);

    const invoiceNo = invoice.invoiceNo || invoice.invoiceNumber;
    const qrInfo = await this.getPaymentQr(user, invoiceId);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Hóa đơn ${invoiceNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
          .meta { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; }
          .total { text-align: right; font-size: 18px; font-weight: bold; color: #1e3a8a; }
          .qr-box { text-align: center; margin-top: 30px; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 8px; }
          .qr-img { width: 180px; height: 180px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">HÓA ĐƠN TIỀN NHÀ</div>
            <div>Mã hóa đơn: <strong>${invoiceNo}</strong></div>
            <div>Kỳ tính phí: <strong>${invoice.billingPeriodId}</strong></div>
          </div>
          <div style="text-align: right;">
            <div>Khu trọ: <strong>${property?.name || 'Khu trọ'}</strong></div>
            <div>Phòng: <strong>${room?.code || 'N/A'}</strong></div>
            <div>Hạn nộp: <strong>${new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</strong></div>
          </div>
        </div>

        <div class="meta">
          <div>Người thuê: <strong>${tenant?.fullName || 'Khách thuê'}</strong></div>
          <div>Số điện thoại: <strong>${tenant?.phone || 'N/A'}</strong></div>
          <div>Trạng thái: <strong>${invoice.status}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mục thu</th>
              <th>Số lượng</th>
              <th>Đơn giá (VND)</th>
              <th>Thành tiền (VND)</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${item.unitPrice.toLocaleString('vi-VN')}</td>
                <td>${item.amount.toLocaleString('vi-VN')}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        <div class="total">
          <div>Tổng cộng: ${invoice.totalAmount.toLocaleString('vi-VN')} VND</div>
          ${invoice.paidAmount > 0 ? `<div>Đã thanh toán: ${invoice.paidAmount.toLocaleString('vi-VN')} VND</div>` : ''}
          <div>Còn lại phải trả: <strong>${invoice.remainingAmount.toLocaleString('vi-VN')} VND</strong></div>
        </div>

        <div class="qr-box">
          <div><strong>Quét mã VietQR để thanh toán</strong></div>
          <img class="qr-img" src="${qrInfo.qrUrl}" alt="VietQR" />
          <div>Ngân hàng: <strong>${qrInfo.bankCode}</strong> - STK: <strong>${qrInfo.accountNo}</strong></div>
          <div>Chủ tài khoản: <strong>${qrInfo.accountName}</strong></div>
          <div>Nội dung chuyển khoản: <strong>${qrInfo.transferContent}</strong></div>
        </div>
      </body>
      </html>
    `;

    return {
      invoiceId: invoice._id,
      invoiceNo,
      html: htmlContent,
      mimeType: 'text/html',
    };
  }

  async listInvoices(
    user: AuthenticatedUser,
    query: QueryInvoicesDto,
  ) {
    const filter: any = {};
    if (query.status) filter.status = query.status;

    const period = query.period || query.billingPeriodId;
    if (period) filter.billingPeriodId = period;

    if (query.propertyId) filter.propertyId = query.propertyId;
    if (query.roomId) filter.roomId = query.roomId;
    if (query.contractId) filter.contractId = query.contractId;

    if (query.overdue) {
      filter.status = { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] };
      filter.dueDate = { $lt: new Date() };
      filter.remainingAmount = { $gt: 0 };
    }

    if (user.role === UserRole.TENANT) {
      if (!user.tenantId) {
        return {
          data: [],
          meta: {
            page: 1,
            limit: query.limit || 20,
            totalItems: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      filter.tenantId = user.tenantId;
      // Tenants should only see ISSUED, PARTIALLY_PAID, PAID, or OVERDUE invoices (hide internal drafts)
      filter.status = { $ne: InvoiceStatus.DRAFT };
    }

    return this.invoiceRepo.findPaginated(
      user.organizationId,
      filter,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * GET /debts
   * Gom theo phòng/tenant, bucket quá hạn: current (chưa quá hạn), 1-7, 8-30, >30 ngày
   */
  async getDebts(user: AuthenticatedUser, query: QueryDebtsDto) {
    const filter: any = {
      active: true,
      remainingAmount: { $gt: 0 },
      status: {
        $in: [
          InvoiceStatus.ISSUED,
          InvoiceStatus.PARTIALLY_PAID,
          InvoiceStatus.OVERDUE,
        ],
      },
    };

    if (query.propertyId) filter.propertyId = query.propertyId;
    if (query.roomId) filter.roomId = query.roomId;
    if (query.tenantId) filter.tenantId = query.tenantId;

    const unpaidInvoices = await this.invoiceRepo.find(user.organizationId, filter);
    const now = new Date();

    const debtsByRoom: Record<string, any> = {};
    const summary = {
      current: 0,
      bucket_1_7: 0,
      bucket_8_30: 0,
      bucket_over_30: 0,
      totalDebt: 0,
    };

    for (const inv of unpaidInvoices) {
      const remaining = inv.remainingAmount;
      summary.totalDebt += remaining;

      const dueDate = new Date(inv.dueDate);
      const diffMs = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let bucket: 'current' | 'bucket_1_7' | 'bucket_8_30' | 'bucket_over_30' = 'current';
      if (diffDays <= 0) {
        bucket = 'current';
        summary.current += remaining;
      } else if (diffDays <= 7) {
        bucket = 'bucket_1_7';
        summary.bucket_1_7 += remaining;
      } else if (diffDays <= 30) {
        bucket = 'bucket_8_30';
        summary.bucket_8_30 += remaining;
      } else {
        bucket = 'bucket_over_30';
        summary.bucket_over_30 += remaining;
      }

      const key = `${inv.roomId}_${inv.tenantId}`;
      if (!debtsByRoom[key]) {
        debtsByRoom[key] = {
          roomId: inv.roomId,
          propertyId: inv.propertyId,
          tenantId: inv.tenantId,
          roomCode: '',
          tenantName: '',
          tenantPhone: '',
          totalRemaining: 0,
          current: 0,
          bucket_1_7: 0,
          bucket_8_30: 0,
          bucket_over_30: 0,
          invoices: [],
        };
      }

      debtsByRoom[key].totalRemaining += remaining;
      debtsByRoom[key][bucket] += remaining;
      debtsByRoom[key].invoices.push({
        invoiceId: inv._id,
        invoiceNo: inv.invoiceNo || inv.invoiceNumber,
        billingPeriodId: inv.billingPeriodId,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        remainingAmount: inv.remainingAmount,
        dueDate: inv.dueDate,
        overdueDays: Math.max(0, diffDays),
        bucket,
      });
    }

    // Populate room and tenant info
    const debtItems = Object.values(debtsByRoom);
    for (const item of debtItems) {
      const [room, tenant] = await Promise.all([
        this.roomRepo.findById(user.organizationId, item.roomId),
        this.tenantRepo.findById(user.organizationId, item.tenantId),
      ]);
      item.roomCode = room?.code || 'N/A';
      item.tenantName = tenant?.fullName || 'N/A';
      item.tenantPhone = tenant?.phone || 'N/A';
    }

    return {
      totalDebt: summary.totalDebt,
      totalDebtors: debtItems.length,
      summary: {
        current: summary.current,
        bucket_1_7: summary.bucket_1_7,
        bucket_8_30: summary.bucket_8_30,
        bucket_over_30: summary.bucket_over_30,
      },
      debtors: debtItems,
    };
  }
}
