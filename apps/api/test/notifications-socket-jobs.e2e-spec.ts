import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { NotificationController } from '../src/modules/notification/notification.controller';
import { NotificationService } from '../src/modules/notification/notification.service';
import { NotificationRepository } from '../src/modules/notification/notification.repository';
import { Notification } from '../src/modules/notification/schemas/notification.schema';
import { DeviceTokenRepository } from '../src/modules/auth/repositories/device-token.repository';
import { ContractRepository } from '../src/modules/contract/contract.repository';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository';
import { InvoiceService } from '../src/modules/invoice/invoice.service';
import { InvoiceMarkOverdueJob } from '../src/jobs/invoice-mark-overdue.job';
import { InvoiceDueSoonJob } from '../src/jobs/invoice-due-soon.job';
import { ContractExpiryCheckJob } from '../src/jobs/contract-expiry-check.job';
import { InvoicePdfJob } from '../src/jobs/invoice-pdf.job';
import { ReportExportJob } from '../src/jobs/report-export.job';
import { RealtimeGateway } from '../src/infra/socket/socket.gateway';
import { FcmService } from '../src/infra/fcm/fcm.service';
import { QueueService } from '../src/infra/queue/queue.service';
import { StorageService } from '../src/infra/storage/storage.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import {
  ContractStatus,
  ErrorCode,
  InvoiceStatus,
  NotificationType,
  Permission,
  UserRole,
} from '../src/common/constants';
import { AuthenticatedUser } from '../src/common/types/jwt-payload.interface';
import { BroadcastTargetType } from '../src/modules/notification/dto/notification.dto';

