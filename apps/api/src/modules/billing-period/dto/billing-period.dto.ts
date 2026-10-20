import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { BillingPeriodStatus } from '../../../common/constants';

export class CreateBillingPeriodDto {
  @ApiProperty({ description: 'ID Bất động sản / Khu trọ' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ description: 'Kỳ tính phí dạng YYYY-MM', example: '2026-10' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'period must be in YYYY-MM format' })
  period: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu tính phí (mặc định ngày 1 của tháng)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc tính phí (mặc định ngày cuối của tháng)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseBillingPeriodDto {
  @ApiPropertyOptional({ description: 'Ghi chú khi đóng kỳ' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateInvoicesDto {
  @ApiPropertyOptional({ description: 'Kích thước lô xử lý chia nhỏ (mặc định 50)', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  batchSize?: number;
}

export class QueryBillingPeriodsDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID Bất động sản' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ enum: BillingPeriodStatus, description: 'Lọc theo trạng thái kỳ' })
  @IsOptional()
  @IsEnum(BillingPeriodStatus)
  status?: BillingPeriodStatus;
}
