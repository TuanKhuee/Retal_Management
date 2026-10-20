import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DepositLedgerType } from '../../../common/constants';
import { PaginationQueryDto } from '../../../common/utils/pagination.util';

export class OccupantDto {
  @ApiProperty({ description: 'Họ tên người ở cùng', example: 'Trần Thị B' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Số điện thoại', example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'Số CCCD/CMND', example: '012345678901' })
  @IsOptional()
  @IsString()
  idCard?: string;

  @ApiPropertyOptional({ description: 'Mối quan hệ', example: 'Bạn cùng phòng' })
  @IsOptional()
  @IsString()
  relationship?: string;
}

export class ServiceSubscriptionDto {
  @ApiProperty({ description: 'ID Dịch vụ đăng ký', example: '64f8a...' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiPropertyOptional({ description: 'Số lượng sử dụng (mặc định 1)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Đơn giá đặc thù thỏa thuận riêng cho phòng này' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPriceOverride?: number;
}

export class CreateContractDto {
  @ApiProperty({ example: 'PROP123...', description: 'Property ID' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ example: 'ROOM123...', description: 'Room ID' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiPropertyOptional({ example: 'TENANT123...', description: 'ID khách thuê chính' })
  @IsOptional()
  @IsString()
  primaryTenantId?: string;

  @ApiPropertyOptional({ example: 'TENANT123...', description: 'Alias của primaryTenantId' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ type: [OccupantDto], description: 'Danh sách người ở cùng' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OccupantDto)
  occupants?: OccupantDto[];

  @ApiProperty({ example: '2026-11-01', description: 'Ngày bắt đầu hợp đồng' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2027-11-01', description: 'Ngày kết thúc hợp đồng' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 5, default: 5, description: 'Ngày đóng tiền hàng tháng (1-31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @ApiPropertyOptional({ example: 5, description: 'Alias của dueDay' })
  @IsOptional()
  @IsInt()
  billingCycleDay?: number;

  @ApiPropertyOptional({ example: 3500000, description: 'Tiền thuê hàng tháng (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rent?: number;

  @ApiPropertyOptional({ example: 3500000, description: 'Alias của rent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rentalPrice?: number;

  @ApiPropertyOptional({ example: 3500000, description: 'Tiền đặt cọc (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ type: [ServiceSubscriptionDto], description: 'Dịch vụ đăng ký sử dụng' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceSubscriptionDto)
  serviceSubscriptions?: ServiceSubscriptionDto[];

  @ApiPropertyOptional({ example: 'Thanh toán tiền phòng từ ngày 1-5 hàng tháng' })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách ID tài liệu/file đính kèm' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({ example: 'Hop dong ky truc tiep' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * PATCH /contracts/:id
 * QUY TẮC: CHỈ sửa trường phi tài chính. Không được sửa rent / depositAmount trực tiếp.
 */
export class UpdateContractDto {
  @ApiPropertyOptional({ type: [OccupantDto], description: 'Cập nhật danh sách người ở cùng' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OccupantDto)
  occupants?: OccupantDto[];

  @ApiPropertyOptional({ example: 5, description: 'Ngày thu tiền hàng tháng (1-31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @ApiPropertyOptional({ description: 'Điều khoản phi tài chính' })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách ID file đính kèm' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({ description: 'Ghi chú hợp đồng' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Reject / disallow financial field changes directly
  @IsOptional()
  rentalPrice?: any;

  @IsOptional()
  rent?: any;

  @IsOptional()
  depositAmount?: any;
}

/**
 * POST /contracts/:id/revisions
 * Đổi giá / điều khoản kèm effectiveFrom, reason -> tăng version, ghi audit log
 */
export class CreateContractRevisionDto {
  @ApiProperty({ description: 'Lý do điều chỉnh (bắt buộc)', example: 'Nâng cấp máy lạnh và tăng giá điện' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu áp dụng thay đổi (mặc định hôm nay)', example: '2026-12-01' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: 'Giá thuê mới (VND)', example: 4000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rent?: number;

  @ApiPropertyOptional({ description: 'Điều khoản mới' })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional({ type: [ServiceSubscriptionDto], description: 'Danh sách dịch vụ đăng ký mới' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceSubscriptionDto)
  serviceSubscriptions?: ServiceSubscriptionDto[];
}

export class TerminateContractDto {
  @ApiProperty({ example: 'Khach tra phong som chuyen cong tac', description: 'Lý do chấm dứt hợp đồng' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RenewContractDto {
  @ApiProperty({ example: '2028-11-01', description: 'Ngày kết thúc mới của hợp đồng gia hạn' })
  @IsDateString()
  newEndDate: string;

  @ApiPropertyOptional({ description: 'Lý do gia hạn', example: 'Gia hạn thêm 1 năm' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Giá thuê mới nếu có điều chỉnh', example: 3800000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rent?: number;
}

export class RecordDepositDto {
  @ApiProperty({ enum: DepositLedgerType, example: DepositLedgerType.COLLECTED })
  @IsEnum(DepositLedgerType)
  type: DepositLedgerType;

  @ApiProperty({ description: 'Số tiền biến động (VND)', example: 3500000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Ngày giao dịch', example: '2026-10-09' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Lý do / mục đích', example: 'Thu tiền cọc đợt 1' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class NewTenantInfoDto {
  @ApiProperty({ example: 'Nguyễn Văn Minh' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '0988776655' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '079201001234' })
  @IsString()
  @IsNotEmpty()
  cccdNumber: string;

  @ApiPropertyOptional({ example: 'minh.nguyen@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class InitialMeterReadingDto {
  @ApiProperty({ description: 'Chỉ số điện đầu kỳ (kWh)', example: 1250 })
  @IsNumber()
  @Min(0)
  electricity: number;

  @ApiProperty({ description: 'Chỉ số nước đầu kỳ (m3)', example: 85 })
  @IsNumber()
  @Min(0)
  water: number;
}

export class MoveInDto {
  @ApiProperty({ description: 'ID Bất động sản' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ description: 'ID Phòng trọ' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiPropertyOptional({ description: 'ID khách thuê nếu chọn tenant đã tồn tại' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Thông tin tạo mới tenant nếu là khách thuê mới' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewTenantInfoDto)
  newTenant?: NewTenantInfoDto;

  @ApiPropertyOptional({ type: [OccupantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OccupantDto)
  occupants?: OccupantDto[];

  @ApiProperty({ example: '2026-10-10' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2027-10-10' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @ApiProperty({ example: 4500000, description: 'Tiền thuê tháng' })
  @IsNumber()
  @Min(0)
  rent: number;

  @ApiProperty({ example: 4500000, description: 'Tiền đặt cọc ban đầu' })
  @IsNumber()
  @Min(0)
  depositAmount: number;

  @ApiProperty({ type: InitialMeterReadingDto, description: 'Chỉ số đồng hồ điện nước đầu kỳ (LOCKED)' })
  @ValidateNested()
  @Type(() => InitialMeterReadingDto)
  initialMeterReading: InitialMeterReadingDto;

  @ApiPropertyOptional({ type: [ServiceSubscriptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceSubscriptionDto)
  serviceSubscriptions?: ServiceSubscriptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;
}

export class AdditionalChargeItemDto {
  @ApiProperty({ example: 'Bồi thường mất chìa khóa cổng và làm vỡ bóng đèn' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class FinalMeterReadingDto {
  @ApiProperty({ example: 1350 })
  @IsNumber()
  @Min(0)
  electricity: number;

  @ApiProperty({ example: 92 })
  @IsNumber()
  @Min(0)
  water: number;
}

export class MoveOutPreviewDto {
  @ApiProperty({ example: '2026-10-25', description: 'Ngày trả phòng thực tế' })
  @IsDateString()
  moveOutDate: string;

  @ApiPropertyOptional({ type: FinalMeterReadingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FinalMeterReadingDto)
  finalMeterReading?: FinalMeterReadingDto;

  @ApiPropertyOptional({ type: [AdditionalChargeItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeItemDto)
  additionalCharges?: AdditionalChargeItemDto[];
}

export class MoveOutDto {
  @ApiProperty({ example: '2026-10-25', description: 'Ngày trả phòng thực tế' })
  @IsDateString()
  moveOutDate: string;

  @ApiPropertyOptional({ type: FinalMeterReadingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FinalMeterReadingDto)
  finalMeterReading?: FinalMeterReadingDto;

  @ApiPropertyOptional({ type: [AdditionalChargeItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeItemDto)
  additionalCharges?: AdditionalChargeItemDto[];

  @ApiPropertyOptional({ example: 'Khách hết hạn hợp đồng về quê' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ default: true, description: 'Tự động hạch toán hoàn cọc / trừ cọc' })
  @IsOptional()
  @IsBoolean()
  settleDeposit?: boolean;
}

export class ContractQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isCurrent?: boolean;
}
