import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import {
  MaintenanceMessage,
  MaintenanceMessageDocument,
} from './schemas/maintenance-message.schema';

@Injectable()
export class MaintenanceMessageRepository extends TenantScopedRepository<MaintenanceMessageDocument> {
  constructor(
    @InjectModel(MaintenanceMessage.name)
    messageModel: Model<MaintenanceMessageDocument>,
  ) {
    super(messageModel);
  }

  async findMessagesCursor(
    organizationId: string,
    requestId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ items: MaintenanceMessageDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const filter: FilterQuery<MaintenanceMessageDocument> = {
      organizationId,
      requestId,
    };

    if (cursor && Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    const items = await this.model
      .find(filter)
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
