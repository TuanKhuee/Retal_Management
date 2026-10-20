import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomStatus } from '../../../common/constants';
import { PaginationQueryDto } from '../../../common/utils/pagination.util';

export class CreateRoomDto {
  @ApiProperty({ example: 'PROP123...', description: 'Property ID' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ example: 'A101', description: 'Room code identifier' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  floor?: number = 1;

  @ApiPropertyOptional({ example: 25, description: 'Area in square meters' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  area?: number = 20;

  @ApiProperty({ example: 3500000, description: 'Monthly base rent (Integer VND)' })
  @IsInt()
  @Min(0)
  baseRent: number;

  @ApiPropertyOptional({ enum: RoomStatus, default: RoomStatus.VACANT })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus = RoomStatus.VACANT;

  @ApiPropertyOptional({ example: 3500000, description: 'Deposit amount in VND' })
  @IsOptional()
  @IsInt()
  @Min(0)
  deposit?: number;

  @ApiPropertyOptional({ type: [String], description: 'Room amenities' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  // Compatibility aliases
  @ApiPropertyOptional()
  @IsOptional()
  roomNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  basePrice?: number;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'A101' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  area?: number;

  @ApiPropertyOptional({ example: 3800000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  baseRent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  deposit?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  // Compatibility aliases
  @ApiPropertyOptional()
  @IsOptional()
  roomNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  basePrice?: number;
}

export class BulkCreateRoomsDto {
  @ApiProperty({ example: 'PROP123...', description: 'Property ID' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({
    example: 'A101-A120',
    description: 'Pattern for room codes generation (e.g., A101-A120 or 101-115)',
  })
  @IsString()
  @Matches(/^[A-Za-z]*\d+-[A-Za-z]*\d+$/, {
    message: 'pattern must be in the format of PREFIX<NUM>-PREFIX<NUM>, e.g. A101-A120 or 101-115',
  })
  pattern: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  floor?: number = 1;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  area?: number = 20;

  @ApiProperty({ example: 3500000, description: 'Monthly base rent in VND' })
  @IsInt()
  @Min(0)
  baseRent: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  deposit?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

export class ChangeRoomStatusDto {
  @ApiProperty({
    enum: RoomStatus,
    example: RoomStatus.MAINTENANCE,
    description: 'Target room status (VACANT, MAINTENANCE, RESERVED)',
  })
  @IsEnum(RoomStatus)
  status: RoomStatus;

  @ApiPropertyOptional({ example: 'Sua chua dieu hoa hu' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RoomQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Property ID' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ enum: RoomStatus, description: 'Filter by Room Status' })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'Filter by Floor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ description: 'Search room code (q)' })
  @IsOptional()
  @IsString()
  q?: string;
}
