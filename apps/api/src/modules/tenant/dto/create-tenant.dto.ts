import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/utils/pagination.util';

export class EmergencyContactDto {
  @ApiProperty({ example: 'Nguyen Van B', description: 'Contact person name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '0987654321', description: 'Contact phone' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Bo', description: 'Relationship (Bo, Me, Ban, etc.)' })
  @IsString()
  @IsNotEmpty()
  relationship: string;
}

export class IdCardInputDto {
  @ApiProperty({ example: '001200001234', description: '12-digit Vietnam CCCD' })
  @IsString()
  @Length(9, 12)
  number: string;

  @ApiPropertyOptional({ example: '2022-01-01' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ example: 'Cuc Canh sat QLHC ve TTXH' })
  @IsOptional()
  @IsString()
  issuePlace?: string;
}

export class CreateTenantDto {
  @ApiProperty({ example: 'Tran Van Bao', description: 'Tenant full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '0912345678', description: 'Primary phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'bao.tran@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    type: IdCardInputDto,
    description: 'ID card details (auto-encrypted with AES-256-GCM)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdCardInputDto)
  idCard?: IdCardInputDto;

  // Compatibility field
  @ApiPropertyOptional({ example: '001200001234' })
  @IsOptional()
  @IsString()
  cccdNumber?: string;

  @ApiPropertyOptional({ example: '1998-05-15', description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Ha Noi, Viet Nam', description: 'Permanent address' })
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @ApiPropertyOptional({ type: EmergencyContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Tran Van Bao' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'bao.tran@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ type: IdCardInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdCardInputDto)
  idCard?: IdCardInputDto;

  // Compatibility field
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cccdNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @ApiPropertyOptional({ type: EmergencyContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}

export class TenantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by full name, phone number or last 4 digits of CCCD' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateTenantAccountDto {
  @ApiProperty({ example: 'Nguyễn Văn Nam', description: 'Họ và tên người thuê' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '0987654321', description: 'Số điện thoại đăng nhập' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Khach123@', description: 'Mật khẩu khởi tạo' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 50)
  password: string;

  @ApiPropertyOptional({ example: 'tenant@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '001200001234' })
  @IsOptional()
  @IsString()
  cccdNumber?: string;

  @ApiPropertyOptional({ example: '6ac908c8f56e1d8016a8da23' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ example: 'Phòng 101' })
  @IsOptional()
  @IsString()
  roomName?: string;
}
