import { Injectable, Logger } from '@nestjs/common';
import { BillingPeriodRepository } from './repositories/billing-period.repository';
import { ContractRepository } from '../contract/contract.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { ServiceRepository } from '../service/repositories/service.repository';
import { MeterReadingRepository } from '../meter-reading/meter-reading.repository';
import { MeterRepository } from '../meter-reading/repositories/meter.repository';
import { InvoiceRepository } from '../invoice/invoice.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import {
  CreateBillingPeriodDto,
  CloseBillingPeriodDto,
  GenerateInvoicesDto,
  QueryBillingPeriodsDto,
} from './dto/billing-period.dto';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import {
  BillingPeriodStatus,
  ContractStatus,
  InvoiceItemType,
  InvoiceStatus,
  MeterReadingStatus,
  ServiceCalcMethod,
} from '../../common/constants';
import {
  BillingCalculator,
  BillingReadingInput,
  BillingServiceSubscriptionInput,
} from '../../common/utils/billing-calculator';

export interface GenerateInvoicesResult {
  created: number;
  skipped: Array<{ contractId: string; roomCode?: string; reason: string }>;
  duplicates: number;
  failed: Array<{ contractId: string; error: string }>;
}

@Injectable()
export class BillingPeriodService {
  private readonly logger = new Logger(BillingPeriodService.name);

  constructor(
    private readonly periodRepo: BillingPeriodRepository,
    private readonly contractRepo: ContractRepository,
    private readonly propertyRepo: PropertyRepository,
    private readonly roomRepo: RoomRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly meterReadingRepo: MeterReadingRepository,
    private readonly meterRepo: MeterRepository,
    private readonly invoiceRepo: InvoiceRepository,
    private readonly counterRepo: CounterRepository,
    private readonly orgRepo: OrganizationRepository,
  ) {}

  /**
   * POST /billing-periods
   */
  async create(user: AuthenticatedUser, dto: CreateBillingPeriodDto) {
    await this.propertyRepo.findByIdOrThrow(
      user.organizationId,
      dto.propertyId,
      'Property',
    );

    const existing = await this.periodRepo.findByPropertyAndPeriod(
      user.organizationId,
      dto.propertyId,
      dto.period,
    );
    if (existing) {
      throw new BusinessRuleViolationException(
        `Billing period '${dto.period}' already exists for this property.`,
      );
    }

    const [year, month] = dto.period.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date(year, month - 1, 1);
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(year, month - 1, daysInMonth, 23, 59, 59, 999);

    return this.periodRepo.create(user.organizationId, {
      propertyId: dto.propertyId,
      period: dto.period,
      startDate,
      endDate,
      status: BillingPeriodStatus.OPEN,
      notes: dto.notes,
    });
  }

  /**
   * GET /billing-periods
   */
  async list(user: AuthenticatedUser, query: QueryBillingPeriodsDto) {
    const filter: any = {};
    if (query.propertyId) filter.propertyId = query.propertyId;
    if (query.status) filter.status = query.status;

    return this.periodRepo.find(user.organizationId, filter, { sort: { period: -1 } });
  }

