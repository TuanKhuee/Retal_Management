import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';

@Injectable()
export class InvoiceRepository extends TenantScopedRepository<InvoiceDocument> {
  constructor(
    @InjectModel(Invoice.name)
    invoiceModel: Model<InvoiceDocument>,
  ) {
    super(invoiceModel);
  }

  async findActiveByContractAndPeriod(
    organizationId: string,
    contractId: string,
    billingPeriodId: string,
  ): Promise<InvoiceDocument | null> {
    return this.findOne(organizationId, {
      contractId,
      billingPeriodId,
      active: true,
    });
  }

  async findUnpaidInvoices(
    organizationId: string,
    filter: any = {},
  ): Promise<InvoiceDocument[]> {
    return this.find(organizationId, {
      ...filter,
      active: true,
      remainingAmount: { $gt: 0 },
      status: {
        $in: [
          'ISSUED',
          'PARTIALLY_PAID',
          'OVERDUE',
        ],
      },
    });
  }
}
