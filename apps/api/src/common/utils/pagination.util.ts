import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ default: '-createdAt', description: 'Sort field (prefix with - for DESC)' })
  @IsOptional()
  @IsString()
  sort?: string = '-createdAt';
}

export class CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Cursor ID for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorPaginationMeta {
  limit: number;
  nextCursor?: string | null;
  hasNext: boolean;
}

export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
