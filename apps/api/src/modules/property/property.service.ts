import {
  Injectable,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PropertyRepository } from './repositories/property.repository';
import { RoomRepository } from './repositories/room.repository';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import {
  CreateRoomDto,
  UpdateRoomDto,
  BulkCreateRoomsDto,
  ChangeRoomStatusDto,
  RoomQueryDto,
} from './dto/room.dto';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { RoomStatus, UserRole } from '../../common/constants';
import { Invoice, InvoiceDocument } from '../invoice/schemas/invoice.schema';
import { Contract, ContractDocument } from '../contract/schemas/contract.schema';

@Injectable()
export class PropertyService {
  constructor(
    private readonly propertyRepo: PropertyRepository,
    private readonly roomRepo: RoomRepository,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
  ) {}

  // ==================== PROPERTY METHODS ====================

  async createProperty(user: AuthenticatedUser, dto: CreatePropertyDto) {
    const billingConfig = dto.billingConfig || {
      electricityUnitPrice: dto.electricityUnitPrice ?? 3500,
      waterUnitPrice: dto.waterUnitPrice ?? 25000,
      internetUnitPrice: dto.internetUnitPrice ?? 100000,
      garbageUnitPrice: dto.garbageUnitPrice ?? 50000,
    };

    return this.propertyRepo.create(user.organizationId, {
      name: dto.name,
      address: dto.address,
      bankAccount: dto.bankAccount,
      billingConfig,
      // Compatibility fields
      electricityUnitPrice: billingConfig.electricityUnitPrice,
      waterUnitPrice: billingConfig.waterUnitPrice,
      internetUnitPrice: billingConfig.internetUnitPrice,
      garbageUnitPrice: billingConfig.garbageUnitPrice,
      isActive: true,
    } as any);
  }

  async listProperties(user: AuthenticatedUser, page = 1, limit = 20) {
    return this.propertyRepo.findPaginated(
      user.organizationId,
      { isActive: { $ne: false } },
      page,
      limit,
    );
  }

  async getPropertyById(user: AuthenticatedUser, id: string) {
    return this.propertyRepo.findByIdOrThrow(user.organizationId, id, 'Property');
  }

