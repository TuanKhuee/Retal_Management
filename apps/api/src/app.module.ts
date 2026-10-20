import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { InfraModule } from './infra/infra.module';
import { HealthModule } from './infra/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { PropertyModule } from './modules/property/property.module';
import { ServiceModule } from './modules/service/service.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { ContractModule } from './modules/contract/contract.module';
import { MeterReadingModule } from './modules/meter-reading/meter-reading.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { BillingPeriodModule } from './modules/billing-period/billing-period.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { StorageApiModule } from './modules/storage/storage-api.module';
import { AttachmentModule } from './modules/attachment/attachment.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReportModule } from './modules/report/report.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    InfraModule,
    HealthModule,
    AuditLogModule,
    OrganizationModule,
    AuthModule,
    TenantModule,
    PropertyModule,
    ServiceModule,
    ContractModule,
    MeterReadingModule,
    InvoiceModule,
    BillingPeriodModule,
    PaymentModule,
    StorageApiModule,
    AttachmentModule,
    MaintenanceModule,
    NotificationModule,
    ReportModule,
    JobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
