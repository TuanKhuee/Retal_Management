import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { AttachmentController } from '../src/modules/attachment/attachment.controller';
import { AttachmentService } from '../src/modules/attachment/attachment.service';
import { AttachmentRepository } from '../src/modules/attachment/attachment.repository';
import { Attachment } from '../src/modules/attachment/schemas/attachment.schema';
import { MaintenanceController } from '../src/modules/maintenance/maintenance.controller';
import { MaintenanceService } from '../src/modules/maintenance/maintenance.service';
import { MaintenanceRequestRepository } from '../src/modules/maintenance/maintenance-request.repository';
import { MaintenanceMessageRepository } from '../src/modules/maintenance/maintenance-message.repository';
import { MaintenanceRequest } from '../src/modules/maintenance/schemas/maintenance-request.schema';
import { MaintenanceMessage } from '../src/modules/maintenance/schemas/maintenance-message.schema';
import { ContractRepository } from '../src/modules/contract/contract.repository';
import { CounterRepository } from '../src/modules/auth/repositories/counter.repository';
import { StorageService } from '../src/infra/storage/storage.service';
import { RealtimeGateway } from '../src/infra/socket/socket.gateway';
import { FcmService } from '../src/infra/fcm/fcm.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import {
  AttachmentStatus,
  ContractStatus,
  ErrorCode,
  MaintenancePriority,
  MaintenanceStatus,
  Permission,
  UserRole,
} from '../src/common/constants';
import { AuthenticatedUser } from '../src/common/types/jwt-payload.interface';

