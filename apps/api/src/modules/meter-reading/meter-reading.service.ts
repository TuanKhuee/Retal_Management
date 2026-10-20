import {
  Injectable,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MeterReadingRepository } from './meter-reading.repository';
import { MeterRepository } from './repositories/meter.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { ServiceRepository } from '../service/repositories/service.repository';
import {
  CreateMeterDto,
  UpdateMeterDto,
  UpdateMeterReadingDto,
  BatchMeterReadingsDto,
  LockMeterReadingsDto,
  ImportMeterReadingsDto,
} from './dto/meter-reading.dto';
import { RecordMeterReadingDto } from './dto/record-meter-reading.dto';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import {
  MeterReadingFlag,
  MeterReadingSource,
  MeterReadingStatus,
  MeterStatus,
  MeterType,
  RoomStatus,
} from '../../common/constants';
import { Meter, MeterDocument } from './schemas/meter.schema';
import { MeterReading, MeterReadingDocument } from './schemas/meter-reading.schema';

@Injectable()
export class MeterReadingService {
  private readonly logger = new Logger(MeterReadingService.name);

  constructor(
    private readonly meterReadingRepo: MeterReadingRepository,
    private readonly meterRepo: MeterRepository,
    private readonly roomRepo: RoomRepository,
    private readonly propertyRepo: PropertyRepository,
    private readonly serviceRepo: ServiceRepository,
    @InjectModel(Meter.name)
    private readonly meterModel: Model<MeterDocument>,
    @InjectModel(MeterReading.name)
    private readonly meterReadingModel: Model<MeterReadingDocument>,
  ) {}

  // ==================== METERS MANAGEMENT ====================

  async createMeter(user: AuthenticatedUser, roomId: string, dto: CreateMeterDto) {
    const room = await this.roomRepo.findByIdOrThrow(user.organizationId, roomId, 'Room');

    const existingSerial = await this.meterRepo.findOne(user.organizationId, {
      serialNo: dto.serialNo.trim(),
    });
    if (existingSerial) {
      throw new ConflictException(`Meter serial number "${dto.serialNo}" already exists in your organization`);
    }

    return this.meterRepo.create(user.organizationId, {
      roomId,
      type: dto.type,
      serialNo: dto.serialNo.trim(),
      multiplier: dto.multiplier ?? 1,
      initialValue: dto.initialValue ?? 0,
      status: dto.status ?? MeterStatus.ACTIVE,
      installedAt: new Date(),
    } as any);
  }

  async getMetersByRoom(user: AuthenticatedUser, roomId: string) {
    await this.roomRepo.findByIdOrThrow(user.organizationId, roomId, 'Room');
    return this.meterRepo.findMetersByRoom(user.organizationId, roomId);
  }

