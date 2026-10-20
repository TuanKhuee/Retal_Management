import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationRepository extends TenantScopedRepository<NotificationDocument> {
  constructor(
    @InjectModel(Notification.name)
    notificationModel: Model<NotificationDocument>,
  ) {
    super(notificationModel);
  }

  async findUserNotificationsCursor(
    organizationId: string,
    userId: string,
    limit: number = 20,
    cursor?: string,
    unreadOnly?: boolean,
  ): Promise<{ items: NotificationDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const filter: FilterQuery<NotificationDocument> = {
      organizationId,
      userId,
    };

    if (unreadOnly) {
      filter.isRead = false;
    }

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

  async countUnread(organizationId: string, userId: string): Promise<number> {
    return this.model
      .countDocuments({
        organizationId,
        userId,
        isRead: false,
      })
      .exec();
  }

  async markAllRead(organizationId: string, userId: string): Promise<number> {
    const res = await this.model
      .updateMany(
        { organizationId, userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      )
      .exec();
    return res.modifiedCount;
  }
}
