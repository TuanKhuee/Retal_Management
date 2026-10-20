import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  MeterType,
  MeterStatus,
  MeterReadingFlag,
  MeterReadingSource,
} from '../../../common/constants';

// ==================== METERS DTOs ====================

export class CreateMeterDto {
  @ApiProperty({ enum: MeterType, example: MeterType.ELECTRIC })
  @IsEnum(MeterType)
  type: MeterType;

  @ApiProperty({ description: 'Số seri công tơ', example: 'EM-2026-0012' })
  @IsString()
  @IsNotEmpty()
  serialNo: string;

  @ApiPropertyOptional({ description: 'Hệ số nhân (mặc định 1)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  multiplier?: number;

  @ApiPropertyOptional({ description: 'Chỉ số ban đầu khi lắp đặt', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialValue?: number;

  @ApiPropertyOptional({ enum: MeterStatus, default: MeterStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MeterStatus)
  status?: MeterStatus;
}

export class UpdateMeterDto {
  @ApiPropertyOptional({ description: 'Số seri mới' })
  @IsOptional()
  @IsString()
  serialNo?: string;

  @ApiPropertyOptional({ description: 'Hệ số nhân mới' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  multiplier?: number;

  @ApiPropertyOptional({ enum: MeterStatus })
  @IsOptional()
  @IsEnum(MeterStatus)
  status?: MeterStatus;
}

// ==================== METER READINGS DTOs ====================

/**
 * PUT /meter-readings/:id
 * QUY TẮC: Client KHÔNG gửi consumption. Server tự lấy previousValue và tính consumption!
 */
export class UpdateMeterReadingDto {
  @ApiProperty({ description: 'Chỉ số mới hiện tại ghi nhận', example: 1250 })
  @IsNumber()
  @Min(0)
  currentValue: number;

  @ApiPropertyOptional({
    description: 'Cờ đặc biệt (ROLLOVER nếu công tơ quay vòng, METER_REPLACED nếu thay công tơ)',
    enum: MeterReadingFlag,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MeterReadingFlag, { each: true })
  flags?: MeterReadingFlag[];

  @ApiPropertyOptional({ description: 'Số lượng điều chỉnh (Vd: bù vòng quay hoặc bù công tơ cũ)', default: 0 })
  @IsOptional()
  @IsNumber()
  adjustment?: number;

  @ApiPropertyOptional({ description: 'Lý do điều chỉnh (bắt buộc nếu có adjustment hoặc thay công tơ)' })
  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  @ApiPropertyOptional({ description: 'ID ảnh chụp đồng hồ đính kèm' })
  @IsOptional()
  @IsString()
  photoAttachmentId?: string;

  @ApiPropertyOptional({ enum: MeterReadingSource, default: MeterReadingSource.MANUAL })
  @IsOptional()
  @IsEnum(MeterReadingSource)
  source?: MeterReadingSource;
}

export class BatchMeterReadingItemDto {
  @ApiProperty({ description: 'ID công tơ' })
  @IsString()
  @IsNotEmpty()
  meterId: string;

  @ApiProperty({ description: 'ID phòng' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ description: 'Chỉ số ghi nhận mới' })
  @IsNumber()
  @Min(0)
  currentValue: number;

  @ApiPropertyOptional({ enum: MeterReadingFlag, isArray: true })
  @IsOptional()
  @IsArray()
  flags?: MeterReadingFlag[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  adjustment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoAttachmentId?: string;
}

export class BatchMeterReadingsDto {
  @ApiProperty({ description: 'ID Bất động sản' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ description: 'Kỳ chốt số (YYYY-MM)', example: '2026-10' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiProperty({ type: [BatchMeterReadingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchMeterReadingItemDto)
  readings: BatchMeterReadingItemDto[];
}

export class LockMeterReadingsDto {
  @ApiProperty({ description: 'ID Bất động sản cần khóa số' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ description: 'Kỳ chốt số cần khóa (YYYY-MM)', example: '2026-10' })
  @IsString()
  @IsNotEmpty()
  period: string;
}

export class ImportMeterReadingRowDto {
  @ApiProperty({ example: '101', description: 'Mã phòng' })
  @IsString()
  @IsNotEmpty()
  roomCode: string;

  @ApiProperty({ enum: MeterType, example: MeterType.ELECTRIC })
  @IsEnum(MeterType)
  meterType: MeterType;

  @ApiPropertyOptional({ example: 'EM-2026-001' })
  @IsOptional()
  @IsString()
  serialNo?: string;

  @ApiProperty({ example: 1250, description: 'Chỉ số mới' })
  @IsNumber()
  @Min(0)
  currentValue: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  adjustment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  @ApiPropertyOptional({ description: 'Đánh dấu công tơ quay vòng (9999 -> 0020)' })
  @IsOptional()
  @IsBoolean()
  isRollover?: boolean;

  @ApiPropertyOptional({ description: 'Đánh dấu thay công tơ mới' })
  @IsOptional()
  @IsBoolean()
  isReplaced?: boolean;
}

export class ImportMeterReadingsDto {
  @ApiProperty({ description: 'ID Bất động sản' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ description: 'Kỳ chốt số (YYYY-MM)', example: '2026-10' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiProperty({ type: [ImportMeterReadingRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMeterReadingRowDto)
  rows: ImportMeterReadingRowDto[];

  @ApiPropertyOptional({
    description: 'Chế độ lưu: true = commit ghi vào database, false = preview kiểm tra lỗi từng dòng',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  commit?: boolean;
}