  /**
   * POST /billing-periods/:id/close
   */
  async close(user: AuthenticatedUser, id: string, dto: CloseBillingPeriodDto) {
    const period = await this.periodRepo.findById(user.organizationId, id);
    if (!period) {
      throw new ResourceNotFoundException('BillingPeriod');
    }

    if (period.status === BillingPeriodStatus.CLOSED) {
      return period;
    }

    return this.periodRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      {
        $set: {
          status: BillingPeriodStatus.CLOSED,
          closedAt: new Date(),
          closedBy: user.userId,
          ...(dto.notes ? { notes: dto.notes } : {}),
        },
      },
    );
  }

  /**
   * POST /billing-periods/:id/generate-invoices
   * QUY TẮC:
   *  - Idempotent (không tạo trùng active invoice cho cùng contract + period).
   *  - Chia lô (batching) xử lý.
   *  - Trả về { created, skipped, duplicates, failed }.
   *  - CHỈ TẠO KHI reading bắt buộc đã LOCKED.
   *  - invoiceNo từ counters dạng INV-YYMM-000123.
   */
  async generateInvoices(
    user: AuthenticatedUser,
    id: string,
    dto?: GenerateInvoicesDto,
  ): Promise<GenerateInvoicesResult> {
    const periodDoc = await this.periodRepo.findById(user.organizationId, id);
    if (!periodDoc) {
      throw new ResourceNotFoundException('BillingPeriod');
    }

    const org = await this.orgRepo.findById(user.organizationId);
    const roundingStep = org?.settings?.roundingStep ?? 1000;
    const dueDays = org?.settings?.invoiceDueDays ?? 5;

    // Lấy tất cả hợp đồng ACTIVE của property trong kỳ này
    const contracts = await this.contractRepo.find(user.organizationId, {
      propertyId: periodDoc.propertyId,
      status: ContractStatus.ACTIVE,
    });

    const result: GenerateInvoicesResult = {
      created: 0,
      skipped: [],
      duplicates: 0,
      failed: [],
    };

    const batchSize = dto?.batchSize || 50;

    // Chia lô xử lý
    for (let i = 0; i < contracts.length; i += batchSize) {
      const batch = contracts.slice(i, i + batchSize);

      for (const contract of batch) {
        try {
          const room = await this.roomRepo.findById(user.organizationId, contract.roomId);
          const roomCode = room?.code || 'Unknown';

          // 1. Kiểm tra duplicate active invoice (Idempotency)
          const existingInvoice = await this.invoiceRepo.findActiveByContractAndPeriod(
            user.organizationId,
            contract._id.toString(),
            periodDoc.period,
          );
          if (existingInvoice) {
            result.duplicates++;
            continue;
          }

          // 2. Lấy danh sách dịch vụ đăng ký
          const serviceSubscriptionsInput: BillingServiceSubscriptionInput[] = [];
          const subscriptions = contract.serviceSubscriptions || [];
          let hasMeterService = false;

          for (const sub of subscriptions) {
            const srv = await this.serviceRepo.findById(
              user.organizationId,
              sub.serviceId.toString(),
            );
            if (!srv) continue;

            const unitPrice =
              sub.unitPriceOverride !== undefined && sub.unitPriceOverride !== null
                ? sub.unitPriceOverride
                : srv.unitPrice;

            if (srv.calcMethod === ServiceCalcMethod.METER) {
              hasMeterService = true;
            }

            serviceSubscriptionsInput.push({
              serviceId: srv._id.toString(),
              serviceCode: srv.code,
              serviceName: srv.name,
              calcMethod: srv.calcMethod,
              unitPrice,
              quantity: sub.quantity,
              meterType: srv.code === 'WATER' ? 'WATER' : 'ELECTRIC',
            });
          }

          // 3. Kiểm tra meter reading bắt buộc đã LOCKED
          const readingsInput: BillingReadingInput[] = [];
          if (hasMeterService) {
            // Kiểm tra các công tơ đang active của phòng
            const activeMeters = await this.meterRepo.findMetersByRoom(
              user.organizationId,
              contract.roomId,
            );

            if (activeMeters.length === 0) {
              result.skipped.push({
                contractId: contract._id.toString(),
                roomCode,
                reason: `Phòng ${roomCode} chưa được cài đặt công tơ nào.`,
              });
              continue;
            }

            let allMetersLocked = true;
            let missingOrUnlockedReason = '';

            for (const meter of activeMeters) {
              const reading = await this.meterReadingRepo.findByMeterAndPeriod(
                user.organizationId,
                meter._id.toString(),
                periodDoc.period,
              );
              if (!reading) {
                allMetersLocked = false;
                missingOrUnlockedReason = `Chưa có chỉ số kỳ ${periodDoc.period} cho công tơ ${meter.serialNo || meter.type}.`;
                break;
              }
              if (reading.status !== MeterReadingStatus.LOCKED && !reading.isLocked) {
                allMetersLocked = false;
                missingOrUnlockedReason = `Chỉ số kỳ ${periodDoc.period} của công tơ ${meter.serialNo || meter.type} chưa được KHÓA (LOCKED).`;
                break;
              }

              readingsInput.push({
                serviceCode: meter.type === 'WATER' ? 'WATER' : 'ELEC',
                meterType: meter.type,
                consumption: reading.consumption ?? 0,
                unitPrice: reading.unitPrice,
              });
            }

            if (!allMetersLocked) {
              result.skipped.push({
                contractId: contract._id.toString(),
                roomCode,
                reason: missingOrUnlockedReason,
              });
              continue;
            }
          }

          // 4. Tính toán hóa đơn bằng BillingCalculator (pure)
          const occupantCount = (contract.occupants?.length || 0) + 1;
          const billingCalc = BillingCalculator.calculateBilling({
            contract: {
              rent: contract.rent ?? contract.rentalPrice ?? 0,
              startDate: contract.startDate,
              endDate: contract.endDate,
            },
            serviceSubscriptions: serviceSubscriptionsInput,
            readings: readingsInput,
            occupantCount,
            period: periodDoc.period,
            roundingStep,
          });

          // 5. Sinh mã invoiceNo dạng INV-YYMM-000123 từ CounterRepository
          const yymm = periodDoc.period.replace('-', '').slice(2, 6);
          const seq = await this.counterRepo.getNextSequence(
            `invoices_${user.organizationId}_${yymm}`,
          );
          const invoiceNo = `INV-${yymm}-${seq.toString().padStart(6, '0')}`;

          // 6. Tính hạn thanh toán (dueDate)
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + dueDays);

          // 7. Tạo snapshot line items
          const items: any[] = [];
          // Tiền phòng
          items.push({
            type: InvoiceItemType.RENT,
            description: billingCalc.isProrated
              ? `Tiền phòng kỳ ${periodDoc.period} (ở ${billingCalc.daysStayed}/${billingCalc.daysInMonth} ngày)`
              : `Tiền phòng kỳ ${periodDoc.period}`,
            quantity: 1,
            unitPrice: billingCalc.rent,
            amount: billingCalc.rent,
          });

          // Tiền dịch vụ
          for (const item of billingCalc.items) {
            let itemType = InvoiceItemType.SERVICE;
            if (item.serviceCode === 'ELEC') itemType = InvoiceItemType.ELECTRICITY;
            if (item.serviceCode === 'WATER') itemType = InvoiceItemType.WATER;

            items.push({
              type: itemType,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
            });
          }

          // 8. Lưu hóa đơn vào cơ sở dữ liệu
          await this.invoiceRepo.create(user.organizationId, {
            invoiceNumber: invoiceNo,
            invoiceNo,
            contractId: contract._id.toString(),
            propertyId: contract.propertyId,
            roomId: contract.roomId,
            tenantId: contract.tenantId || contract.primaryTenantId,
            billingPeriodId: periodDoc.period,
            dueDate,
            status: InvoiceStatus.DRAFT,
            active: true,
            items,
            subtotal: billingCalc.subtotal,
            discount: billingCalc.discounts,
            totalAmount: billingCalc.total,
            paidAmount: 0,
            remainingAmount: billingCalc.total,
            version: 0,
          } as any);

          result.created++;
        } catch (err: any) {
          result.failed.push({
            contractId: contract._id.toString(),
            error: err.message || 'Lỗi không xác định khi tạo hóa đơn',
          });
        }
      }
    }

    return result;
  }
}