  async updateProperty(user: AuthenticatedUser, id: string, dto: UpdatePropertyDto) {
    const updateData: any = { ...dto };
    if (dto.billingConfig) {
      updateData.electricityUnitPrice = dto.billingConfig.electricityUnitPrice;
      updateData.waterUnitPrice = dto.billingConfig.waterUnitPrice;
      updateData.internetUnitPrice = dto.billingConfig.internetUnitPrice;
      updateData.garbageUnitPrice = dto.billingConfig.garbageUnitPrice;
    }

    const updated = await this.propertyRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      { $set: updateData },
    );
    if (!updated) throw new ResourceNotFoundException('Property');
    return updated;
  }

  async deactivateProperty(user: AuthenticatedUser, id: string) {
    const updated = await this.propertyRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      { $set: { isActive: false } },
    );
    if (!updated) throw new ResourceNotFoundException('Property');
    return { message: 'Property deactivated successfully', id };
  }

  /**
   * Property Dashboard: tổng phòng, đang thuê, trống, công nợ, doanh thu kỳ hiện tại
   */
  async getPropertyDashboard(user: AuthenticatedUser, propertyId: string) {
    // Verify property exists in org
    await this.propertyRepo.findByIdOrThrow(user.organizationId, propertyId, 'Property');

    // 1. Rooms statistics (exclude soft-deleted)
    const [totalRooms, occupiedRooms, vacantRooms, maintenanceRooms, reservedRooms] =
      await Promise.all([
        this.roomRepo.countByStatus(user.organizationId, propertyId),
        this.roomRepo.countByStatus(user.organizationId, propertyId, RoomStatus.OCCUPIED),
        this.roomRepo.countByStatus(user.organizationId, propertyId, RoomStatus.VACANT),
        this.roomRepo.countByStatus(user.organizationId, propertyId, RoomStatus.MAINTENANCE),
        this.roomRepo.countByStatus(user.organizationId, propertyId, RoomStatus.RESERVED),
      ]);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // 2. Financial statistics: Total debt (outstanding remaining amount)
    const debtAggregation = await this.invoiceModel.aggregate([
      {
        $match: {
          organizationId: user.organizationId,
          propertyId,
          active: true,
          remainingAmount: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: '$remainingAmount' },
        },
      },
    ]);
    const totalDebt = debtAggregation.length > 0 ? debtAggregation[0].totalDebt : 0;

    // 3. Current period revenue (paid amount in current YYYY-MM)
    const currentPeriod = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
    const revenueAggregation = await this.invoiceModel.aggregate([
      {
        $match: {
          organizationId: user.organizationId,
          propertyId,
          billingPeriodId: currentPeriod,
        },
      },
      {
        $group: {
          _id: null,
          currentRevenue: { $sum: '$paidAmount' },
        },
      },
    ]);
    const currentRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].currentRevenue : 0;

    return {
      propertyId,
      currentPeriod,
      rooms: {
        total: totalRooms,
        occupied: occupiedRooms,
        vacant: vacantRooms,
        maintenance: maintenanceRooms,
        reserved: reservedRooms,
        occupancyRate: `${occupancyRate}%`,
      },
      finance: {
        totalDebt,
        currentRevenue,
      },
    };
  }

  // ==================== ROOM METHODS ====================

  async createRoom(user: AuthenticatedUser, dto: CreateRoomDto) {
    await this.propertyRepo.findByIdOrThrow(user.organizationId, dto.propertyId, 'Property');

    const code = (dto.code || dto.roomNumber || '').trim();
    if (!code) {
      throw new BusinessRuleViolationException('Room code is required');
    }

    const existing = await this.roomRepo.findByPropertyAndCode(
      user.organizationId,
      dto.propertyId,
      code,
    );
    if (existing) {
      throw new ConflictException(`Room code "${code}" already exists in this property`);
    }

    const baseRent = Math.round(dto.baseRent ?? dto.basePrice ?? 0);

    return this.roomRepo.create(user.organizationId, {
      propertyId: dto.propertyId,
      code,
      floor: dto.floor ?? 1,
      area: dto.area ?? 20,
      baseRent,
      status: dto.status || RoomStatus.VACANT,
      currentContractId: null,
      deletedAt: null,
      // Compatibility aliases
      roomNumber: code,
      basePrice: baseRent,
    } as any);
  }

  /**
   * Bulk room creation using pattern e.g. "A101-A120" or "101-115"
   */
  async bulkCreateRooms(user: AuthenticatedUser, dto: BulkCreateRoomsDto) {
    await this.propertyRepo.findByIdOrThrow(user.organizationId, dto.propertyId, 'Property');

    const match = dto.pattern.trim().match(/^([A-Za-z]*)(\d+)-([A-Za-z]*)(\d+)$/);
    if (!match) {
      throw new BusinessRuleViolationException(
        'Invalid pattern format. Must be PREFIX<NUM>-PREFIX<NUM>, e.g. A101-A120 or 101-115',
      );
    }

    const prefix1 = match[1];
    const num1 = parseInt(match[2], 10);
    const prefix2 = match[3];
    const num2 = parseInt(match[4], 10);

    if (prefix1 !== prefix2) {
      throw new BusinessRuleViolationException('Pattern prefixes must match, e.g. A101-A120');
    }

    const start = Math.min(num1, num2);
    const end = Math.max(num1, num2);

    if (end - start > 100) {
      throw new BusinessRuleViolationException('Cannot bulk create more than 100 rooms at once');
    }

    const padLength = match[2].length;
    const codesToGenerate: string[] = [];
    for (let i = start; i <= end; i++) {
      const numStr = i.toString().padStart(padLength, '0');
      codesToGenerate.push(`${prefix1}${numStr}`);
    }

    // Check existing room codes in property
    const existingRooms = await this.roomRepo.findRoomsByProperty(
      user.organizationId,
      dto.propertyId,
    );
    const existingCodes = new Set(existingRooms.map((r) => r.code));

    const roomsToInsert: Partial<any>[] = [];
    const skippedCodes: string[] = [];

    for (const code of codesToGenerate) {
      if (existingCodes.has(code)) {
        skippedCodes.push(code);
      } else {
        roomsToInsert.push({
          propertyId: dto.propertyId,
          code,
          floor: dto.floor ?? 1,
          area: dto.area ?? 20,
          baseRent: Math.round(dto.baseRent),
          status: RoomStatus.VACANT,
          currentContractId: null,
          deletedAt: null,
          roomNumber: code,
          basePrice: Math.round(dto.baseRent),
        });
      }
    }

    let createdRooms: any[] = [];
    if (roomsToInsert.length > 0) {
      createdRooms = await this.roomRepo.bulkInsert(user.organizationId, roomsToInsert);
    }

    return {
      totalRequested: codesToGenerate.length,
      createdCount: createdRooms.length,
      skippedCount: skippedCodes.length,
      skippedCodes,
      createdRooms,
    };
  }

  async listRooms(user: AuthenticatedUser, query: RoomQueryDto) {
    const filter: any = { deletedAt: null };

    if (query.propertyId) filter.propertyId = query.propertyId;
    if (query.status) filter.status = query.status;
    if (query.floor) filter.floor = query.floor;
    if (query.q) {
      filter.$or = [
        { code: { $regex: query.q, $options: 'i' } },
        { roomNumber: { $regex: query.q, $options: 'i' } },
      ];
    }

    // TENANT restriction: only see their own assigned room
    if (user.role === UserRole.TENANT) {
      if (!user.tenantId) {
        return { data: [], meta: { page: 1, limit: query.limit || 20, totalItems: 0, totalPages: 1, hasNext: false, hasPrev: false } };
      }
      // Find active contract for this tenant
      const activeContract = await this.contractModel.findOne({
        organizationId: user.organizationId,
        tenantId: user.tenantId,
        isCurrent: true,
      });

      if (!activeContract) {
        return { data: [], meta: { page: 1, limit: query.limit || 20, totalItems: 0, totalPages: 1, hasNext: false, hasPrev: false } };
      }

      filter._id = activeContract.roomId;
    }

    return this.roomRepo.findPaginated(
      user.organizationId,
      filter,
      query.page,
      query.limit,
    );
  }

  async getRoomById(user: AuthenticatedUser, id: string) {
    const room = await this.roomRepo.findById(user.organizationId, id);
    if (!room || room.deletedAt) {
      throw new ResourceNotFoundException('Room');
    }

    // Security/Ownership check for TENANT (Rule: TENANT chỉ đọc phòng của mình; truy cập chéo -> 404!)
    if (user.role === UserRole.TENANT) {
      if (!room.currentContractId || !user.tenantId) {
        throw new ResourceNotFoundException('Room');
      }

      const contract = await this.contractModel.findById(room.currentContractId);
      const contractTenantId = contract?.primaryTenantId || contract?.tenantId;
      if (!contract || !contractTenantId || contractTenantId.toString() !== user.tenantId) {
        throw new ResourceNotFoundException('Room');
      }
    }

    return room;
  }

  async updateRoom(user: AuthenticatedUser, id: string, dto: UpdateRoomDto) {
    const room = await this.roomRepo.findById(user.organizationId, id);
    if (!room || room.deletedAt) {
      throw new ResourceNotFoundException('Room');
    }

    const updateData: any = {};
    if (dto.code) {
      const code = dto.code.trim();
      const existing = await this.roomRepo.findByPropertyAndCode(
        user.organizationId,
        room.propertyId,
        code,
      );
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException(`Room code "${code}" already exists in this property`);
      }
      updateData.code = code;
      updateData.roomNumber = code;
    }

    if (dto.floor !== undefined) updateData.floor = dto.floor;
    if (dto.area !== undefined) updateData.area = dto.area;
    if (dto.baseRent !== undefined) {
      updateData.baseRent = Math.round(dto.baseRent);
      updateData.basePrice = Math.round(dto.baseRent);
    } else if (dto.basePrice !== undefined) {
      updateData.baseRent = Math.round(dto.basePrice);
      updateData.basePrice = Math.round(dto.basePrice);
    }

    const updated = await this.roomRepo.updateOne(
      user.organizationId,
      { _id: id, deletedAt: null } as any,
      { $set: updateData },
    );
    if (!updated) throw new ResourceNotFoundException('Room');
    return updated;
  }

  /**
   * Soft delete room: CHẶN khi room đang OCCUPIED
   */
  async deleteRoom(user: AuthenticatedUser, id: string) {
    const room = await this.roomRepo.findById(user.organizationId, id);
    if (!room || room.deletedAt) {
      throw new ResourceNotFoundException('Room');
    }

    // Business rule: CHẶN xóa khi room đang OCCUPIED
    if (room.status === RoomStatus.OCCUPIED) {
      throw new BusinessRuleViolationException(
        'Cannot delete room currently OCCUPIED. Please terminate active rental contract first.',
      );
    }

    await this.roomRepo.softDelete(user.organizationId, id);
    return { message: `Room ${room.code} soft-deleted successfully`, id };
  }

  /**
   * Room State Machine:
   * Chuyển trạng thái giữa VACANT, MAINTENANCE, RESERVED.
   * CHẶN đổi trạng thái trực tiếp khi phòng đang OCCUPIED (phải qua quy trình hợp đồng).
   */
  async changeRoomStatus(
    user: AuthenticatedUser,
    id: string,
    dto: ChangeRoomStatusDto,
  ) {
    const room = await this.roomRepo.findById(user.organizationId, id);
    if (!room || room.deletedAt) {
      throw new ResourceNotFoundException('Room');
    }

    // 1. Chặn chuyển trạng thái khi phòng đang OCCUPIED
    if (room.status === RoomStatus.OCCUPIED) {
      throw new BusinessRuleViolationException(
        'Cannot change status of OCCUPIED room directly. Rental contract must be terminated.',
      );
    }

    // 2. Chặn chuyển sang OCCUPIED trực tiếp
    if (dto.status === RoomStatus.OCCUPIED) {
      throw new BusinessRuleViolationException(
        'Cannot directly set room status to OCCUPIED. Room must be occupied by activating a rental contract.',
      );
    }

    // 3. Chuyển trạng thái hợp lệ (VACANT <-> MAINTENANCE, VACANT <-> RESERVED, MAINTENANCE <-> RESERVED)
    const updated = await this.roomRepo.updateOne(
      user.organizationId,
      { _id: id, deletedAt: null } as any,
      { $set: { status: dto.status } },
    );

    return updated;
  }
}
