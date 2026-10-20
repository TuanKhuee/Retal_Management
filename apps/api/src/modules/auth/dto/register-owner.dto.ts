import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterOwnerDto {
  @ApiProperty({ example: 'owner@example.com', description: 'Owner email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 6, description: 'User password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '0901234567', description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Nha Tro Binh An', description: 'Organization / Rental Brand Name' })
  @IsString()
  @IsNotEmpty()
  organizationName: string;
}
