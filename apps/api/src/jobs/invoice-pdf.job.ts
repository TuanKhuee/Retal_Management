import { Injectable, Logger } from '@nestjs/common';
import { InvoiceService } from '../modules/invoice/invoice.service';

@Injectable()
export class InvoicePdfJob {
  private readonly logger = new Logger(InvoicePdfJob.name);

  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * Job invoice.pdf: Generates / caches printable PDF after invoice is ISSUED
   * IDEMPOTENT: Re-running for same invoice produces same document.
   */
  async execute(organizationId: string, invoiceId: string) {
    this.logger.log(`[JOB invoice.pdf] Generating PDF for invoice ${invoiceId}`);
    const pdfData = await this.invoiceService.getInvoicePdf(
      {
        userId: 'system',
        email: 'system@rental.vn',
        organizationId,
        role: 'OWNER' as any,
        permissions: [],
      },
      invoiceId,
    );

    return {
      success: true,
      invoiceId,
      renderedAt: new Date(),
      contentLength: pdfData.html.length,
    };
  }
}
