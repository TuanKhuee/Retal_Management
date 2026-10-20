import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import { Attachment, AttachmentDocument } from './schemas/attachment.schema';

@Injectable()
export class AttachmentRepository extends TenantScopedRepository<AttachmentDocument> {
  constructor(
    @InjectModel(Attachment.name)
    attachmentModel: Model<AttachmentDocument>,
  ) {
    super(attachmentModel);
  }

  async findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<AttachmentDocument[]> {
    return this.find(organizationId, { entityType, entityId });
  }

  async findByIds(
    organizationId: string,
    ids: string[],
  ): Promise<AttachmentDocument[]> {
    return this.find(organizationId, { _id: { $in: ids } });
  }
}
