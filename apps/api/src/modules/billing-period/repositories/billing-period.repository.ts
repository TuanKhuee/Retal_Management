import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';
import { BillingPeriod, BillingPeriodDocument } from '../schemas/billing-period.schema';

@Injectable()
export class BillingPeriodRepository extends TenantScopedRepository<BillingPeriodDocument> {
  constructor(
    @InjectModel(BillingPeriod.name)
    model: Model<BillingPeriodDocument>,
  ) {
    super(model);
  }

  async findByPropertyAndPeriod(
    organizationId: string,
    propertyId: string,
    period: string,
  ): Promise<BillingPeriodDocument | null> {
    return this.findOne(organizationId, { propertyId, period });
  }
}
