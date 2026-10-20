import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InvoiceRepository } from '../modules/invoice/invoice.repository';
import { NotificationService } from '../modules/notification/notification.service';
import { InvoiceStatus, NotificationType } from '../common/constants';

@Injectable()
export class InvoiceDueSoonJob {
  private readonly logger = new Logger(InvoiceDueSoonJob.name);

  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly notificationService: NotificationService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Cron 08:00: Scans invoices due in 3 days or 1 day
   * IDEMPOTENT: Running multiple times checks previous notifications to prevent duplicate alerts.
   */
  async execute(
    organizationId?: string,
  ): Promise<{ processed: number; notified: number; skipped: number }> {
    const now = new Date();
    const d3End = new Date(now.getTime() + 4 * 86400000);

    const filter: any = {
      status: { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
      remainingAmount: { $gt: 0 },
      dueDate: { $gte: now, $lte: d3End },
    };

    const invoices = organizationId
      ? await this.invoiceRepo.find(organizationId, filter)
      : await this.invoiceRepo.getModel().find(filter).exec();

    let notifiedCount = 0;
    let skippedCount = 0;

    for (const inv of invoices) {
      const daysDiff = Math.ceil(
        (new Date(inv.dueDate).getTime() - now.getTime()) / 86400000,
      );
      let milestone = '';
      if (daysDiff >= 2 && daysDiff <= 3) {
        milestone = '3d';
      } else if (daysDiff <= 1) {
        milestone = '1d';
      }

      if (!milestone) continue;

      // Idempotency check: has milestone notification already been dispatched?
      const existingNotif = await this.connection
        .collection('notifications')
        .findOne({
          organizationId: inv.organizationId,
          type: NotificationType.INVOICE_DUE_SOON,
          'data.invoiceId': inv._id.toString(),
          'data.milestone': milestone,
        });

      if (existingNotif) {
        skippedCount++;
        continue;
      }

      if (inv.tenantId) {
        await this.notificationService.dispatchNotification({
          organizationId: inv.organizationId,
          userId: inv.tenantId.toString(),
          type: NotificationType.INVOICE_DUE_SOON,
          title: `Hóa đơn sắp đến hạn: ${inv.invoiceNo || inv.invoiceNumber}`,
          body: `Hóa đơn ${inv.invoiceNo || inv.invoiceNumber} còn ${daysDiff} ngày là đến hạn thanh toán. Số tiền: ${inv.remainingAmount?.toLocaleString('vi-VN')} đ`,
          data: {
            invoiceId: inv._id.toString(),
            invoiceNo: inv.invoiceNo || inv.invoiceNumber,
            milestone,
            amount: inv.remainingAmount,
          },
        });
        notifiedCount++;
      }
    }

    this.logger.log(
      `[JOB invoice.due-soon] Completed. Notified: ${notifiedCount}, Skipped: ${skippedCount}`,
    );
    return { processed: invoices.length, notified: notifiedCount, skipped: skippedCount };
  }
}
