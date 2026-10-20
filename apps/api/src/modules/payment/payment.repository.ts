import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import { Payment, PaymentDocument } from './schemas/payment.schema';

@Injectable()
export class PaymentRepository extends TenantScopedRepository<PaymentDocument> {
  constructor(
    @InjectModel(Payment.name)
    paymentModel: Model<PaymentDocument>,
  ) {
    super(paymentModel);
  }

  async findByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<PaymentDocument | null> {
    return this.findOne(organizationId, { idempotencyKey });
  }

  async findByInvoice(
    organizationId: string,
    invoiceId: string,
  ): Promise<PaymentDocument[]> {
    return this.find(organizationId, { invoiceId }, { sort: { paymentDate: -1 } });
  }

  async findByMethodAndReference(
    organizationId: string,
    paymentMethod: string,
    transactionReference: string,
  ): Promise<PaymentDocument | null> {
    return this.findOne(organizationId, {
      paymentMethod,
      transactionReference,
      active: true,
    });
  }
}
