import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { DeviceTokenRepository } from '../auth/repositories/device-token.repository';
import { ContractRepository } from '../contract/contract.repository';
import { RealtimeGateway } from '../../infra/socket/socket.gateway';
import { FcmService } from '../../infra/fcm/fcm.service';
import { QueueService } from '../../infra/queue/queue.service';
import {
  NotificationType,
  UserRole,
} from '../../common/constants';
import { ResourceNotFoundException } from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { BroadcastTargetType } from './dto/notification.dto';

describe('NotificationService', () => {
  let service: NotificationService;
  let notifRepo: Partial<Record<keyof NotificationRepository, jest.Mock>>;
  let deviceRepo: Partial<Record<keyof DeviceTokenRepository, jest.Mock>>;
  let contractRepo: Partial<Record<keyof ContractRepository, jest.Mock>>;
  let realtimeGateway: Partial<Record<keyof RealtimeGateway, jest.Mock>>;
  let fcmService: Partial<Record<keyof FcmService, jest.Mock>>;
  let queueService: Partial<Record<keyof QueueService, jest.Mock>>;
  let mockConnection: any;

  const mockUser: AuthenticatedUser = {
    userId: 'user-tenant-1',
    email: 'tenant1@test.com',
    organizationId: 'org-test',
    role: UserRole.TENANT,
    tenantId: 'tenant-1',
    permissions: [],
  };

  const mockOwner: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@test.com',
    organizationId: 'org-test',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(async () => {
    notifRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findUserNotificationsCursor: jest.fn(),
      countUnread: jest.fn(),
      markAllRead: jest.fn(),
    };

    deviceRepo = {
      findByUserId: jest.fn(),
      removeByFcmToken: jest.fn(),
    };

    contractRepo = {
      find: jest.fn(),
    };

    realtimeGateway = {
      emitNotificationCreated: jest.fn(),
    };

    fcmService = {
      sendToTokens: jest.fn().mockResolvedValue({ success: true, invalidTokens: [] }),
    };

    queueService = {
      addNotificationJob: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
        findOne: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: notifRepo },
        { provide: DeviceTokenRepository, useValue: deviceRepo },
        { provide: ContractRepository, useValue: contractRepo },
        { provide: RealtimeGateway, useValue: realtimeGateway },
        { provide: FcmService, useValue: fcmService },
        { provide: QueueService, useValue: queueService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('dispatchNotification Pipeline', () => {
    it('thực hiện tuần tự: ghi in-app -> emit Socket.IO user:{userId} -> gửi FCM -> dọn dẹp token chết', async () => {
      const mockCreatedNotif = {
        _id: 'notif-1',
        organizationId: 'org-test',
        userId: 'user-tenant-1',
        type: NotificationType.INVOICE_ISSUED,
        title: 'Hóa đơn mới',
        body: 'Hóa đơn tháng 10 đã được phát hành',
        isRead: false,
      };
      (notifRepo.create as jest.Mock).mockResolvedValue(mockCreatedNotif);

      // User có 2 device tokens: 1 active và 1 dead token
      (deviceRepo.findByUserId as jest.Mock).mockResolvedValue([
        { fcmToken: 'valid-fcm-token-123' },
        { fcmToken: 'dead-token-expired' },
      ]);

      (fcmService.sendToTokens as jest.Mock).mockResolvedValue({
        success: true,
        invalidTokens: ['dead-token-expired'],
      });

      await service.dispatchNotification({
        organizationId: 'org-test',
        userId: 'user-tenant-1',
        type: NotificationType.INVOICE_ISSUED,
        title: 'Hóa đơn mới',
        body: 'Hóa đơn tháng 10 đã được phát hành',
      });

      // 1. Ghi in-app vào DB
      expect(notifRepo.create).toHaveBeenCalledWith(
        'org-test',
        expect.objectContaining({
          userId: 'user-tenant-1',
          type: NotificationType.INVOICE_ISSUED,
        }),
      );

      // 2. Emit Socket.IO tới room user:{userId}
      expect(realtimeGateway.emitNotificationCreated).toHaveBeenCalledWith(
        'user-tenant-1',
        mockCreatedNotif,
      );

      // 3. Gửi FCM
      expect(fcmService.sendToTokens).toHaveBeenCalledWith(
        ['valid-fcm-token-123', 'dead-token-expired'],
        'Hóa đơn mới',
        'Hóa đơn tháng 10 đã được phát hành',
        {},
      );

      // 4. Xóa device token chết khỏi database
      expect(deviceRepo.removeByFcmToken).toHaveBeenCalledWith('dead-token-expired');
    });
  });

  describe('listNotifications & unread count', () => {
    it('lấy danh sách thông báo theo phân trang cursor', async () => {
      (notifRepo.findUserNotificationsCursor as jest.Mock).mockResolvedValue({
        items: [{ _id: 'n1', title: 'Thông báo 1' }],
        nextCursor: null,
        hasMore: false,
      });

      const res = await service.listNotifications(mockUser, { limit: 10, unread: true });
      expect(res.items.length).toBe(1);
      expect(notifRepo.findUserNotificationsCursor).toHaveBeenCalledWith(
        'org-test',
        'user-tenant-1',
        10,
        undefined,
        true,
      );
    });

    it('lấy số lượng thông báo chưa đọc', async () => {
      (notifRepo.countUnread as jest.Mock).mockResolvedValue(5);

      const res = await service.getUnreadCount(mockUser);
      expect(res.unreadCount).toBe(5);
    });
  });

  describe('markAsRead & markAllRead', () => {
    it('đánh dấu 1 thông báo là đã đọc', async () => {
      const mockDoc = {
        _id: 'n1',
        userId: 'user-tenant-1',
        isRead: false,
        readAt: null,
        save: jest.fn().mockResolvedValue(true),
      };
      (notifRepo.findById as jest.Mock).mockResolvedValue(mockDoc);

      const res = await service.markAsRead(mockUser, 'n1');
      expect(res.success).toBe(true);
      expect(mockDoc.isRead).toBe(true);
      expect(mockDoc.readAt).toBeDefined();
    });

    it('từ chối đánh dấu đã đọc thông báo của người khác -> ném 404 ResourceNotFoundException', async () => {
      const mockDoc = {
        _id: 'n1',
        userId: 'other-user', // khác user-tenant-1
        isRead: false,
      };
      (notifRepo.findById as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.markAsRead(mockUser, 'n1')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('đánh dấu tất cả thông báo là đã đọc', async () => {
      (notifRepo.markAllRead as jest.Mock).mockResolvedValue(3);

      const res = await service.markAllRead(mockUser);
      expect(res.success).toBe(true);
      expect(res.count).toBe(3);
    });
  });

  describe('broadcast', () => {
    it('OWNER gửi thông báo broadcast tới tenants của các hợp đồng đang active', async () => {
      (contractRepo.find as jest.Mock).mockResolvedValue([
        { primaryTenantId: 'tenant-1' },
        { primaryTenantId: 'tenant-2' },
      ]);

      mockConnection.collection().find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { _id: 'tenant-1', userId: 'user-tenant-1' },
          { _id: 'tenant-2', userId: 'user-tenant-2' },
        ]),
      });

      (notifRepo.create as jest.Mock).mockResolvedValue({ _id: 'notif-b' });

      const res = await service.broadcast(mockOwner, {
        title: 'Bảo trì máy bơm',
        body: 'Cắt nước từ 13h đến 15h',
        targetType: BroadcastTargetType.ALL,
      });

      expect(res.dispatched).toBe(2);
      expect(res.targetCount).toBe(2);
    });
  });
});
