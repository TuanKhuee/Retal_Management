import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { InvoiceItemType, InvoiceStatus } from '../../../common/constants';

export class CustomInvoiceItemDto {
  @ApiProperty({ enum: InvoiceItemType, example: InvoiceItemType.SERVICE })
  @IsEnum(InvoiceItemType)
  type: InvoiceItemType;

  @ApiProperty({ example: 'Phi ve sinh va gui xe' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 150000, description: 'Unit price in integer VND' })
  @IsInt()
  @Min(0)
  unitPrice: number;
}

export class GenerateInvoiceDto {
  @ApiProperty({ example: 'CONTRACT123...', description: 'Active Contract ID' })
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({ example: '2026-10', description: 'Billing period (YYYY-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'billingPeriodId must be in YYYY-MM format' })
  billingPeriodId: string;

  @ApiPropertyOptional({ example: 0, description: 'Discount in integer VND' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    type: [CustomInvoiceItemDto],
    description: 'Additional custom line items (parking, cleaning, repair, etc.)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomInvoiceItemDto)
  additionalItems?: CustomInvoiceItemDto[];

  @ApiPropertyOptional({ example: 'Tien phong thang 10' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    type: [CustomInvoiceItemDto],
    description: 'Cập nhật danh sách mục thu bổ sung',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomInvoiceItemDto)
  items?: CustomInvoiceItemDto[];

  @ApiPropertyOptional({ example: 50000, description: 'Giảm giá (VND)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'Hạn thanh toán mới' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchIssueInvoicesDto {
  @ApiPropertyOptional({ description: 'Danh sách ID hóa đơn cần phát hành' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invoiceIds?: string[];

  @ApiPropertyOptional({ description: 'Phát hành toàn bộ theo Khu trọ' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Kỳ tính phí YYYY-MM' })
  @IsOptional()
  @IsString()
  billingPeriodId?: string;
}

export class CancelInvoiceDto {
  @ApiProperty({ example: 'Nhap sai chi so dong ho dien nuoc', description: 'Mandatory reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class QueryInvoicesDto {
  @ApiPropertyOptional({ enum: InvoiceStatus, description: 'Lọc theo trạng thái' })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Kỳ tính phí YYYY-MM' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ description: 'Kỳ tính phí YYYY-MM (alias)' })
  @IsOptional()
  @IsString()
  billingPeriodId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo Khu trọ' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo Phòng' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo Hợp đồng' })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Chỉ lấy hóa đơn quá hạn', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class QueryDebtsDto {
  @ApiPropertyOptional({ description: 'Lọc theo Khu trọ' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo Phòng' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo Khách thuê' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
