import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BillingPeriod,
  BillingPeriodSchema,
} from './schemas/billing-period.schema';
import { BillingPeriodRepository } from './repositories/billing-period.repository';
import { BillingPeriodService } from './billing-period.service';
import { BillingPeriodController } from './billing-period.controller';
import { ContractModule } from '../contract/contract.module';
import { PropertyModule } from '../property/property.module';
import { ServiceModule } from '../service/service.module';
import { MeterReadingModule } from '../meter-reading/meter-reading.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BillingPeriod.name, schema: BillingPeriodSchema },
    ]),
    ContractModule,
    PropertyModule,
    ServiceModule,
    MeterReadingModule,
    InvoiceModule,
    AuthModule,
    OrganizationModule,
  ],
  controllers: [BillingPeriodController],
  providers: [BillingPeriodRepository, BillingPeriodService],
  exports: [BillingPeriodRepository, BillingPeriodService],
})
export class BillingPeriodModule {}
