import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceMessageDto {
  @ApiProperty({ example: 'Thợ nước vừa báo sẽ tới lúc 14:00 ạ' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Attached files/photos for this message',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class QueryMaintenanceMessagesDto {
  @ApiPropertyOptional({ description: 'Message ID cursor for pagination' })
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
}
