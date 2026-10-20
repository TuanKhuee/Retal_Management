import { Injectable, Logger } from '@nestjs/common';
import { InvoiceRepository } from '../modules/invoice/invoice.repository';
import { NotificationService } from '../modules/notification/notification.service';
import { InvoiceStatus, NotificationType } from '../common/constants';

@Injectable()
export class InvoiceMarkOverdueJob {
  private readonly logger = new Logger(InvoiceMarkOverdueJob.name);

  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Cron 00:10: Scans and marks overdue invoices whose dueDate < now and remainingAmount > 0
   * IDEMPOTENT: Running multiple times produces the exact same state without duplicate transitions or notifications.
   */
  async execute(organizationId?: string): Promise<{ processed: number; updated: number }> {
    const now = new Date();
    const filter: any = {
      status: { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
      dueDate: { $lt: now },
      remainingAmount: { $gt: 0 },
    };

    const overdueInvoices = organizationId
      ? await this.invoiceRepo.find(organizationId, filter)
      : await this.invoiceRepo.getModel().find(filter).exec();

    let updatedCount = 0;
    for (const inv of overdueInvoices) {
      inv.status = InvoiceStatus.OVERDUE;
      await inv.save();
      updatedCount++;

      // Dispatch notification to tenant
      if (inv.tenantId) {
        await this.notificationService.dispatchNotification({
          organizationId: inv.organizationId,
          userId: inv.tenantId.toString(),
          type: NotificationType.INVOICE_OVERDUE,
          title: `Hóa đơn quá hạn: ${inv.invoiceNo || inv.invoiceNumber}`,
          body: `Hóa đơn ${inv.invoiceNo || inv.invoiceNumber} đã quá hạn thanh toán ngày ${new Date(inv.dueDate).toLocaleDateString('vi-VN')}. Số tiền còn lại: ${inv.remainingAmount?.toLocaleString('vi-VN')} đ`,
          data: {
            invoiceId: inv._id.toString(),
            invoiceNo: inv.invoiceNo || inv.invoiceNumber,
            amount: inv.remainingAmount,
          },
        });
      }
    }

    this.logger.log(
      `[JOB invoice.mark-overdue] Completed. Invoices marked OVERDUE: ${updatedCount}`,
    );
    return { processed: overdueInvoices.length, updated: updatedCount };
  }
}
