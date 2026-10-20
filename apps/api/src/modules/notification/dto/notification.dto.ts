import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryNotificationsDto {
  @ApiPropertyOptional({ description: 'Notification ID cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, description: 'Number of items to fetch' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter only unread notifications' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unread?: boolean;
}

export enum BroadcastTargetType {
  ALL = 'ALL',
  PROPERTY = 'PROPERTY',
  ROOM = 'ROOM',
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Thông báo cắt điện bảo trì tòa nhà' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Điện lực sẽ cắt điện từ 8h00 đến 12h00 ngày 15/10 để bảo dưỡng trạm biến áp.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    enum: BroadcastTargetType,
    example: BroadcastTargetType.ALL,
    description: 'Target audience: ALL, PROPERTY, or ROOM',
  })
  @IsEnum(BroadcastTargetType)
  @IsNotEmpty()
  targetType: BroadcastTargetType;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109ca',
    description: 'Property ID if targetType is PROPERTY',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109cb',
    description: 'Room ID if targetType is ROOM',
  })
  @IsOptional()
  @IsString()
  roomId?: string;
}
