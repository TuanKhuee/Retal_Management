import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditLogRepository extends TenantScopedRepository<AuditLogDocument> {
  constructor(
    @InjectModel(AuditLog.name)
    auditLogModel: Model<AuditLogDocument>,
  ) {
    super(auditLogModel);
  }

  async findAuditLogsCursor(
    organizationId: string,
    filter: FilterQuery<AuditLogDocument>,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ items: AuditLogDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const scoped: FilterQuery<AuditLogDocument> = {
      ...filter,
      organizationId,
    };

    if (cursor && Types.ObjectId.isValid(cursor)) {
      scoped._id = { $lt: new Types.ObjectId(cursor) };
    }

    const items = await this.model
      .find(scoped)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && resultItems.length > 0
        ? resultItems[resultItems.length - 1]._id.toString()
        : null;

    return {
      items: resultItems,
      nextCursor,
      hasMore,
    };
  }
}
