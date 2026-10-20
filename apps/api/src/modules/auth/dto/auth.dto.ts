import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'owner@example.com', description: 'Owner email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'SecureP@ssw0rd123!', minLength: 6, description: 'Account password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Owner full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'Nha Tro Binh An', description: 'Organization/Brand name' })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiPropertyOptional({ example: 'device-uuid-123', description: 'Client device unique ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'owner@example.com',
    description: 'Email address or Phone number',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'SecureP@ssw0rd123!', description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'device-uuid-123', description: 'Client device unique ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOi...', description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiPropertyOptional({ example: 'device-uuid-123' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ssw0rd123!' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'NewSecureP@ssw0rd456!', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'owner@example.com', description: 'Email address or Phone number' })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '0912345678', description: 'Email address or Phone number' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '842910', description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 10)
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '842910', description: 'Password reset token or OTP received' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecureP@ssw0rd789!', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class AcceptInviteDto {
  @ApiProperty({ example: 'inv-tok-999...', description: 'Invitation token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'TenantP@ssw0rd123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'Nguyen Van B' })
  @IsOptional()
  @IsString()
  fullName?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class RegisterDeviceDto {
  @ApiProperty({ example: 'fcm-registration-token-xyz...' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiProperty({ example: 'device-uuid-123' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ enum: ['ios', 'android', 'web'], example: 'android' })
  @IsIn(['ios', 'android', 'web'])
  platform: string;
}

export class UpdateOrgSettingsDto {
  @ApiPropertyOptional({ example: 5, description: 'Days before invoice becomes overdue' })
  @IsOptional()
  @IsInt()
  @Min(1)
  invoiceDueDays?: number;

  @ApiPropertyOptional({ example: 30, description: 'Billing closing cycle day of month' })
  @IsOptional()
  @IsInt()
  @Min(1)
  billingClosingDay?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Rounding step in VND' })
  @IsOptional()
  @IsInt()
  @Min(1)
  roundingStep?: number;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