  async updateMeter(user: AuthenticatedUser, id: string, dto: UpdateMeterDto) {
    const meter = await this.meterRepo.findById(user.organizationId, id);
    if (!meter) {
      throw new ResourceNotFoundException('Meter');
    }

    const updateData: any = {};
    if (dto.serialNo !== undefined) updateData.serialNo = dto.serialNo.trim();
    if (dto.multiplier !== undefined) updateData.multiplier = dto.multiplier;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.meterRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      { $set: updateData },
    );
    return updated;
  }

  // ==================== METER READINGS TABLE / BOARD ====================

  /**
   * GET /meter-readings?propertyId&period
   * Bảng nhập cả khu, kèm previousValue và cảnh báo
   */
  async getBoardReadings(
    user: AuthenticatedUser,
    propertyId: string,
    period: string,
  ) {
    await this.propertyRepo.findByIdOrThrow(user.organizationId, propertyId, 'Property');

    const rooms = await this.roomRepo.findRoomsByProperty(user.organizationId, propertyId);
    const resultRows: any[] = [];

    for (const room of rooms) {
      const meters = await this.meterRepo.findMetersByRoom(user.organizationId, room._id.toString());

      for (const meter of meters) {
        // Tìm reading của kỳ này nếu đã có
        const currentReading = await this.meterReadingRepo.findByMeterAndPeriod(
          user.organizationId,
          meter._id.toString(),
          period,
        );

        // Lấy previousValue từ kỳ trước hoặc initialValue của công tơ
        let previousValue = meter.initialValue || 0;
        const lastReading = await this.meterReadingRepo.findLatestReading(
          user.organizationId,
          meter._id.toString(),
          period,
        );
        if (lastReading) {
          previousValue = lastReading.currentValue;
        }

        resultRows.push({
          readingId: currentReading?._id || null,
          roomId: room._id,
          roomCode: room.code,
          roomStatus: room.status,
          meterId: meter._id,
          meterType: meter.type,
          serialNo: meter.serialNo,
          multiplier: meter.multiplier,
          period,
          previousValue: currentReading ? currentReading.previousValue : previousValue,
          currentValue: currentReading ? currentReading.currentValue : null,
          consumption: currentReading ? currentReading.consumption : null,
          adjustment: currentReading ? currentReading.adjustment : 0,
          flags: currentReading ? currentReading.flags : [],
          status: currentReading ? currentReading.status : MeterReadingStatus.DRAFT,
          isLocked: currentReading ? currentReading.isLocked : false,
        });
      }
    }

    return {
      propertyId,
      period,
      totalMeters: resultRows.length,
      rows: resultRows,
    };
  }

  // ==================== UPDATE READING (PUT /meter-readings/:id) ====================

  /**
   * PUT /meter-readings/:id
   * Quy tắc: Server tự lấy previousValue, tính consumption; client KHÔNG gửi consumption.
   * LOCKED không sửa được (422).
   * currentValue >= previousValue trừ khi có flag ROLLOVER hoặc METER_REPLACED (+ adjustment có lý do).
   * Gán ABNORMAL nếu consumption > 3x trung bình 3 kỳ gần nhất hoặc = 0 khi phòng OCCUPIED.
   */
  async updateReading(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateMeterReadingDto,
  ) {
    const reading = await this.meterReadingRepo.findById(user.organizationId, id);
    if (!reading) {
      throw new ResourceNotFoundException('MeterReading');
    }

    // 1. Chặn sửa nếu bản ghi đã bị KHÓA (LOCKED)
    if (reading.status === MeterReadingStatus.LOCKED || reading.isLocked) {
      throw new BusinessRuleViolationException(
        'Cannot update meter reading: This record has been LOCKED.',
      );
    }

    const meter = reading.meterId
      ? await this.meterRepo.findById(user.organizationId, reading.meterId.toString())
      : null;
    const multiplier = meter?.multiplier ?? 1;

    const flags = new Set<MeterReadingFlag>(dto.flags || []);
    const adjustment = dto.adjustment || 0;
    const previousVal = reading.previousValue ?? 0;
    const currentVal = dto.currentValue;

    const isRollover = flags.has(MeterReadingFlag.ROLLOVER);
    const isReplaced = flags.has(MeterReadingFlag.METER_REPLACED);

    // 2. Kiểm tra currentValue >= previousValue
    if (currentVal < previousVal && !isRollover && !isReplaced) {
      throw new BusinessRuleViolationException(
        `Current value (${currentVal}) cannot be less than previous value (${previousVal}) without ROLLOVER or METER_REPLACED flag.`,
      );
    }

    if ((isRollover || isReplaced) && adjustment !== 0 && !dto.adjustmentReason) {
      throw new BusinessRuleViolationException(
        'Adjustment reason is mandatory when ROLLOVER or METER_REPLACED flag is specified with adjustment.',
      );
    }

    // 3. Tính toán consumption
    let consumption = 0;
    if (isReplaced) {
      // Công tơ thay mới: tiêu thụ = chỉ số công tơ mới + lượng tiêu thụ dở dang của công tơ cũ (truyền qua adjustment)
      consumption = Math.round((currentVal + adjustment) * multiplier);
    } else if (isRollover) {
      // Công tơ quay vòng: ví dụ 9950 -> 0050.
      // Nếu client truyền adjustment (vd: 10,000) thì cộng dồn; nếu adjustment = 0 và currentVal < previousVal,
      // tự động tính theo mốc quay vòng (lũy thừa cơ số 10 gần nhất, vd: 10,000).
      if (adjustment === 0 && currentVal < previousVal) {
        const rolloverThreshold = Math.pow(10, Math.ceil(Math.log10(previousVal + 1)));
        consumption = Math.round((rolloverThreshold - previousVal + currentVal) * multiplier);
      } else {
        consumption = Math.round((currentVal - previousVal + adjustment) * multiplier);
      }
    } else {
      consumption = Math.round((currentVal - previousVal + adjustment) * multiplier);
    }

    if (consumption < 0) {
      consumption = 0;
    }

    // 4. Kiểm tra cảnh báo ABNORMAL
    // a) So sánh với trung bình 3 kỳ gần nhất
    if (reading.meterId) {
      const historicalReadings = await this.meterReadingRepo.findHistoricalReadings(
        user.organizationId,
        reading.meterId.toString(),
        reading.period || reading.billingPeriod || '',
        3,
      );

      if (historicalReadings.length > 0) {
        const sumPast = historicalReadings.reduce((sum, r) => sum + (r.consumption || 0), 0);
        const avgPast = sumPast / historicalReadings.length;
        if (avgPast > 0 && consumption > 3 * avgPast) {
          flags.add(MeterReadingFlag.ABNORMAL);
        }
      }
    }

    // b) Phòng OCCUPIED mà tiêu thụ = 0 -> ABNORMAL
    const room = await this.roomRepo.findById(user.organizationId, reading.roomId);
    if (room && room.status === RoomStatus.OCCUPIED && consumption === 0) {
      flags.add(MeterReadingFlag.ABNORMAL);
    }

    const updated = await this.meterReadingRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      {
        $set: {
          currentValue: currentVal,
          consumption,
          adjustment,
          adjustmentReason: dto.adjustmentReason,
          flags: Array.from(flags),
          source: dto.source || MeterReadingSource.MANUAL,
          photoAttachmentId: dto.photoAttachmentId,
          recordedAt: new Date(),
          recordedBy: user.userId,
        },
      },
    );

    return updated;
  }

  // ==================== BATCH RECORD READINGS ====================

  /**
   * POST /meter-readings/batch
   * Nhập hàng loạt chỉ số cho nhiều phòng/công tơ trong 1 kỳ
   */
  async batchRecord(user: AuthenticatedUser, dto: BatchMeterReadingsDto) {
    const updatedReadings: any[] = [];

    for (const item of dto.readings) {
      let reading = await this.meterReadingRepo.findByMeterAndPeriod(
        user.organizationId,
        item.meterId,
        dto.period,
      );

      const meter = await this.meterRepo.findById(user.organizationId, item.meterId);
      if (!meter) continue;

      if (!reading) {
        // Tìm previousValue từ kỳ trước
        let prevVal = meter.initialValue || 0;
        const lastReading = await this.meterReadingRepo.findLatestReading(
          user.organizationId,
          item.meterId,
          dto.period,
        );
        if (lastReading) prevVal = lastReading.currentValue;

        reading = await this.meterReadingRepo.create(user.organizationId, {
          meterId: item.meterId,
          roomId: item.roomId,
          propertyId: dto.propertyId,
          period: dto.period,
          billingPeriod: dto.period,
          previousValue: prevVal,
          currentValue: prevVal,
          consumption: 0,
          adjustment: 0,
          status: MeterReadingStatus.DRAFT,
          isLocked: false,
          recordedBy: user.userId,
          recordedAt: new Date(),
        } as any);
      }

      if (reading.status === MeterReadingStatus.LOCKED || reading.isLocked) {
        continue; // Bỏ qua nếu đã khóa
      }

      const updated = await this.updateReading(user, reading._id.toString(), {
        currentValue: item.currentValue,
        flags: item.flags,
        adjustment: item.adjustment,
        adjustmentReason: item.adjustmentReason,
        photoAttachmentId: item.photoAttachmentId,
      });

      updatedReadings.push(updated);
    }

    return {
      message: 'Batch readings recorded successfully',
      period: dto.period,
      totalProcessed: updatedReadings.length,
      savedCount: updatedReadings.length,
      readings: updatedReadings,
    };
  }

  // ==================== LOCK METER READINGS ====================

  /**
   * POST /meter-readings/lock
   * Chốt số kỳ: snapshot unitPrice/amount lúc LOCK từ service tương ứng.
   * Chuyển trạng thái sang LOCKED.
   */
  async lockReadings(user: AuthenticatedUser, dto: LockMeterReadingsDto) {
    const property = await this.propertyRepo.findByIdOrThrow(
      user.organizationId,
      dto.propertyId,
      'Property',
    );

    const readings = await this.meterReadingRepo.find(user.organizationId, {
      $or: [{ propertyId: dto.propertyId }, { roomId: { $exists: true } }],
      $and: [{ $or: [{ period: dto.period }, { billingPeriod: dto.period }] }],
    });

    if (readings.length === 0) {
      throw new ResourceNotFoundException('No meter readings found for this period to lock');
    }

    // Lấy đơn giá dịch vụ điện và nước từ Service hoặc Property billingConfig
    const [elecService, waterService] = await Promise.all([
      this.serviceRepo.findByCode(user.organizationId, 'ELEC'),
      this.serviceRepo.findByCode(user.organizationId, 'WATER'),
    ]);

    const defaultElecPrice =
      elecService?.unitPrice ||
      property.billingConfig?.electricityUnitPrice ||
      property.electricityUnitPrice ||
      3500;
    const defaultWaterPrice =
      waterService?.unitPrice ||
      property.billingConfig?.waterUnitPrice ||
      property.waterUnitPrice ||
      25000;

    let lockedCount = 0;
    let totalAmount = 0;

    for (const reading of readings) {
      let unitPrice = defaultElecPrice;

      if (reading.meterId) {
        const meter = await this.meterRepo.findById(user.organizationId, reading.meterId.toString());
        if (meter && meter.type === MeterType.WATER) {
          unitPrice = defaultWaterPrice;
        }
      }

      const amount = Math.round((reading.consumption || 0) * unitPrice);
      totalAmount += amount;

      await this.meterReadingRepo.updateOne(
        user.organizationId,
        { _id: reading._id } as any,
        {
          $set: {
            unitPrice,
            amount,
            status: MeterReadingStatus.LOCKED,
            isLocked: true,
          },
        },
      );
      lockedCount++;
    }

    return {
      message: `Successfully locked ${lockedCount} meter readings for period ${dto.period}`,
      propertyId: dto.propertyId,
      period: dto.period,
      lockedCount,
      totalAmount,
    };
  }

  // ==================== EXCEL IMPORT (PREVIEW & COMMIT) ====================

  /**
   * POST /meter-readings/import
   * Bước 1: Preview (mặc định commit=false): trả lỗi chi tiết từng dòng.
   * Bước 2: Commit (commit=true): ghi vào database.
   */
  async importReadings(user: AuthenticatedUser, dto: ImportMeterReadingsDto) {
    await this.propertyRepo.findByIdOrThrow(user.organizationId, dto.propertyId, 'Property');

    const rooms = await this.roomRepo.findRoomsByProperty(user.organizationId, dto.propertyId);
    const roomMap = new Map<string, any>(rooms.map((r) => [r.code.toUpperCase().trim(), r]));

    const validationErrors: Array<{ row: number; roomCode: string; meterType: string; error: string }> = [];
    const processedRows: any[] = [];

    let rowIndex = 0;
    for (const row of dto.rows) {
      rowIndex++;
      const cleanCode = row.roomCode.toUpperCase().trim();
      const room = roomMap.get(cleanCode);

      if (!room) {
        validationErrors.push({
          row: rowIndex,
          roomCode: row.roomCode,
          meterType: row.meterType,
          error: `Room code "${row.roomCode}" not found in this property`,
        });
        continue;
      }

      const meter = await this.meterRepo.findActiveMeterByRoomAndType(
        user.organizationId,
        room._id.toString(),
        row.meterType,
      );

      if (!meter) {
        validationErrors.push({
          row: rowIndex,
          roomCode: row.roomCode,
          meterType: row.meterType,
          error: `No active ${row.meterType} meter found for room ${row.roomCode}`,
        });
        continue;
      }

      // Lấy previousValue
      let prevVal = meter.initialValue || 0;
      const lastReading = await this.meterReadingRepo.findLatestReading(
        user.organizationId,
        meter._id.toString(),
        dto.period,
      );
      if (lastReading) {
        prevVal = lastReading.currentValue;
      }

      const isRollover = Boolean(row.isRollover);
      const isReplaced = Boolean(row.isReplaced);
      const adjustment = row.adjustment || 0;

      if (row.currentValue < prevVal && !isRollover && !isReplaced) {
        validationErrors.push({
          row: rowIndex,
          roomCode: row.roomCode,
          meterType: row.meterType,
          error: `Current value (${row.currentValue}) < previous value (${prevVal}) without rollover/replacement flag`,
        });
        continue;
      }

      const flags: MeterReadingFlag[] = [];
      if (isRollover) flags.push(MeterReadingFlag.ROLLOVER);
      if (isReplaced) flags.push(MeterReadingFlag.METER_REPLACED);

      let consumption = 0;
      if (isReplaced) {
        consumption = Math.round((row.currentValue + adjustment) * meter.multiplier);
      } else {
        consumption = Math.round((row.currentValue - prevVal + adjustment) * meter.multiplier);
      }

      processedRows.push({
        meterId: meter._id.toString(),
        roomId: room._id.toString(),
        propertyId: dto.propertyId,
        period: dto.period,
        previousValue: prevVal,
        currentValue: row.currentValue,
        consumption: Math.max(0, consumption),
        adjustment,
        adjustmentReason: row.adjustmentReason,
        flags,
        source: MeterReadingSource.IMPORT,
      });
    }

    // Nếu là bước Preview (commit !== true)
    if (!dto.commit) {
      return {
        action: 'preview',
        totalRows: dto.rows.length,
        validCount: processedRows.length,
        errorCount: validationErrors.length,
        errors: validationErrors,
        previewData: processedRows,
      };
    }

    // Nếu là bước Commit
    if (validationErrors.length > 0) {
      throw new BusinessRuleViolationException(
        `Import failed: ${validationErrors.length} invalid rows found. Please fix all errors before committing.`,
        validationErrors,
      );
    }

    const savedReadings: any[] = [];
    for (const item of processedRows) {
      let existing = await this.meterReadingRepo.findByMeterAndPeriod(
        user.organizationId,
        item.meterId,
        dto.period,
      );

      if (existing) {
        if (existing.status === MeterReadingStatus.LOCKED || existing.isLocked) continue;
        const updated = await this.meterReadingRepo.updateOne(
          user.organizationId,
          { _id: existing._id } as any,
          { $set: item },
        );
        savedReadings.push(updated);
      } else {
        const created = await this.meterReadingRepo.create(user.organizationId, {
          ...item,
          status: MeterReadingStatus.DRAFT,
          isLocked: false,
          recordedBy: user.userId,
          recordedAt: new Date(),
        } as any);
        savedReadings.push(created);
      }
    }

    return {
      action: 'commit',
      message: `Successfully imported ${savedReadings.length} meter readings`,
      totalCommitted: savedReadings.length,
      period: dto.period,
    };
  }

  // ==================== LEGACY COMPATIBILITY METHODS ====================

  async recordReading(user: AuthenticatedUser, dto: RecordMeterReadingDto) {
    if (dto.electricityNew < dto.electricityOld) {
      throw new BusinessRuleViolationException(
        `Electricity current reading (${dto.electricityNew}) cannot be less than previous (${dto.electricityOld})`,
      );
    }
    if (dto.waterNew < dto.waterOld) {
      throw new BusinessRuleViolationException(
        `Water current reading (${dto.waterNew}) cannot be less than previous (${dto.waterOld})`,
      );
    }

    const room = await this.roomRepo.findByIdOrThrow(user.organizationId, dto.roomId, 'Room');
    const existing = await this.meterReadingRepo.findByRoomAndPeriod(
      user.organizationId,
      dto.roomId,
      dto.billingPeriod,
    );

    if (existing) {
      return this.meterReadingRepo.updateOne(
        user.organizationId,
        { _id: existing._id } as any,
        {
          $set: {
            electricityOld: dto.electricityOld,
            electricityNew: dto.electricityNew,
            waterOld: dto.waterOld,
            waterNew: dto.waterNew,
            recordedAt: new Date(),
            recordedBy: user.userId,
          },
        },
      );
    }

    return this.meterReadingRepo.create(user.organizationId, {
      propertyId: room.propertyId,
      roomId: dto.roomId,
      period: dto.billingPeriod,
      billingPeriod: dto.billingPeriod,
      electricityOld: dto.electricityOld,
      electricityNew: dto.electricityNew,
      waterOld: dto.waterOld,
      waterNew: dto.waterNew,
      status: MeterReadingStatus.LOCKED,
      isLocked: true,
      recordedAt: new Date(),
      recordedBy: user.userId,
    } as any);
  }

  async getReadingsByRoom(
    user: AuthenticatedUser,
    roomId: string,
    billingPeriod?: string,
  ) {
    const filter: any = { roomId };
    if (billingPeriod) {
      filter.$or = [{ period: billingPeriod }, { billingPeriod }];
    }
    return this.meterReadingRepo.find(user.organizationId, filter);
  }
}
