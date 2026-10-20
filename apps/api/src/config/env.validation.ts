import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  MONGODB_URI: string =
    'mongodb://localhost:27017/rental_management?replicaSet=rs0';

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @MinLength(16)
  @IsOptional()
  JWT_SECRET: string =
    'super-secret-jwt-key-for-rental-management-system-32chars';

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m'; // 15 minutes as required

  @IsString()
  @MinLength(16)
  @IsOptional()
  JWT_REFRESH_SECRET: string =
    'super-secret-refresh-key-for-rental-management-system-32';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '30d'; // 30 days as required

  @IsString()
  @MinLength(32)
  @IsOptional()
  ENCRYPTION_KEY: string =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL: number = 60000; // 60 seconds

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT: number = 100; // 100 requests per 60s
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}
