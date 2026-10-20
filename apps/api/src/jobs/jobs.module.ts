import { Module } from '@nestjs/common';
import { InvoiceSchedulerJob } from './invoice-scheduler.job';
import { InvoiceMarkOverdueJob } from './invoice-mark-overdue.job';
import { InvoiceDueSoonJob } from './invoice-due-soon.job';
import { ContractExpiryCheckJob } from './contract-expiry-check.job';
import { InvoicePdfJob } from './invoice-pdf.job';
import { ReportExportJob } from './report-export.job';
import { InvoiceModule } from '../modules/invoice/invoice.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { ContractModule } from '../modules/contract/contract.module';
import { InfraModule } from '../infra/infra.module';

@Module({
  imports: [
    InvoiceModule,
    NotificationModule,
    ContractModule,
    InfraModule,
  ],
  providers: [
    InvoiceSchedulerJob,
    InvoiceMarkOverdueJob,
    InvoiceDueSoonJob,
    ContractExpiryCheckJob,
    InvoicePdfJob,
    ReportExportJob,
  ],
  exports: [
    InvoiceSchedulerJob,
    InvoiceMarkOverdueJob,
    InvoiceDueSoonJob,
    ContractExpiryCheckJob,
    InvoicePdfJob,
    ReportExportJob,
  ],
})
export class JobsModule {}
