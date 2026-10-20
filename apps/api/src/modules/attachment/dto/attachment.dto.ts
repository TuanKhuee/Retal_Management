import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class PresignAttachmentDto {
  @ApiProperty({ description: 'File name including extension', example: 'water_leak.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ description: 'MIME content type', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes', example: 1048576 })
  @IsNumber()
  @IsPositive()
  size: number;

  @ApiPropertyOptional({
    description: 'Entity type related to this attachment',
    example: 'MAINTENANCE_REQUEST',
    enum: ['MAINTENANCE_REQUEST', 'INVOICE', 'PAYMENT', 'CONTRACT', 'METER_READING'],
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Entity ID related to this attachment',
    example: '60d0fe4f5311236168a109ca',
  })
  @IsOptional()
  @IsString()
  entityId?: string;
}

export class PresignAttachmentResponseDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  attachmentId: string;

  @ApiProperty({ example: 'https://s3.amazonaws.com/...' })
  uploadUrl: string;

  @ApiProperty({ example: 'org-id/attachments/water_leak.jpg' })
  fileKey: string;
}

export class AttachmentUrlResponseDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  attachmentId: string;

  @ApiProperty({ example: 'water_leak.jpg' })
  filename: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ example: 1048576 })
  size: number;

  @ApiProperty({ example: 'https://s3.amazonaws.com/...' })
  downloadUrl: string;

  @ApiProperty({ example: 'https://s3.amazonaws.com/...' })
  url: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}
