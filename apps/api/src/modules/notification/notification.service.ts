import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { NotificationRepository } from './notification.repository';
import { DeviceTokenRepository } from '../auth/repositories/device-token.repository';
import { ContractRepository } from '../contract/contract.repository';
import { RealtimeGateway } from '../../infra/socket/socket.gateway';
import { FcmService } from '../../infra/fcm/fcm.service';
import { QueueService } from '../../infra/queue/queue.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import {
  ContractStatus,
  NotificationType,
} from '../../common/constants';
import { ResourceNotFoundException } from '../../common/exceptions';
import {
  BroadcastNotificationDto,
  BroadcastTargetType,
  QueryNotificationsDto,
} from './dto/notification.dto';

export interface DispatchNotificationPayload {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly deviceTokenRepo: DeviceTokenRepository,
    private readonly contractRepo: ContractRepository,
    private readonly realtime: RealtimeGateway,
    private readonly fcm: FcmService,
    private readonly queueService: QueueService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Pipeline dispatch notification qua BullMQ + Fallback trực tiếp:
   * 1. Ghi in-app notification vào MongoDB
   * 2. Emit Socket.IO event tới room user:{userId}
   * 3. Gửi FCM push notification tới các device tokens
   * 4. Xóa các device token chết (invalid/expired)
   */
  async dispatchNotification(payload: DispatchNotificationPayload): Promise<void> {
    try {
      await this.queueService.addNotificationJob(payload);
    } catch (err: any) {
      this.logger.warn(`Queue dispatch failed, processing directly: ${err.message}`);
    }

    // Luôn đảm bảo hoàn tất pipeline ngay cả khi Redis offline hoặc đang test
    await this.processNotificationDirectly(payload);
  }

  /**
   * Bộ xử lý cốt lõi của pipeline notification
   */
  async processNotificationDirectly(payload: DispatchNotificationPayload) {
    // 1. Ghi in-app notification vào MongoDB
    const inApp = await this.notificationRepo.create(payload.organizationId, {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      isRead: false,
    });

    // 2. Emit Socket.IO tới room user:{userId}
    this.realtime.emitNotificationCreated(payload.userId, inApp);

    // 3. Gửi FCM Push tới các device tokens của user
    try {
      const deviceTokens = (await this.deviceTokenRepo.findByUserId(payload.userId)) || [];
      const tokens = Array.isArray(deviceTokens)
        ? deviceTokens.map((dt) => dt.fcmToken).filter(Boolean)
        : [];

      if (tokens.length > 0) {
        const fcmResult = await this.fcm.sendToTokens(
          tokens,
          payload.title,
          payload.body,
          (payload.data || {}) as any,
        );

        // 4. Xóa device token chết nếu FCM phát hiện token không hợp lệ
        if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
          for (const deadToken of fcmResult.invalidTokens) {
            await this.deviceTokenRepo.removeByFcmToken(deadToken);
            this.logger.log(
              `[CLEANUP] Removed dead FCM token ${deadToken} for user ${payload.userId}`,
            );
          }
        }
      }
    } catch (fcmErr: any) {
      this.logger.error(`FCM dispatch error for user ${payload.userId}: ${fcmErr.message}`);
    }

    return inApp;
  }

  /**
   * Lấy danh sách thông báo theo phân trang Cursor
   */
  async listNotifications(
    user: AuthenticatedUser,
    query: QueryNotificationsDto,
  ) {
    return this.notificationRepo.findUserNotificationsCursor(
      user.organizationId,
      user.userId,
      query.limit || 20,
      query.cursor,
      query.unread,
    );
  }

  /**
   * Lấy số lượng thông báo chưa đọc
   */
  async getUnreadCount(user: AuthenticatedUser) {
    const unreadCount = await this.notificationRepo.countUnread(
      user.organizationId,
      user.userId,
    );
    return { unreadCount };
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  async markAsRead(user: AuthenticatedUser, notificationId: string) {
    const notif = await this.notificationRepo.findById(
      user.organizationId,
      notificationId,
    );

    if (!notif || notif.userId !== user.userId) {
      throw new ResourceNotFoundException('Notification');
    }

    notif.isRead = true;
    notif.readAt = new Date();
    await notif.save();

    return { success: true, notification: notif };
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  async markAllRead(user: AuthenticatedUser) {
    const count = await this.notificationRepo.markAllRead(
      user.organizationId,
      user.userId,
    );
    return { success: true, count };
  }

  /**
   * OWNER: Phát thông báo broadcast tới tenants theo property / room / all
   */
  async broadcast(user: AuthenticatedUser, dto: BroadcastNotificationDto) {
    const contractFilter: Record<string, any> = {
      organizationId: user.organizationId,
      status: ContractStatus.ACTIVE,
    };

    if (dto.targetType === BroadcastTargetType.PROPERTY && dto.propertyId) {
      contractFilter.propertyId = dto.propertyId;
    } else if (dto.targetType === BroadcastTargetType.ROOM && dto.roomId) {
      contractFilter.roomId = dto.roomId;
    }

    const contracts: any[] = await this.contractRepo.find(
      user.organizationId,
      contractFilter,
    );

    const tenantIds = new Set<string>();
    for (const c of contracts) {
      if (c.primaryTenantId) tenantIds.add(c.primaryTenantId.toString());
      if (c.occupants && Array.isArray(c.occupants)) {
        for (const occ of c.occupants) {
          if (occ.tenantId) tenantIds.add(occ.tenantId.toString());
        }
      }
    }

    if (tenantIds.size === 0) {
      return { dispatched: 0, targetCount: 0 };
    }

    // Tìm các user IDs tương ứng với các tenants
    const tenants: any[] = await this.connection
      .collection('tenants')
      .find({
        _id: { $in: Array.from(tenantIds) as any },
        organizationId: user.organizationId,
      })
      .toArray();

    const targetUserIds = new Set<string>();
    for (const t of tenants) {
      if (t.userId) {
        targetUserIds.add(t.userId.toString());
      }
    }

    // Nếu tenant chưa có userId liên kết trực tiếp, kiểm tra membership
    if (targetUserIds.size === 0) {
      const memberships: any[] = await this.connection
        .collection('memberships')
        .find({
          organizationId: user.organizationId,
          tenantId: { $in: Array.from(tenantIds) },
        })
        .toArray();

      for (const m of memberships) {
        if (m.userId) targetUserIds.add(m.userId.toString());
      }
    }

    let dispatchedCount = 0;
    for (const targetUserId of targetUserIds) {
      await this.dispatchNotification({
        organizationId: user.organizationId,
        userId: targetUserId,
        type: NotificationType.BROADCAST,
        title: dto.title,
        body: dto.body,
        data: {
          broadcastBy: user.userId,
          targetType: dto.targetType,
          propertyId: dto.propertyId,
          roomId: dto.roomId,
        },
      });
      dispatchedCount++;
    }

    return {
      dispatched: dispatchedCount,
      targetCount: targetUserIds.size,
    };
  }
}
