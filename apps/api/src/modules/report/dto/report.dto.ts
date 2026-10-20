import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReportFilterDto {
  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca', description: 'Filter by Property ID' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: '2026-10', description: 'Billing period (YYYY-MM)' })
  @IsOptional()
  @IsString()
  period?: string;
}

export enum ReportExportFormat {
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

export class ExportReportDto {
  @ApiPropertyOptional({
    enum: ReportExportFormat,
    default: ReportExportFormat.EXCEL,
    description: 'Export file format',
  })
  @IsOptional()
  @IsEnum(ReportExportFormat)
  format?: ReportExportFormat;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @IsString()
  period?: string;
}
