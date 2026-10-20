import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import { Contract, ContractDocument } from './schemas/contract.schema';

@Injectable()
export class ContractRepository extends TenantScopedRepository<ContractDocument> {
  constructor(
    @InjectModel(Contract.name)
    contractModel: Model<ContractDocument>,
  ) {
    super(contractModel);
  }

  async findActiveContractByRoom(
    organizationId: string,
    roomId: string,
  ): Promise<ContractDocument | null> {
    return this.findOne(organizationId, { roomId, isCurrent: true });
  }

  async findActiveContractsByTenant(
    organizationId: string,
    tenantId: string,
  ): Promise<ContractDocument[]> {
    return this.find(organizationId, {
      $or: [{ primaryTenantId: tenantId }, { tenantId }],
      isCurrent: true,
    });
  }
}
