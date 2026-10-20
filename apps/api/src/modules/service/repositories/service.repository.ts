import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';
import { Service, ServiceDocument } from '../schemas/service.schema';

@Injectable()
export class ServiceRepository extends TenantScopedRepository<ServiceDocument> {
  constructor(
    @InjectModel(Service.name)
    serviceModel: Model<ServiceDocument>,
  ) {
    super(serviceModel);
  }

  async findByCode(organizationId: string, code: string): Promise<ServiceDocument | null> {
    return this.findOne(organizationId, { code: code.toUpperCase().trim() });
  }
}
