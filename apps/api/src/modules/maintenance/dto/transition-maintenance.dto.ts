import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceStatus } from '../../../common/constants';

export class MaintenanceCostDto {
  @ApiProperty({ example: 150000, description: 'Cost amount in VND' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    example: 'LANDLORD',
    enum: ['LANDLORD', 'TENANT', 'SHARED'],
    description: 'Who pays the maintenance cost',
  })
  @IsString()
  @IsNotEmpty()
  paidBy: string;
}

export class TransitionMaintenanceDto {
  @ApiProperty({
    enum: [
      MaintenanceStatus.ACCEPTED,
      MaintenanceStatus.IN_PROGRESS,
      MaintenanceStatus.RESOLVED,
      MaintenanceStatus.REJECTED,
    ],
    description: 'Target status to transition to',
  })
  @IsEnum(MaintenanceStatus)
  @IsNotEmpty()
  to: MaintenanceStatus;

  @ApiPropertyOptional({ example: 'Đã hẹn thợ nước đến sửa chiều nay' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ type: MaintenanceCostDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaintenanceCostDto)
  cost?: MaintenanceCostDto;
}

export class TenantActionDto {
  @ApiPropertyOptional({ example: 'Đã kiểm tra vòi nước hoạt động tốt' })
  @IsOptional()
  @IsString()
  note?: string;
}
