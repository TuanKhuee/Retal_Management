import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../../common/constants';

export class CreatePaymentDto {
  @ApiProperty({ example: 'INV123...', description: 'Invoice ID to settle' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({ example: 4250000, description: 'Amount paid in integer VND' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
    description: 'Payment method (CASH | BANK_TRANSFER)',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: 'FT2394829348',
    description: 'Bank transfer reference number or transaction code',
  })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional({ example: 'Khach chuyen khoan Vietcombank' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePaymentClaimDto {
  @ApiProperty({ example: 4250000, description: 'Số tiền khách đã chuyển khoản (VND)' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    default: PaymentMethod.BANK_TRANSFER,
    description: 'Hình thức thanh toán',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'FT2394829348', description: 'Mã giao dịch ngân hàng' })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional({ description: 'ID ảnh chụp biên lai chuyển tiền' })
  @IsOptional()
  @IsString()
  proofAttachmentId?: string;

  @ApiPropertyOptional({ example: 'Đã chuyển khoản qua app MB Bank' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectPaymentDto {
  @ApiProperty({ example: 'Không tìm thấy tiền vào tài khoản ngân hàng', description: 'Lý do từ chối' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class VoidPaymentDto {
  @ApiProperty({ example: 'Ghi nhầm phiếu thu', description: 'Lý do hủy thanh toán (bắt buộc)' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
