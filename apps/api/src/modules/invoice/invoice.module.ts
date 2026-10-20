import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { DebtController } from './debt.controller';
import { ContractModule } from '../contract/contract.module';
import { PropertyModule } from '../property/property.module';
import { MeterReadingModule } from '../meter-reading/meter-reading.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),
    ContractModule,
    PropertyModule,
    MeterReadingModule,
    OrganizationModule,
    AuthModule,
    TenantModule,
  ],
  controllers: [InvoiceController, DebtController],
  providers: [InvoiceRepository, InvoiceService],
  exports: [InvoiceRepository, InvoiceService],
})
export class InvoiceModule {}