describe('Notifications, Socket Gateway & Jobs E2E Tests', () => {
  let app: INestApplication;
  let currentUser: AuthenticatedUser;
  let realtimeGateway: RealtimeGateway;
  let markOverdueJob: InvoiceMarkOverdueJob;
  let dueSoonJob: InvoiceDueSoonJob;
  let contractExpiryJob: ContractExpiryCheckJob;
  let invoicePdfJob: InvoicePdfJob;
  let reportExportJob: ReportExportJob;

  const orgId = 'org-e2e-notif';

  // In-memory data store for E2E tests
  const mockDb: {
    notifications: any[];
    deviceTokens: any[];
    contracts: any[];
    invoices: any[];
    maintenanceRequests: any[];
  } = {
    notifications: [],
    deviceTokens: [],
    contracts: [],
    invoices: [],
    maintenanceRequests: [],
  };

  const userOwner: AuthenticatedUser = {
    userId: 'user-owner',
    email: 'tuankhue81@gmail.com',
    organizationId: orgId,
    role: UserRole.OWNER,
    permissions: Object.values(Permission),
  };

  const userTenantA: AuthenticatedUser = {
    userId: 'user-tenant-a',
    email: 'tenanta@gmail.com',
    organizationId: orgId,
    role: UserRole.TENANT,
    tenantId: 'tenant-a',
    permissions: [Permission.NOTIFICATION_READ],
  };

  const userTenantB: AuthenticatedUser = {
    userId: 'user-tenant-b',
    email: 'tenantb@gmail.com',
    organizationId: orgId,
    role: UserRole.TENANT,
    tenantId: 'tenant-b',
    permissions: [Permission.NOTIFICATION_READ],
  };

  beforeAll(async () => {
    // Setup initial data
    mockDb.contracts = [
      {
        _id: 'contract-a',
        organizationId: orgId,
        contractNo: 'HD-2026-0001',
        roomId: 'room-101',
        primaryTenantId: 'tenant-a',
        status: ContractStatus.ACTIVE,
        endDate: new Date(Date.now() + 30 * 86400000), // 30 days
        isCurrent: true,
      },
      {
        _id: 'contract-b',
        organizationId: orgId,
        contractNo: 'HD-2026-0002',
        roomId: 'room-102',
        primaryTenantId: 'tenant-b',
        status: ContractStatus.ACTIVE,
        endDate: new Date(Date.now() + 180 * 86400000), // 180 days
        isCurrent: true,
      },
    ];

    mockDb.deviceTokens = [
      {
        userId: 'user-tenant-a',
        deviceId: 'device-1',
        fcmToken: 'valid-fcm-token-tenant-a',
      },
      {
        userId: 'user-tenant-a',
        deviceId: 'device-old',
        fcmToken: 'dead-token-expired',
      },
    ];

    mockDb.maintenanceRequests = [
      {
        _id: 'ticket-a',
        organizationId: orgId,
        tenantId: 'tenant-a',
        title: 'Sửa bóng đèn',
      },
      {
        _id: 'ticket-b',
        organizationId: orgId,
        tenantId: 'tenant-b',
        title: 'Sửa vòi nước',
      },
    ];

    // Overdue invoice for Tenant A
    mockDb.invoices = [
      {
        _id: 'inv-overdue-1',
        organizationId: orgId,
        invoiceNo: 'INV-2610-000001',
        invoiceNumber: 'INV-2610-000001',
        tenantId: 'user-tenant-a',
        contractId: 'contract-a',
        status: InvoiceStatus.ISSUED,
        dueDate: new Date(Date.now() - 2 * 86400000), // 2 days ago
        remainingAmount: 3200000,
        active: true,
        save: jest.fn(async function () {
          return this;
        }),
      },
      {
        _id: 'inv-duesoon-2',
        organizationId: orgId,
        invoiceNo: 'INV-2610-000002',
        invoiceNumber: 'INV-2610-000002',
        tenantId: 'user-tenant-a',
        contractId: 'contract-a',
        status: InvoiceStatus.ISSUED,
        dueDate: new Date(Date.now() + 3 * 86400000), // in 3 days
        remainingAmount: 2800000,
        active: true,
        save: jest.fn(async function () {
          return this;
        }),
      },
    ];

    const mockNotificationRepo = {
      create: jest.fn(async (organizationId: string, data: any) => {
        const doc = {
          _id: `notif-${mockDb.notifications.length + 1}`,
          organizationId,
          ...data,
          createdAt: new Date(),
          save: jest.fn(async function () {
            return this;
          }),
        };
        mockDb.notifications.push(doc);
        return doc;
      }),
      findById: jest.fn(async (organizationId: string, id: string) => {
        return (
          mockDb.notifications.find(
            (n) => n._id === id && n.organizationId === organizationId,
          ) || null
        );
      }),
      findUserNotificationsCursor: jest.fn(
        async (
          organizationId: string,
          userId: string,
          limit: number,
          cursor?: string,
          unreadOnly?: boolean,
        ) => {
          let items = mockDb.notifications.filter(
            (n) => n.organizationId === organizationId && n.userId === userId,
          );
          if (unreadOnly) {
            items = items.filter((n) => !n.isRead);
          }
          return {
            items: items.slice(0, limit),
            nextCursor: null,
            hasMore: items.length > limit,
          };
        },
      ),
      countUnread: jest.fn(async (organizationId: string, userId: string) => {
        return mockDb.notifications.filter(
          (n) => n.organizationId === organizationId && n.userId === userId && !n.isRead,
        ).length;
      }),
      markAllRead: jest.fn(async (organizationId: string, userId: string) => {
        let count = 0;
        for (const n of mockDb.notifications) {
          if (n.organizationId === organizationId && n.userId === userId && !n.isRead) {
            n.isRead = true;
            n.readAt = new Date();
            count++;
          }
        }
        return count;
      }),
    };

    const mockDeviceTokenRepo = {
      findByUserId: jest.fn(async (userId: string) => {
        return mockDb.deviceTokens.filter((dt) => dt.userId === userId);
      }),
      removeByFcmToken: jest.fn(async (fcmToken: string) => {
        const initial = mockDb.deviceTokens.length;
        mockDb.deviceTokens = mockDb.deviceTokens.filter((dt) => dt.fcmToken !== fcmToken);
        return mockDb.deviceTokens.length < initial;
      }),
    };

    const mockContractRepo = {
      find: jest.fn(async (organizationId: string, filter: any) => {
        return mockDb.contracts.filter((c) => {
          if (c.organizationId !== organizationId) return false;
          if (filter.status && c.status !== filter.status) return false;
          return true;
        });
      }),
      getModel: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          exec: jest.fn().mockImplementation(async () => mockDb.contracts),
        }),
      }),
    };

    const mockInvoiceRepo = {
      find: jest.fn(async (organizationId: string, filter: any) => {
        return mockDb.invoices.filter((inv) => {
          if (inv.organizationId !== organizationId) return false;
          if (filter.status?.$in && !filter.status.$in.includes(inv.status)) return false;
          if (filter.status && !filter.status.$in && inv.status !== filter.status) return false;
          if (filter.dueDate?.$lt && !(inv.dueDate < filter.dueDate.$lt)) return false;
          return true;
        });
      }),
      getModel: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          exec: jest.fn().mockImplementation(async () => {
            return mockDb.invoices.filter((inv) => inv.dueDate < new Date());
          }),
        }),
      }),
    };

    const mockInvoiceService = {
      getInvoicePdf: jest.fn().mockResolvedValue({
        html: '<html><body>Mock Invoice PDF</body></html>',
      }),
    };

    const mockQueueService = {
      addNotificationJob: jest.fn().mockResolvedValue(undefined),
    };

    const mockStorageService = {
      generateUploadPresignedUrl: jest.fn(
        async (organizationId: string, filename: string) => ({
          uploadUrl: `https://mock.storage/${filename}`,
          fileKey: `${organizationId}/${filename}`,
        }),
      ),
    };

    const mockConnection = {
      collection: jest.fn().mockImplementation((name: string) => ({
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockImplementation(async () => {
            if (name === 'tenants') {
              return [
                { _id: 'tenant-a', userId: 'user-tenant-a' },
                { _id: 'tenant-b', userId: 'user-tenant-b' },
              ];
            }
            if (name === 'memberships') {
              return [{ userId: 'user-owner' }];
            }
            return [];
          }),
        }),
        findOne: jest.fn().mockImplementation(async (query: any) => {
          if (name === 'maintenance_requests') {
            return (
              mockDb.maintenanceRequests.find(
                (m) => m._id === query._id && m.organizationId === query.organizationId,
              ) || null
            );
          }
          if (name === 'notifications') {
            return (
              mockDb.notifications.find(
                (n) =>
                  n.organizationId === query.organizationId &&
                  n.type === query.type &&
                  n.data?.milestone === query['data.milestone'],
              ) || null
            );
          }
          return null;
        }),
      })),
    };

    const mockJwtService = {
      verifyAsync: jest.fn(async (token: string) => {
        if (token === 'token-owner') {
          return {
            sub: userOwner.userId,
            email: userOwner.email,
            organizationId: userOwner.organizationId,
            role: userOwner.role,
          };
        }
        if (token === 'token-tenant-a') {
          return {
            sub: userTenantA.userId,
            email: userTenantA.email,
            organizationId: userTenantA.organizationId,
            role: userTenantA.role,
            tenantId: userTenantA.tenantId,
          };
        }
        throw new Error('Invalid JWT token');
      }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        NotificationService,
        RealtimeGateway,
        FcmService,
        InvoiceMarkOverdueJob,
        InvoiceDueSoonJob,
        ContractExpiryCheckJob,
        InvoicePdfJob,
        ReportExportJob,
        { provide: NotificationRepository, useValue: mockNotificationRepo },
        { provide: DeviceTokenRepository, useValue: mockDeviceTokenRepo },
        { provide: ContractRepository, useValue: mockContractRepo },
        { provide: InvoiceRepository, useValue: mockInvoiceRepo },
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: getModelToken(Notification.name), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    realtimeGateway = moduleRef.get<RealtimeGateway>(RealtimeGateway);
    markOverdueJob = moduleRef.get<InvoiceMarkOverdueJob>(InvoiceMarkOverdueJob);
    dueSoonJob = moduleRef.get<InvoiceDueSoonJob>(InvoiceDueSoonJob);
    contractExpiryJob = moduleRef.get<ContractExpiryCheckJob>(ContractExpiryCheckJob);
    invoicePdfJob = moduleRef.get<InvoicePdfJob>(InvoicePdfJob);
    reportExportJob = moduleRef.get<ReportExportJob>(ReportExportJob);
  });

  afterAll(async () => {
    await app.close();
  });

  // ----------------------------------------------------
  // 1. NOTIFICATIONS REST API
  // ----------------------------------------------------
  describe('Notifications API', () => {
    let createdNotifId: string;

    it('OWNER broadcast thông báo tới toàn bộ người thuê -> 201', async () => {
      currentUser = userOwner;
      const res = await request(app.getHttpServer())
        .post('/notifications/broadcast')
        .send({
          title: 'Thông báo cắt điện luân phiên',
          body: 'Điện lực cắt điện từ 8h đến 11h sáng mai',
          targetType: BroadcastTargetType.ALL,
        })
        .expect(201);

      expect(res.body.data.dispatched).toBe(2);
      expect(mockDb.notifications.length).toBe(2);
      createdNotifId = mockDb.notifications[0]._id;
    });

    it('TENANT A lấy danh sách thông báo và số lượng chưa đọc', async () => {
      currentUser = userTenantA;

      // Danh sách thông báo
      const listRes = await request(app.getHttpServer())
        .get('/notifications?unread=true')
        .expect(200);

      expect(listRes.body.data.items.length).toBeGreaterThan(0);

      // Đếm số lượng chưa đọc
      const countRes = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .expect(200);

      expect(countRes.body.data.unreadCount).toBeGreaterThan(0);
    });

    it('TENANT A đánh dấu 1 thông báo là đã đọc', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post(`/notifications/${createdNotifId}/read`)
        .expect(201);

      expect(res.body.data.success).toBe(true);
      expect(res.body.data.notification.isRead).toBe(true);
    });

    it('TENANT B không thể đọc thông báo của TENANT A -> 404', async () => {
      currentUser = userTenantB;
      const res = await request(app.getHttpServer())
        .post(`/notifications/${createdNotifId}/read`)
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('TENANT A đánh dấu tất cả thông báo là đã đọc POST /notifications/read-all', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post('/notifications/read-all')
        .expect(201);

      expect(res.body.data.success).toBe(true);
    });

    it('Pipeline tự động dọn dẹp device token chết khi gửi FCM', async () => {
      // Trước khi gửi, TENANT A có dead-token-expired
      const beforeCount = mockDb.deviceTokens.filter((dt) => dt.fcmToken === 'dead-token-expired').length;
      expect(beforeCount).toBe(0); // Đã được dọn dẹp ở broadcast phía trên!
      // Valid token vẫn còn
      expect(mockDb.deviceTokens.some((dt) => dt.fcmToken === 'valid-fcm-token-tenant-a')).toBe(true);
    });
  });

  // ----------------------------------------------------
  // 2. SOCKET.IO /rt GATEWAY & ROOM SECURITY
  // ----------------------------------------------------
  describe('Socket.IO /rt Gateway Security', () => {
    it('kết nối không có JWT token bị ngắt kết nối', async () => {
      const mockClient: any = {
        id: 'client-no-token',
        handshake: { auth: {}, headers: {}, query: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
      };

      await realtimeGateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication token required',
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('kết nối với token TENANT A: tự động join user:user-tenant-a và tenant:tenant-a', async () => {
      const mockClient: any = {
        id: 'client-tenant-a',
        handshake: { auth: { token: 'token-tenant-a' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        data: {},
      };

      await realtimeGateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user:user-tenant-a');
      expect(mockClient.join).toHaveBeenCalledWith('tenant:tenant-a');
      // Không được join room staff
      expect(mockClient.join).not.toHaveBeenCalledWith(`org:${orgId}:staff`);
    });

    it('kết nối với token OWNER: tự động join user:user-owner và org:org-e2e-notif:staff', async () => {
      const mockClient: any = {
        id: 'client-owner',
        handshake: { auth: { token: 'token-owner' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        data: {},
      };

      await realtimeGateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user:user-owner');
      expect(mockClient.join).toHaveBeenCalledWith(`org:${orgId}:staff`);
    });

    it('USER KHÔNG THỂ JOIN ROOM CỦA NGƯỜI KHÁC (join_user)', () => {
      const mockClient: any = {
        data: {
          user: userTenantA,
        },
        emit: jest.fn(),
        join: jest.fn(),
      };

      const res = realtimeGateway.handleJoinUser(mockClient, {
        userId: userTenantB.userId,
      });

      expect(res.status).toBe('denied');
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied: Cannot join room of another user',
      });
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('TENANT A KHÔNG THỂ JOIN ROOM TICKET BẢO TRÌ CỦA TENANT B (join_maintenance)', async () => {
      const mockClient: any = {
        data: {
          user: userTenantA,
        },
        emit: jest.fn(),
        join: jest.fn(),
      };

      // Ticket B thuộc về tenant-b
      const res = await realtimeGateway.handleJoinMaintenance(mockClient, {
        requestId: 'ticket-b',
      });

      expect(res.status).toBe('denied');
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied: Cannot join ticket room of another tenant',
      });
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('TENANT A JOIN ĐƯỢC ROOM TICKET CỦA CHÍNH MÌNH', async () => {
      const mockClient: any = {
        data: {
          user: userTenantA,
        },
        emit: jest.fn(),
        join: jest.fn(),
      };

      const res = await realtimeGateway.handleJoinMaintenance(mockClient, {
        requestId: 'ticket-a',
      });

      expect(res.status).toBe('joined');
      expect(mockClient.join).toHaveBeenCalledWith('maint:ticket-a');
    });
  });

  // ----------------------------------------------------
  // 3. JOBS EXECUTION & IDEMPOTENCY
  // ----------------------------------------------------
  describe('Jobs Execution & Idempotency', () => {
    it('JOB invoice.mark-overdue CHẠY 2 LẦN KHÔNG ĐỔI KẾT QUẢ (Idempotent)', async () => {
      // Lần chạy 1: Hóa đơn inv-overdue-1 quá hạn -> chuyển sang OVERDUE
      const run1 = await markOverdueJob.execute(orgId);
      expect(run1.updated).toBe(1);
      expect(mockDb.invoices[0].status).toBe(InvoiceStatus.OVERDUE);

      // Lần chạy 2 (ngay sau đó hoặc cùng ngày): Không tìm thấy thêm hóa đơn nào cần đổi
      const run2 = await markOverdueJob.execute(orgId);
      expect(run2.updated).toBe(0);
      expect(run2.processed).toBe(0);
      // Trạng thái hóa đơn không đổi
      expect(mockDb.invoices[0].status).toBe(InvoiceStatus.OVERDUE);
    });

    it('JOB invoice.due-soon chạy thông báo trước hạn 3 ngày & idempotent', async () => {
      // Lần chạy 1: Phát thông báo sắp đến hạn cho inv-duesoon-2
      const run1 = await dueSoonJob.execute(orgId);
      expect(run1.notified).toBe(1);

      // Lần chạy 2: Nhận diện đã gửi thông báo milestone 3d -> Bỏ qua (skipped = 1)
      const run2 = await dueSoonJob.execute(orgId);
      expect(run2.notified).toBe(0);
      expect(run2.skipped).toBe(1);
    });

    it('JOB contract.expiry-check chạy thông báo hợp đồng sắp hết hạn & idempotent', async () => {
      // Lần chạy 1: Hợp đồng contract-a còn 30 ngày hết hạn -> phát thông báo
      const run1 = await contractExpiryJob.execute(orgId);
      expect(run1.notified).toBe(1);

      // Lần chạy 2: Nhận diện đã gửi thông báo milestone 30d -> Bỏ qua
      const run2 = await contractExpiryJob.execute(orgId);
      expect(run2.notified).toBe(0);
      expect(run2.skipped).toBe(1);
    });

    it('JOB invoice.pdf sinh và cache PDF hóa đơn sau khi phát hành', async () => {
      const res = await invoicePdfJob.execute(orgId, 'inv-overdue-1');
      expect(res.success).toBe(true);
      expect(res.invoiceId).toBe('inv-overdue-1');
      expect(res.contentLength).toBeGreaterThan(0);
    });

    it('JOB report.export xuất dữ liệu báo cáo bất đồng bộ', async () => {
      const res = await reportExportJob.execute(orgId, 'exp-001', 'REVENUE');
      expect(res.success).toBe(true);
      expect(res.fileKey).toContain('report_REVENUE_exp-001.csv');
    });
  });
});
