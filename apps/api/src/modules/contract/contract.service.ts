import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ContractRepository } from './contract.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { TenantRepository } from '../tenant/tenant.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import { AuthService } from '../auth/auth.service';
import {
  CreateContractDto,
  UpdateContractDto,
  CreateContractRevisionDto,
  TerminateContractDto,
  RenewContractDto,
  RecordDepositDto,
  MoveInDto,
  MoveOutPreviewDto,
  MoveOutDto,
  ContractQueryDto,
} from './dto/create-contract.dto';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import {
  ContractStatus,
  DepositStatus,
  DepositLedgerType,
  RoomStatus,
  UserRole,
} from '../../common/constants';
import { Contract, ContractDocument, ContractRevision } from './schemas/contract.schema';
import {
  MeterReading,
  MeterReadingDocument,
} from '../meter-reading/schemas/meter-reading.schema';
import { Invoice, InvoiceDocument } from '../invoice/schemas/invoice.schema';
import { withTransaction } from '../../infra/mongo/transaction.helper';
import { CccdCrypto } from '../../common/utils/cccd-crypto';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    private readonly contractRepo: ContractRepository,
    private readonly roomRepo: RoomRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly propertyRepo: PropertyRepository,
    private readonly counterRepo: CounterRepository,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(MeterReading.name)
    private readonly meterReadingModel: Model<MeterReadingDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  /**
   * Helper sinh mã hợp đồng tăng tự động từ counters: HD-YYYY-XXXX
   */
  private async generateContractNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await this.counterRepo.getNextSequence(`contracts_${organizationId}_${year}`);
    return `HD-${year}-${String(seq).padStart(4, '0')}`;
  }

  // ==================== CREATE & LIST ====================

  async createContract(user: AuthenticatedUser, dto: CreateContractDto) {
    const property = await this.propertyRepo.findByIdOrThrow(
      user.organizationId,
      dto.propertyId,
      'Property',
    );
    const room = await this.roomRepo.findByIdOrThrow(
      user.organizationId,
      dto.roomId,
      'Room',
    );

    if (room.status === RoomStatus.MAINTENANCE) {
      throw new BusinessRuleViolationException('Cannot create contract for room under maintenance');
    }

    const tenantId = dto.primaryTenantId || dto.tenantId;
    if (!tenantId) {
      throw new BusinessRuleViolationException('Primary tenant ID is required');
    }
    await this.tenantRepo.findByIdOrThrow(user.organizationId, tenantId, 'Tenant');

    const contractNo = await this.generateContractNumber(user.organizationId);
    const rentAmount = Math.round(dto.rent ?? dto.rentalPrice ?? 0);
    const depositAmount = Math.round(dto.depositAmount ?? 0);

    return this.contractRepo.create(user.organizationId, {
      contractNo,
      contractNumber: contractNo,
      propertyId: dto.propertyId,
      roomId: dto.roomId,
      primaryTenantId: tenantId,
      tenantId,
      occupants: dto.occupants || [],
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      dueDay: dto.dueDay || dto.billingCycleDay || 5,
      billingCycleDay: dto.dueDay || dto.billingCycleDay || 5,
      rent: rentAmount,
      rentalPrice: rentAmount,
      deposit: {
        amount: depositAmount,
        status: DepositStatus.PENDING,
        ledger: [],
      },
      depositAmount,
      serviceSubscriptions: dto.serviceSubscriptions || [],
      terms: dto.terms,
      attachmentIds: dto.attachmentIds || [],
      status: ContractStatus.PENDING,
      isCurrent: false,
      version: 1,
      revisions: [],
      notes: dto.notes,
    } as any);
  }

  async listContracts(user: AuthenticatedUser, query: ContractQueryDto) {
    const filter: any = {};

    if (query.propertyId) filter.propertyId = query.propertyId;
    if (query.roomId) filter.roomId = query.roomId;
    if (query.status) filter.status = query.status;
    if (query.isCurrent !== undefined) filter.isCurrent = query.isCurrent;

    if (query.tenantId) {
      filter.$or = [{ primaryTenantId: query.tenantId }, { tenantId: query.tenantId }];
    }

    // Quy tắc: TENANT chỉ GET hợp đồng của mình
    if (user.role === UserRole.TENANT) {
      if (!user.tenantId) {
        return { data: [], meta: { page: 1, limit: query.limit || 20, totalItems: 0, totalPages: 1 } };
      }
      filter.$or = [{ primaryTenantId: user.tenantId }, { tenantId: user.tenantId }];
    }

    return this.contractRepo.findPaginated(
      user.organizationId,
      filter,
      query.page,
      query.limit,
    );
  }

  async getContractById(user: AuthenticatedUser, id: string) {
    const contract = await this.contractRepo.findById(user.organizationId, id);
    if (!contract) {
      throw new ResourceNotFoundException('Contract');
    }

    // Quy tắc bảo mật: TENANT chỉ đọc hợp đồng của mình; truy cập chéo -> 404 NOT FOUND
    if (user.role === UserRole.TENANT) {
      const isOwner =
        (contract.primaryTenantId && contract.primaryTenantId.toString() === user.tenantId) ||
        (contract.tenantId && contract.tenantId.toString() === user.tenantId);
      if (!isOwner) {
        throw new ResourceNotFoundException('Contract');
      }
    }

    return contract;
  }

  /**
   * PATCH /contracts/:id
   * Quy tắc: CHỈ sửa trường phi tài chính (occupants, dueDay, terms, notes, attachmentIds).
   * Chặn sửa rent, depositAmount trực tiếp.
   */
  async updateContract(user: AuthenticatedUser, id: string, dto: UpdateContractDto) {
    if (
      dto.rent !== undefined ||
      dto.rentalPrice !== undefined ||
      dto.depositAmount !== undefined
    ) {
      throw new BusinessRuleViolationException(
        'Cannot modify financial terms (rent, deposit) via PATCH. Please use POST /contracts/:id/revisions or POST /contracts/:id/deposit.',
      );
    }

    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      id,
      'Contract',
    );

    const updateData: any = {};
    if (dto.occupants !== undefined) updateData.occupants = dto.occupants;
    if (dto.dueDay !== undefined) {
      updateData.dueDay = dto.dueDay;
      updateData.billingCycleDay = dto.dueDay;
    }
    if (dto.terms !== undefined) updateData.terms = dto.terms;
    if (dto.attachmentIds !== undefined) updateData.attachmentIds = dto.attachmentIds;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.contractRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      { $set: updateData },
    );
    if (!updated) throw new ResourceNotFoundException('Contract');
    return updated;
  }

  /**
   * POST /contracts/:id/revisions
   * Đổi giá/điều khoản kèm effectiveFrom, reason -> thêm revision, tăng version, ghi audit.
   */
  async createRevision(
    user: AuthenticatedUser,
    id: string,
    dto: CreateContractRevisionDto,
  ) {
    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      id,
      'Contract',
    );

    const newVersion = (contract.version || 1) + 1;
    const effectiveDate = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    const revision: ContractRevision = {
      version: newVersion,
      effectiveFrom: effectiveDate,
      reason: dto.reason.trim(),
      rent: dto.rent !== undefined ? Math.round(dto.rent) : contract.rent,
      terms: dto.terms !== undefined ? dto.terms : contract.terms,
      serviceSubscriptions: dto.serviceSubscriptions || contract.serviceSubscriptions,
      createdAt: new Date(),
      modifiedBy: user.userId,
    };

    const updateOps: any = {
      $inc: { version: 1 },
      $push: { revisions: revision },
      $set: {},
    };

    if (dto.rent !== undefined) {
      updateOps.$set.rent = Math.round(dto.rent);
      updateOps.$set.rentalPrice = Math.round(dto.rent);
    }
    if (dto.terms !== undefined) updateOps.$set.terms = dto.terms;
    if (dto.serviceSubscriptions) updateOps.$set.serviceSubscriptions = dto.serviceSubscriptions;

    const updated = await this.contractRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      updateOps,
    );

    return updated;
  }

  // ==================== LIFECYCLE: ACTIVATE / TERMINATE / RENEW ====================

  async activateContract(user: AuthenticatedUser, contractId: string) {
    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      contractId,
      'Contract',
    );

    // State machine check: only PENDING / DRAFT can transition to ACTIVE
    if (
      contract.status !== ContractStatus.PENDING &&
      contract.status !== ContractStatus.DRAFT
    ) {
      throw new BusinessRuleViolationException(
        `Invalid state transition: Cannot activate contract from status '${contract.status}'`,
      );
    }

    // Check if room already has an active contract
    const activeContract = await this.contractRepo.findActiveContractByRoom(
      user.organizationId,
      contract.roomId,
    );
    if (activeContract && activeContract._id.toString() !== contract._id.toString()) {
      throw new BusinessRuleViolationException(
        `Room already has an active contract (Contract #${activeContract.contractNo || activeContract.contractNumber})`,
      );
    }

    // Activate contract
    const updatedContract = await this.contractRepo.updateOne(
      user.organizationId,
      { _id: contractId } as any,
      {
        $set: {
          status: ContractStatus.ACTIVE,
          isCurrent: true,
        },
      },
    );

    // Update Room status to OCCUPIED and set currentContractId
    await this.roomRepo.updateOne(
      user.organizationId,
      { _id: contract.roomId } as any,
      {
        $set: {
          status: RoomStatus.OCCUPIED,
          currentContractId: contract._id,
        },
      },
    );

    return updatedContract;
  }

  async terminateContract(
    user: AuthenticatedUser,
    contractId: string,
    dto: TerminateContractDto,
  ) {
    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      contractId,
      'Contract',
    );

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BusinessRuleViolationException(
        `Invalid state transition: Cannot terminate contract in status '${contract.status}'`,
      );
    }

    const updated = await this.contractRepo.updateOne(
      user.organizationId,
      { _id: contractId } as any,
      {
        $set: {
          status: ContractStatus.TERMINATED,
          isCurrent: false,
          terminationReason: dto.reason,
          terminatedAt: new Date(),
        },
      },
    );

    // Free the room back to VACANT
    await this.roomRepo.updateOne(
      user.organizationId,
      { _id: contract.roomId } as any,
      {
        $set: {
          status: RoomStatus.VACANT,
          currentContractId: null,
        },
      },
    );

    return updated;
  }

  async renewContract(
    user: AuthenticatedUser,
    contractId: string,
    dto: RenewContractDto,
  ) {
    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      contractId,
      'Contract',
    );

    if (
      contract.status !== ContractStatus.ACTIVE &&
      contract.status !== ContractStatus.EXPIRED
    ) {
      throw new BusinessRuleViolationException(
        `Cannot renew contract in status '${contract.status}'. Contract must be ACTIVE or EXPIRED.`,
      );
    }

    const newEndDate = new Date(dto.newEndDate);
    if (newEndDate <= new Date(contract.endDate)) {
      throw new BusinessRuleViolationException('New end date must be after current contract end date');
    }

    const updateOps: any = {
      $set: {
        endDate: newEndDate,
        status: ContractStatus.ACTIVE,
        isCurrent: true,
      },
    };

    if (dto.rent !== undefined && dto.rent !== contract.rent) {
      const newRent = Math.round(dto.rent);
      updateOps.$set.rent = newRent;
      updateOps.$set.rentalPrice = newRent;
      updateOps.$inc = { version: 1 };
      updateOps.$push = {
        revisions: {
          version: (contract.version || 1) + 1,
          effectiveFrom: new Date(),
          reason: dto.reason || 'Renewed contract with new rental price',
          rent: newRent,
          terms: contract.terms,
          createdAt: new Date(),
          modifiedBy: user.userId,
        },
      };
    }

    return this.contractRepo.updateOne(
      user.organizationId,
      { _id: contractId } as any,
      updateOps,
    );
  }

  // ==================== DEPOSIT LEDGER ====================

  /**
   * POST /contracts/:id/deposit
   * Ghi nhận biến động cọc: COLLECTED | DEDUCTED | REFUNDED
   */
  async recordDeposit(
    user: AuthenticatedUser,
    id: string,
    dto: RecordDepositDto,
  ) {
    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      id,
      'Contract',
    );

    const amount = Math.round(dto.amount);
    const date = dto.date ? new Date(dto.date) : new Date();

    const entry = {
      type: dto.type,
      amount,
      date,
      reason: dto.reason,
      note: dto.note,
    };

    const currentDeposit = contract.deposit || { amount: contract.depositAmount || 0, status: DepositStatus.PENDING, ledger: [] };
    const updatedLedger = [...(currentDeposit.ledger || []), entry];

    // Tính toán trạng thái cọc mới
    const totalCollected = updatedLedger
      .filter((e) => e.type === DepositLedgerType.COLLECTED)
      .reduce((sum, e) => sum + e.amount, 0);
    const totalDeducted = updatedLedger
      .filter((e) => e.type === DepositLedgerType.DEDUCTED)
      .reduce((sum, e) => sum + e.amount, 0);
    const totalRefunded = updatedLedger
      .filter((e) => e.type === DepositLedgerType.REFUNDED)
      .reduce((sum, e) => sum + e.amount, 0);

    const netDeposit = totalCollected - totalDeducted - totalRefunded;

    let newStatus = DepositStatus.PENDING;
    if (netDeposit >= (currentDeposit.amount || 0) && currentDeposit.amount > 0) {
      newStatus = DepositStatus.COLLECTED;
    } else if (netDeposit > 0 && netDeposit < (currentDeposit.amount || 0)) {
      newStatus = DepositStatus.PARTIALLY_REFUNDED;
    } else if (netDeposit <= 0 && (totalDeducted > 0 || totalRefunded > 0)) {
      newStatus = DepositStatus.REFUNDED;
    } else if (totalCollected > 0) {
      newStatus = DepositStatus.COLLECTED;
    }

    const updated = await this.contractRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      {
        $set: {
          'deposit.status': newStatus,
          'deposit.ledger': updatedLedger,
        },
      },
    );

    return updated;
  }

  // ==================== MOVE-IN WORKFLOW (1 TRANSACTION) ====================

  /**
   * POST /move-in
   * 1 TRANSACTION: tạo/chọn tenant + contract ACTIVE + cọc COLLECTED + meter reading đầu kỳ (LOCKED)
   * + room OCCUPIED + currentContractId + audit + notification mời tenant.
   */
  async moveIn(user: AuthenticatedUser, dto: MoveInDto) {
    return withTransaction(this.connection, async (session) => {
      // 1. Kiểm tra phòng
      const room = await this.roomRepo.findById(user.organizationId, dto.roomId);
      if (!room || room.deletedAt) {
        throw new ResourceNotFoundException('Room');
      }
      if (room.status !== RoomStatus.VACANT) {
        throw new BusinessRuleViolationException(
          `Room ${room.code} is not VACANT (Current status: ${room.status}). Cannot execute move-in.`,
        );
      }

      const activeContract = await this.contractRepo.findActiveContractByRoom(
        user.organizationId,
        dto.roomId,
      );
      if (activeContract) {
        throw new BusinessRuleViolationException(
          `Room ${room.code} already has an active contract (#${activeContract.contractNo || activeContract.contractNumber})`,
        );
      }

      // 2. Chọn hoặc tạo mới tenant
      let primaryTenantId = dto.tenantId;
      let tenantDoc: any;

      if (primaryTenantId) {
        tenantDoc = await this.tenantRepo.findById(user.organizationId, primaryTenantId);
        if (!tenantDoc) {
          throw new ResourceNotFoundException('Tenant');
        }
      } else if (dto.newTenant) {
        const phone = dto.newTenant.phone.trim();
        const existingTenant = await this.tenantRepo.findByPhone(user.organizationId, phone);
        if (existingTenant) {
          tenantDoc = existingTenant;
          primaryTenantId = existingTenant._id.toString();
        } else {
          const numberEnc = CccdCrypto.encrypt(dto.newTenant.cccdNumber);
          const numberLast4 = CccdCrypto.extractLast4(dto.newTenant.cccdNumber);
          tenantDoc = await this.tenantRepo.create(
            user.organizationId,
            {
              fullName: dto.newTenant.fullName.trim(),
              phone,
              email: dto.newTenant.email?.trim().toLowerCase(),
              idCard: { numberEnc, numberLast4 },
              encryptedCccd: numberEnc,
              cccdLast4: numberLast4,
              isActive: true,
            } as any,
            session || undefined,
          );
          primaryTenantId = tenantDoc._id.toString();
        }
      } else {
        throw new BusinessRuleViolationException('Either tenantId or newTenant info must be provided');
      }

      // 3. Sinh contractNo & Tạo hợp đồng ACTIVE
      const contractNo = await this.generateContractNumber(user.organizationId);
      const rentAmount = Math.round(dto.rent);
      const depositAmount = Math.round(dto.depositAmount);

      const contractPayload: any = {
        organizationId: user.organizationId,
        contractNo,
        contractNumber: contractNo,
        propertyId: dto.propertyId,
        roomId: dto.roomId,
        primaryTenantId,
        tenantId: primaryTenantId,
        occupants: dto.occupants || [],
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        dueDay: dto.dueDay || 5,
        billingCycleDay: dto.dueDay || 5,
        rent: rentAmount,
        rentalPrice: rentAmount,
        deposit: {
          amount: depositAmount,
          status: DepositStatus.COLLECTED,
          ledger: [
            {
              type: DepositLedgerType.COLLECTED,
              amount: depositAmount,
              date: new Date(),
              reason: 'Initial move-in deposit',
              note: 'Auto recorded during move-in',
            },
          ],
        },
        depositAmount,
        serviceSubscriptions: dto.serviceSubscriptions || [],
        terms: dto.terms,
        status: ContractStatus.ACTIVE,
        isCurrent: true,
        version: 1,
        revisions: [],
      };

      let createdContract: any;
      if (session) {
        const res = await this.contractRepo.getModel().create([contractPayload], { session });
        createdContract = Array.isArray(res) ? res[0] : res;
      } else {
        createdContract = await this.contractRepo.getModel().create(contractPayload);
      }

      // 4. Ghi nhận Meter reading đầu kỳ (LOCKED)
      const billingPeriod = new Date(dto.startDate).toISOString().slice(0, 7);
      const meterReadingPayload = {
        organizationId: user.organizationId,
        propertyId: dto.propertyId,
        roomId: dto.roomId,
        billingPeriod,
        electricityOld: dto.initialMeterReading.electricity,
        electricityNew: dto.initialMeterReading.electricity,
        waterOld: dto.initialMeterReading.water,
        waterNew: dto.initialMeterReading.water,
        recordedAt: new Date(),
        recordedBy: user.userId,
        status: 'LOCKED',
        isLocked: true,
      };

      if (session) {
        await this.meterReadingModel.create([meterReadingPayload], { session });
      } else {
        await this.meterReadingModel.create(meterReadingPayload);
      }

      // 5. Cập nhật Room: OCCUPIED + currentContractId
      await this.roomRepo.updateOne(
        user.organizationId,
        { _id: dto.roomId } as any,
        {
          $set: {
            status: RoomStatus.OCCUPIED,
            currentContractId: createdContract._id,
          },
        },
        session || undefined,
      );

      // 6. Tạo lời mời tài khoản tenant
      let invitation: any = null;
      try {
        invitation = await this.authService.createTenantInvitation(
          tenantDoc.email || '',
          tenantDoc.phone,
          tenantDoc.fullName,
          user.organizationId,
          primaryTenantId!,
        );
      } catch (err: any) {
        this.logger.warn(`Could not create invitation during move-in: ${err.message}`);
      }

      return {
        message: 'Move-in completed successfully',
        contract: createdContract,
        tenant: tenantDoc,
        initialMeterReading: meterReadingPayload,
        invitationToken: invitation?.inviteToken,
      };
    });
  }

  // ==================== MOVE-OUT PREVIEW & SETTLEMENT ====================

  /**
   * POST /contracts/:id/move-out/preview
   * Tính hóa đơn cuối prorate + đối trừ công nợ/chi phí + cọc hoàn (KHÔNG GHI DATABASE)
   */
  async moveOutPreview(
    user: AuthenticatedUser,
    id: string,
    dto: MoveOutPreviewDto,
  ) {
    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      id,
      'Contract',
    );

    const property = await this.propertyRepo.findById(
      user.organizationId,
      contract.propertyId,
    );

    const moveOutDate = new Date(dto.moveOutDate);
    const year = moveOutDate.getFullYear();
    const month = moveOutDate.getMonth();
    const moveOutDay = moveOutDate.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 1. Tiền phòng prorate
    const proratedRent = Math.round((contract.rent / daysInMonth) * moveOutDay);

    // 2. Chi phí điện / nước phát sinh (nếu có finalMeterReading)
    let electricityUsage = 0;
    let electricityAmount = 0;
    let waterUsage = 0;
    let waterAmount = 0;

    const elecPrice =
      property?.billingConfig?.electricityUnitPrice ||
      property?.electricityUnitPrice ||
      3500;
    const waterPrice =
      property?.billingConfig?.waterUnitPrice ||
      property?.waterUnitPrice ||
      25000;

    if (dto.finalMeterReading) {
      // Tìm meter reading gần nhất của phòng
      const lastReading = await this.meterReadingModel
        .findOne({
          organizationId: user.organizationId,
          roomId: contract.roomId,
        })
        .sort({ recordedAt: -1 })
        .exec();

      const lastElec = lastReading?.electricityNew ?? 0;
      const lastWater = lastReading?.waterNew ?? 0;

      electricityUsage = Math.max(0, dto.finalMeterReading.electricity - lastElec);
      waterUsage = Math.max(0, dto.finalMeterReading.water - lastWater);

      electricityAmount = electricityUsage * elecPrice;
      waterAmount = waterUsage * waterPrice;
    }

    // 3. Chi phí phát sinh / đền bù hư hỏng
    const additionalCharges = dto.additionalCharges || [];
    const additionalChargesTotal = additionalCharges.reduce((sum, item) => sum + item.amount, 0);

    // 4. Công nợ hóa đơn cũ chưa thanh toán
    const unpaidInvoices = await this.invoiceModel.find({
      organizationId: user.organizationId,
      tenantId: contract.primaryTenantId || contract.tenantId,
      active: true,
      remainingAmount: { $gt: 0 },
    });
    const outstandingDebt = unpaidInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);

    // 5. Tính toán cọc khả dụng
    const ledger = contract.deposit?.ledger || [];
    const collectedDeposit = ledger
      .filter((e) => e.type === DepositLedgerType.COLLECTED)
      .reduce((sum, e) => sum + e.amount, 0);
    const deductedDeposit = ledger
      .filter((e) => e.type === DepositLedgerType.DEDUCTED)
      .reduce((sum, e) => sum + e.amount, 0);
    const refundedDeposit = ledger
      .filter((e) => e.type === DepositLedgerType.REFUNDED)
      .reduce((sum, e) => sum + e.amount, 0);

    const netDepositAvailable = Math.max(0, collectedDeposit - deductedDeposit - refundedDeposit);

    // 6. Tổng khấu trừ & Quyết toán cọc
    const totalDeductions =
      proratedRent +
      electricityAmount +
      waterAmount +
      additionalChargesTotal +
      outstandingDebt;

    const netSettlement = netDepositAvailable - totalDeductions;
    const refundToTenant = netSettlement > 0 ? netSettlement : 0;
    const additionalPaymentRequired = netSettlement < 0 ? Math.abs(netSettlement) : 0;

    return {
      contractId: contract._id,
      contractNo: contract.contractNo || contract.contractNumber,
      moveOutDate: dto.moveOutDate,
      daysStayedInMonth: `${moveOutDay}/${daysInMonth}`,
      breakdown: {
        proratedRent: {
          days: moveOutDay,
          totalDays: daysInMonth,
          monthlyRent: contract.rent,
          amount: proratedRent,
        },
        utilities: {
          electricity: { usage: electricityUsage, unitPrice: elecPrice, amount: electricityAmount },
          water: { usage: waterUsage, unitPrice: waterPrice, amount: waterAmount },
          total: electricityAmount + waterAmount,
        },
        additionalCharges: {
          items: additionalCharges,
          total: additionalChargesTotal,
        },
        outstandingDebt: {
          unpaidInvoicesCount: unpaidInvoices.length,
          total: outstandingDebt,
        },
      },
      depositSummary: {
        initialDeposit: contract.deposit?.amount || contract.depositAmount || 0,
        netDepositAvailable,
      },
      settlement: {
        totalDeductions,
        refundToTenant,
        additionalPaymentRequired,
        status: netSettlement >= 0 ? 'REFUND_DUE' : 'PAYMENT_DUE',
      },
    };
  }

  /**
   * POST /contracts/:id/move-out
   * Chốt theo preview: invoice cuối, contract TERMINATED, room VACANT, isCurrent=false.
   */
  async moveOut(user: AuthenticatedUser, id: string, dto: MoveOutDto) {
    // 1. Tính toán quyết toán dựa trên preview
    const preview = await this.moveOutPreview(user, id, dto);
    const contract = await this.contractRepo.findByIdOrThrow(
      user.organizationId,
      id,
      'Contract',
    );

    const moveOutDate = new Date(dto.moveOutDate);

    // 2. Ghi nhận trừ cọc và hoàn cọc vào ledger
    const ledgerEntries: any[] = [];
    if (preview.settlement.totalDeductions > 0) {
      ledgerEntries.push({
        type: DepositLedgerType.DEDUCTED,
        amount: Math.min(preview.depositSummary.netDepositAvailable, preview.settlement.totalDeductions),
        date: moveOutDate,
        reason: 'Move-out deductions (rent, utilities, damages, debt)',
      });
    }
    if (preview.settlement.refundToTenant > 0) {
      ledgerEntries.push({
        type: DepositLedgerType.REFUNDED,
        amount: preview.settlement.refundToTenant,
        date: moveOutDate,
        reason: 'Move-out remaining deposit refunded to tenant',
      });
    }

    // 3. Cập nhật contract: TERMINATED, isCurrent: false
    const updatedContract = await this.contractRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      {
        $set: {
          status: ContractStatus.TERMINATED,
          isCurrent: false,
          terminatedAt: moveOutDate,
          terminationReason: dto.reason || 'Move-out completed',
          'deposit.status': DepositStatus.REFUNDED,
        },
        $push: {
          'deposit.ledger': { $each: ledgerEntries },
        },
      },
    );

    // 4. Giải phóng phòng: status VACANT, currentContractId null
    await this.roomRepo.updateOne(
      user.organizationId,
      { _id: contract.roomId } as any,
      {
        $set: {
          status: RoomStatus.VACANT,
          currentContractId: null,
        },
      },
    );

    return {
      message: 'Move-out finalized successfully',
      contractId: id,
      roomStatus: RoomStatus.VACANT,
      settlementSummary: preview.settlement,
      contract: updatedContract,
    };
  }
}
