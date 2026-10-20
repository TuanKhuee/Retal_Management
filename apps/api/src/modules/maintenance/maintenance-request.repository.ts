import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import {
  MaintenanceRequest,
  MaintenanceRequestDocument,
} from './schemas/maintenance-request.schema';

@Injectable()
export class MaintenanceRequestRepository extends TenantScopedRepository<MaintenanceRequestDocument> {
  constructor(
    @InjectModel(MaintenanceRequest.name)
    maintenanceModel: Model<MaintenanceRequestDocument>,
  ) {
    super(maintenanceModel);
  }

  async findByRequestNo(
    organizationId: string,
    requestNo: string,
  ): Promise<MaintenanceRequestDocument | null> {
    return this.findOne(organizationId, { requestNo });
  }

  async findWithFilters(
    organizationId: string,
    filter: FilterQuery<MaintenanceRequestDocument>,
    sort: Record<string, any> = { createdAt: -1 },
  ): Promise<MaintenanceRequestDocument[]> {
    return this.find(organizationId, filter, { sort });
  }
}
