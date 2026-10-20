import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BankAccountDto {
  @ApiProperty({ example: 'VCB', description: 'Bank code (VCB, TCB, MB, etc.)' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ example: '1029384756', description: 'Bank account number' })
  @IsString()
  @IsNotEmpty()
  accountNo: string;

  @ApiProperty({ example: 'NGUYEN VAN A', description: 'Account holder name' })
  @IsString()
  @IsNotEmpty()
  accountName: string;
}

export class BillingConfigDto {
  @ApiPropertyOptional({ example: 3500, description: 'Electricity price per kWh (VND)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  electricityUnitPrice?: number = 3500;

  @ApiPropertyOptional({ example: 25000, description: 'Water price per m3 (VND)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  waterUnitPrice?: number = 25000;

  @ApiPropertyOptional({ example: 100000, description: 'Internet fee per room/month (VND)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  internetUnitPrice?: number = 100000;

  @ApiPropertyOptional({ example: 50000, description: 'Garbage service fee per month (VND)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  garbageUnitPrice?: number = 50000;
}

export class CreatePropertyDto {
  @ApiProperty({ example: 'Nha Tro Binh An - Co So 1', description: 'Property / Building name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '123 Nguyen Trai, Thanh Xuan, Ha Noi', description: 'Address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ type: BankAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bankAccount?: BankAccountDto;

  @ApiPropertyOptional({ type: BillingConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingConfigDto)
  billingConfig?: BillingConfigDto;

  // Backward compatibility fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  electricityUnitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  waterUnitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  internetUnitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  garbageUnitPrice?: number;
}

export class UpdatePropertyDto {
  @ApiPropertyOptional({ example: 'Nha Tro Binh An - Co So 1' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '123 Nguyen Trai, Thanh Xuan, Ha Noi' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ type: BankAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bankAccount?: BankAccountDto;

  @ApiPropertyOptional({ type: BillingConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingConfigDto)
  billingConfig?: BillingConfigDto;
}
