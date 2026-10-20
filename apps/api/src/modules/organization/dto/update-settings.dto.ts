import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({
    description: 'VND Rounding step (e.g. 1000 VND, 500 VND)',
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  roundingStep?: number;

  @ApiPropertyOptional({
    description: 'Number of days until invoice is due after issued',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  invoiceDueDays?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'VND',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Late fee percentage per month',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lateFeePercentage?: number;
}
