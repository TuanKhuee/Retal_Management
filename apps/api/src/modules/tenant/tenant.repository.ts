import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import { Tenant, TenantDocument } from './schemas/tenant.schema';

@Injectable()
export class TenantRepository extends TenantScopedRepository<TenantDocument> {
  constructor(
    @InjectModel(Tenant.name)
    tenantModel: Model<TenantDocument>,
  ) {
    super(tenantModel);
  }

  async findByPhone(
    organizationId: string,
    phone: string,
  ): Promise<TenantDocument | null> {
    return this.findOne(organizationId, { phone });
  }
}
