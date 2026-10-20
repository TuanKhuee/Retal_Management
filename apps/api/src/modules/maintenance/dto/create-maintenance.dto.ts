import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  MaintenancePriority,
  MaintenanceStatus,
} from '../../../common/constants';

export class CreateMaintenanceRequestDto {
  @ApiProperty({ example: 'PLUMBING', description: 'Category of maintenance issue' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Vòi nước bồn rửa mặt bị rò rỉ', description: 'Short title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Vòi nước bị rỉ liên tục từ tối qua, nước chảy nhiều ở chân vòi.',
    description: 'Detailed description of the problem',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    enum: MaintenancePriority,
    default: MaintenancePriority.NORMAL,
    description: 'Priority level',
  })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({
    type: [String],
    description: 'List of uploaded attachment IDs illustrating the problem',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class QueryMaintenanceRequestsDto {
  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ enum: MaintenancePriority })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;
}