describe('Maintenance, Messages & Attachments E2E Tests', () => {
  let app: INestApplication;
  let currentUser: AuthenticatedUser;

  // In-memory mock database
  const mockDb: {
    contracts: any[];
    maintenanceRequests: any[];
    maintenanceMessages: any[];
    attachments: any[];
    counters: Record<string, number>;
  } = {
    contracts: [],
    maintenanceRequests: [],
    maintenanceMessages: [],
    attachments: [],
    counters: {},
  };

  const orgId = 'org-e2e-maint';

  const userOwner: AuthenticatedUser = {
    userId: 'user-owner',
    email: 'owner@rental.vn',
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
    permissions: [
      Permission.MAINTENANCE_READ,
      Permission.MAINTENANCE_CREATE,
      Permission.MAINTENANCE_UPDATE,
      Permission.ATTACHMENT_UPLOAD,
      Permission.ATTACHMENT_READ,
    ],
  };

  const userTenantB: AuthenticatedUser = {
    userId: 'user-tenant-b',
    email: 'tenantb@gmail.com',
    organizationId: orgId,
    role: UserRole.TENANT,
    tenantId: 'tenant-b',
    permissions: [
      Permission.MAINTENANCE_READ,
      Permission.MAINTENANCE_CREATE,
      Permission.MAINTENANCE_UPDATE,
      Permission.ATTACHMENT_UPLOAD,
      Permission.ATTACHMENT_READ,
    ],
  };

  beforeAll(async () => {
    // Setup active contracts for Tenant A and Tenant B
    mockDb.contracts = [
      {
        _id: 'contract-a',
        organizationId: orgId,
        propertyId: 'prop-1',
        roomId: 'room-101',
        primaryTenantId: 'tenant-a',
        status: ContractStatus.ACTIVE,
        isCurrent: true,
      },
      {
        _id: 'contract-b',
        organizationId: orgId,
        propertyId: 'prop-1',
        roomId: 'room-102',
        primaryTenantId: 'tenant-b',
        status: ContractStatus.ACTIVE,
        isCurrent: true,
      },
    ];

    const mockAttachmentRepo = {
      create: jest.fn(async (organizationId: string, data: any) => {
        const doc = {
          _id: `att-${mockDb.attachments.length + 1}`,
          organizationId,
          ...data,
          createdAt: new Date(),
          save: jest.fn(async function () {
            return this;
          }),
        };
        mockDb.attachments.push(doc);
        return doc;
      }),
      findById: jest.fn(async (organizationId: string, id: string) => {
        const item = mockDb.attachments.find(
          (a) => a._id === id && a.organizationId === organizationId,
        );
        return item || null;
      }),
    };

    const mockMaintenanceRepo = {
      create: jest.fn(async (organizationId: string, data: any) => {
        const doc = {
          _id: `maint-${mockDb.maintenanceRequests.length + 1}`,
          organizationId,
          ...data,
          createdAt: new Date(),
          save: jest.fn(async function () {
            return this;
          }),
        };
        mockDb.maintenanceRequests.push(doc);
        return doc;
      }),
      findById: jest.fn(async (organizationId: string, id: string) => {
        const item = mockDb.maintenanceRequests.find(
          (m) => m._id === id && m.organizationId === organizationId,
        );
        return item || null;
      }),
      findWithFilters: jest.fn(async (organizationId: string, filter: any) => {
        return mockDb.maintenanceRequests.filter((m) => {
          if (m.organizationId !== organizationId) return false;
          if (filter.tenantId && m.tenantId !== filter.tenantId) return false;
          if (filter.roomId && m.roomId !== filter.roomId) return false;
          if (filter.status && m.status !== filter.status) return false;
          if (filter.priority && m.priority !== filter.priority) return false;
          if (filter.category && m.category !== filter.category) return false;
          return true;
        });
      }),
    };

    const mockMessageRepo = {
      create: jest.fn(async (organizationId: string, data: any) => {
        const doc = {
          _id: `msg-${mockDb.maintenanceMessages.length + 1}`,
          organizationId,
          ...data,
          createdAt: new Date(),
        };
        mockDb.maintenanceMessages.push(doc);
        return doc;
      }),
      findMessagesCursor: jest.fn(
        async (organizationId: string, requestId: string, limit: number) => {
          const items = mockDb.maintenanceMessages.filter(
            (m) => m.organizationId === organizationId && m.requestId === requestId,
          );
          return {
            items: items.slice(0, limit),
            nextCursor: null,
            hasMore: items.length > limit,
          };
        },
      ),
    };

    const mockContractRepo = {
      findActiveContractsByTenant: jest.fn(
        async (organizationId: string, tenantId: string) => {
          return mockDb.contracts.filter(
            (c) =>
              c.organizationId === organizationId &&
              c.primaryTenantId === tenantId &&
              c.status === ContractStatus.ACTIVE,
          );
        },
      ),
    };

    const mockCounterRepo = {
      getNextSequence: jest.fn(async (key: string) => {
        mockDb.counters[key] = (mockDb.counters[key] || 0) + 1;
        return mockDb.counters[key];
      }),
    };

    const mockStorageService = {
      generateUploadPresignedUrl: jest.fn(
        async (organizationId: string, filename: string) => {
          return {
            uploadUrl: `https://mock-s3.local/upload/${organizationId}/${filename}`,
            fileKey: `${organizationId}/${filename}`,
          };
        },
      ),
      generateDownloadPresignedUrl: jest.fn(
        async (organizationId: string, fileKey: string) => {
          return `https://mock-s3.local/download/${fileKey}?expires=900`;
        },
      ),
    };

    const mockRealtimeGateway = {
      emitToOrganization: jest.fn(),
      emitToTenant: jest.fn(),
    };

    const mockFcmService = {
      sendPushNotification: jest.fn().mockResolvedValue(true),
    };

    const mockConnection = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(async (query: any) => {
          if (query.tenantId) {
            return mockDb.maintenanceRequests.find(
              (m) => m._id === query._id && m.tenantId === query.tenantId,
            );
          }
          return null;
        }),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentController, MaintenanceController],
      providers: [
        AttachmentService,
        MaintenanceService,
        { provide: AttachmentRepository, useValue: mockAttachmentRepo },
        { provide: MaintenanceRequestRepository, useValue: mockMaintenanceRepo },
        { provide: MaintenanceMessageRepository, useValue: mockMessageRepo },
        { provide: ContractRepository, useValue: mockContractRepo },
        { provide: CounterRepository, useValue: mockCounterRepo },
        { provide: StorageService, useValue: mockStorageService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
        { provide: FcmService, useValue: mockFcmService },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: getModelToken(Attachment.name), useValue: {} },
        { provide: getModelToken(MaintenanceRequest.name), useValue: {} },
        { provide: getModelToken(MaintenanceMessage.name), useValue: {} },
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
  });

  afterAll(async () => {
    await app.close();
  });

  // ----------------------------------------------------
  // ATTACHMENTS TESTS
  // ----------------------------------------------------
  describe('Attachments API', () => {
    it('từ chối presign với MIME hoặc extension không hợp lệ -> 422', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post('/attachments/presign')
        .send({
          filename: 'virus.exe',
          mimeType: 'application/x-msdownload',
          size: 1024,
        })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    });

    it('từ chối presign khi dung lượng file > 50MB -> 422', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post('/attachments/presign')
        .send({
          filename: 'very_large_video.mp4',
          mimeType: 'video/mp4',
          size: 60 * 1024 * 1024, // 60MB
        })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    });

    let uploadedAttachmentId: string;

    it('tạo pre-signed URL upload thành công cho ảnh .jpg hợp lệ -> 201', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post('/attachments/presign')
        .send({
          filename: 'broken_pipe.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 300, // 300KB
        })
        .expect(201);

      expect(res.body.data.attachmentId).toBeDefined();
      expect(res.body.data.uploadUrl).toContain('mock-s3.local/upload');
      uploadedAttachmentId = res.body.data.attachmentId;
    });

    it('xác nhận upload hoàn tất POST /attachments/:id/complete -> READY', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post(`/attachments/${uploadedAttachmentId}/complete`)
        .expect(201);

      expect(res.body.data.success).toBe(true);
      expect(res.body.data.attachment.status).toBe(AttachmentStatus.READY);
    });

    it('lấy link download GET /attachments/:id/url', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .get(`/attachments/${uploadedAttachmentId}/url`)
        .expect(200);

      expect(res.body.data.downloadUrl).toContain('mock-s3.local/download');
      expect(res.body.data.expiresIn).toBe(900);
    });
  });

  // ----------------------------------------------------
  // MAINTENANCE REQUESTS TESTS
  // ----------------------------------------------------
  describe('Maintenance Requests & State Machine', () => {
    let ticketAId: string;

    it('TENANT A tạo ticket: tự gán roomId/tenantId từ active contract, sinh mã MR-YYMM-000123', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post('/maintenance-requests')
        .send({
          category: 'PLUMBING',
          title: 'Hỏng vòi sen nhà tắm',
          description: 'Vòi sen bị rò nước không khóa được',
          priority: MaintenancePriority.HIGH,
        })
        .expect(201);

      const ticket = res.body.data;
      expect(ticket.requestNo).toMatch(/^MR-\d{4}-\d{6}$/);
      expect(ticket.roomId).toBe('room-101'); // Auto-assigned from Contract A
      expect(ticket.tenantId).toBe('tenant-a'); // Auto-assigned from User A
      expect(ticket.status).toBe(MaintenanceStatus.NEW);
      expect(ticket.statusHistory.length).toBe(1);
      ticketAId = ticket._id;
    });

    it('TENANT A xem được ticket của mình, TENANT B xem danh sách trống', async () => {
      currentUser = userTenantA;
      const resA = await request(app.getHttpServer())
        .get('/maintenance-requests')
        .expect(200);
      expect(resA.body.data.length).toBe(1);
      expect(resA.body.data[0]._id).toBe(ticketAId);

      currentUser = userTenantB;
      const resB = await request(app.getHttpServer())
        .get('/maintenance-requests')
        .expect(200);
      expect(resB.body.data.length).toBe(0);
    });

    it('TENANT B không đọc được chi tiết ticket của TENANT A -> 404 Not Found', async () => {
      currentUser = userTenantB;
      const res = await request(app.getHttpServer())
        .get(`/maintenance-requests/${ticketAId}`)
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('chuyển trạng thái sai luồng (ví dụ NEW -> RESOLVED) -> 422 Unprocessable Entity', async () => {
      currentUser = userOwner;
      const res = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/transition`)
        .send({
          to: MaintenanceStatus.RESOLVED,
          note: 'Chưa làm gì đã bảo xong',
        })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    });

    it('OWNER chuyển đúng luồng: NEW -> ACCEPTED -> IN_PROGRESS', async () => {
      currentUser = userOwner;

      // 1. NEW -> ACCEPTED
      const res1 = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/transition`)
        .send({
          to: MaintenanceStatus.ACCEPTED,
          note: 'Đã nhận tin',
        })
        .expect(201);
      expect(res1.body.data.status).toBe(MaintenanceStatus.ACCEPTED);

      // 2. ACCEPTED -> IN_PROGRESS
      const res2 = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/transition`)
        .send({
          to: MaintenanceStatus.IN_PROGRESS,
          note: 'Thợ đang sửa',
        })
        .expect(201);
      expect(res2.body.data.status).toBe(MaintenanceStatus.IN_PROGRESS);
    });

    it('TENANT không thể cancel khi ticket đang IN_PROGRESS -> 422', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/cancel`)
        .send({ note: 'Muốn hủy' })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    });

    it('OWNER chuyển IN_PROGRESS -> RESOLVED (kèm chi phí cost)', async () => {
      currentUser = userOwner;
      const res = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/transition`)
        .send({
          to: MaintenanceStatus.RESOLVED,
          note: 'Đã thay vòi sen mới',
          cost: {
            amount: 250000,
            paidBy: 'LANDLORD',
          },
        })
        .expect(201);

      expect(res.body.data.status).toBe(MaintenanceStatus.RESOLVED);
      expect(res.body.data.cost.amount).toBe(250000);
      expect(res.body.data.cost.paidBy).toBe('LANDLORD');
    });

    it('TENANT A mở lại phiếu: RESOLVED -> REOPENED', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/reopen`)
        .send({ note: 'Vòi sen vẫn bị rỉ nước ở ren nối' })
        .expect(201);

      expect(res.body.data.status).toBe(MaintenanceStatus.REOPENED);
    });

    it('OWNER tiếp tục xử lý: REOPENED -> IN_PROGRESS -> RESOLVED', async () => {
      currentUser = userOwner;

      // REOPENED -> IN_PROGRESS
      const res1 = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/transition`)
        .send({
          to: MaintenanceStatus.IN_PROGRESS,
          note: 'Quấn thêm băng tan',
        })
        .expect(201);
      expect(res1.body.data.status).toBe(MaintenanceStatus.IN_PROGRESS);

      // IN_PROGRESS -> RESOLVED
      const res2 = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/transition`)
        .send({
          to: MaintenanceStatus.RESOLVED,
          note: 'Đã xử lý dứt điểm',
        })
        .expect(201);
      expect(res2.body.data.status).toBe(MaintenanceStatus.RESOLVED);
    });

    it('TENANT A xác nhận hoàn tất: RESOLVED -> CONFIRMED', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketAId}/confirm`)
        .send({ note: 'Đã test nước không còn rỉ, cảm ơn chủ trọ!' })
        .expect(201);

      expect(res.body.data.status).toBe(MaintenanceStatus.CONFIRMED);
    });

    it('TENANT hủy phiếu thành công khi ở trạng thái NEW', async () => {
      currentUser = userTenantA;

      // Tạo ticket mới
      const createRes = await request(app.getHttpServer())
        .post('/maintenance-requests')
        .send({
          category: 'ELECTRICAL',
          title: 'Đèn ban công chớp nháy',
          description: 'Bóng đèn huỳnh quang nhấp nháy',
        })
        .expect(201);

      const newTicketId = createRes.body.data._id;

      // Hủy ticket
      const cancelRes = await request(app.getHttpServer())
        .post(`/maintenance-requests/${newTicketId}/cancel`)
        .send({ note: 'Thay bóng led khác tự hết rồi' })
        .expect(201);

      expect(cancelRes.body.data.status).toBe(MaintenanceStatus.CANCELLED);
    });
  });

  // ----------------------------------------------------
  // MESSAGES & TICKET CHAT TESTS
  // ----------------------------------------------------
  describe('Messages & Ticket Chat', () => {
    let ticketId: string;

    beforeAll(async () => {
      // Create fresh ticket for chat test
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post('/maintenance-requests')
        .send({
          category: 'AIR_CONDITIONER',
          title: 'Điều hòa không mát',
          description: 'Bật 16 độ nhưng chỉ có gió quạt',
        });
      ticketId = res.body.data._id;
    });

    it('TENANT A gửi tin nhắn vào ticket của mình thành công', async () => {
      currentUser = userTenantA;
      const res = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketId}/messages`)
        .send({ content: 'Chủ nhà cho hỏi thợ mấy giờ qua vậy ạ?' })
        .expect(201);

      expect(res.body.data.content).toBe('Chủ nhà cho hỏi thợ mấy giờ qua vậy ạ?');
      expect(res.body.data.senderId).toBe('user-tenant-a');
    });

    it('TENANT B không thể gửi tin nhắn vào ticket của TENANT A -> 404 Not Found', async () => {
      currentUser = userTenantB;
      const res = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketId}/messages`)
        .send({ content: 'Tôi là người lạ gửi tin' })
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('OWNER gửi tin nhắn trả lời và đọc tin nhắn', async () => {
      currentUser = userOwner;
      const sendRes = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketId}/messages`)
        .send({ content: 'Khoảng 15h thợ điện lạnh sẽ tới nhé em.' })
        .expect(201);

      expect(sendRes.body.data.content).toBe('Khoảng 15h thợ điện lạnh sẽ tới nhé em.');

      // Đọc danh sách tin nhắn
      const listRes = await request(app.getHttpServer())
        .get(`/maintenance-requests/${ticketId}/messages`)
        .expect(200);

      expect(listRes.body.data.items.length).toBe(2);

      // Đánh dấu đã đọc
      const readRes = await request(app.getHttpServer())
        .post(`/maintenance-requests/${ticketId}/messages/read`)
        .expect(201);

      expect(readRes.body.data.success).toBe(true);
    });

    it('TENANT B không thể xem tin nhắn của ticket của TENANT A -> 404 Not Found', async () => {
      currentUser = userTenantB;
      const res = await request(app.getHttpServer())
        .get(`/maintenance-requests/${ticketId}/messages`)
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });
  });
});
