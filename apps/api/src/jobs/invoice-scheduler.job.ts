import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../infra/queue/queue.service';
import { InvoiceRepository } from '../modules/invoice/invoice.repository';
import { InvoiceStatus } from '../common/constants';

@Injectable()
export class InvoiceSchedulerJob {
  private readonly logger = new Logger(InvoiceSchedulerJob.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly invoiceRepo: InvoiceRepository,
  ) {}

  /**
   * Scans and marks overdue invoices whose dueDate has passed and remainingAmount > 0
   */
  async checkOverdueInvoices(organizationId: string) {
    const now = new Date();
    const overdueInvoices = await this.invoiceRepo.find(organizationId, {
      status: InvoiceStatus.ISSUED,
      dueDate: { $lt: now },
      remainingAmount: { $gt: 0 },
    });

    for (const inv of overdueInvoices) {
      await this.invoiceRepo.updateOne(
        organizationId,
        { _id: inv._id } as any,
        { $set: { status: InvoiceStatus.OVERDUE } },
      );
      this.logger.log(`Marked invoice #${inv.invoiceNumber} as OVERDUE`);
    }

    return { processed: overdueInvoices.length };
  }
}
