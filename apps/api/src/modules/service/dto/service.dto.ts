import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ServiceCalcMethod, ServiceType } from '../../../common/constants';
import { PaginationQueryDto } from '../../../common/utils/pagination.util';

export class ServiceScopeDto {
  @ApiPropertyOptional({
    description: 'Danh sách ID bất động sản áp dụng. Nếu rỗng nghĩa là áp dụng toàn hệ thống.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyIds?: string[];
}

export class CreateServiceDto {
  @ApiProperty({ description: 'Mã dịch vụ duy nhất (vd: ELEC, WATER, PARKING, WIFI)', example: 'ELEC' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Tên dịch vụ hiển thị', example: 'Điện sinh hoạt' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Phân loại dịch vụ', example: ServiceType.UTILITY })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Đơn vị tính (kWh, m3, tháng, người, xe)', example: 'kWh' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    description: 'Phương thức tính: METER, PER_PERSON, PER_ROOM, FIXED, FREE',
    enum: ServiceCalcMethod,
    example: ServiceCalcMethod.METER,
  })
  @IsEnum(ServiceCalcMethod)
  calcMethod: ServiceCalcMethod;

  @ApiProperty({ description: 'Đơn giá hiện hành (VND)', example: 3500 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Phạm vi áp dụng (theo property)' })
  @IsOptional()
  scope?: ServiceScopeDto;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu áp dụng đơn giá (mặc định là hiện tại)' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ description: 'Tên dịch vụ hiển thị' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phân loại dịch vụ' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Đơn vị tính' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ enum: ServiceCalcMethod })
  @IsOptional()
  @IsEnum(ServiceCalcMethod)
  calcMethod?: ServiceCalcMethod;

  @ApiPropertyOptional({
    description: 'Đơn giá mới. Khi thay đổi sẽ tự động ghi vào priceHistory và KHÔNG ảnh hưởng hóa đơn cũ.',
    example: 3800,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Phạm vi áp dụng' })
  @IsOptional()
  scope?: ServiceScopeDto;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu áp dụng đơn giá mới' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

export class ServiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo Property ID' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo loại dịch vụ' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ServiceCalcMethod })
  @IsOptional()
  @IsEnum(ServiceCalcMethod)
  calcMethod?: ServiceCalcMethod;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã hoặc tên' })
  @IsOptional()
  @IsString()
  q?: string;
}
