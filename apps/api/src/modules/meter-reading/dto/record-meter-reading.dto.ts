import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';

export class RecordMeterReadingDto {
  @ApiProperty({ example: 'ROOM123...', description: 'Room ID' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: '2026-10', description: 'Billing period in format YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'billingPeriod must be in YYYY-MM format' })
  billingPeriod: string;

  @ApiProperty({ example: 1200, description: 'Previous electricity meter reading' })
  @IsInt()
  @Min(0)
  electricityOld: number;

  @ApiProperty({ example: 1350, description: 'Current electricity meter reading' })
  @IsInt()
  @Min(0)
  electricityNew: number;

  @ApiProperty({ example: 50, description: 'Previous water meter reading' })
  @IsInt()
  @Min(0)
  waterOld: number;

  @ApiProperty({ example: 62, description: 'Current water meter reading' })
  @IsInt()
  @Min(0)
  waterNew: number;
}
