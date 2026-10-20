import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { PropertyController } from '../src/modules/property/property.controller';
import { RoomController } from '../src/modules/property/room.controller';
import { ContractController } from '../src/modules/contract/contract.controller';
import { InvoiceController } from '../src/modules/invoice/invoice.controller';
import { BillingPeriodController } from '../src/modules/billing-period/billing-period.controller';
import { ReportController } from '../src/modules/report/report.controller';
import { AuditLogController } from '../src/modules/audit-log/audit-log.controller';
import { PropertyService } from '../src/modules/property/property.service';
import { ContractService } from '../src/modules/contract/contract.service';
import { InvoiceService } from '../src/modules/invoice/invoice.service';
import { BillingPeriodService } from '../src/modules/billing-period/billing-period.service';
import { ReportService } from '../src/modules/report/report.service';
import { AuditLogService } from '../src/modules/audit-log/audit-log.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import {
  ErrorCode,
  Permission,
  UserRole,
} from '../src/common/constants';
import { AuthenticatedUser } from '../src/common/types/jwt-payload.interface';
import { ResourceNotFoundException } from '../src/common/exceptions';

describe('Security Hardening & RBAC Isolation E2E Tests', () => {
  let app: INestApplication;
  let currentUser: AuthenticatedUser | null = null;

  const orgA = 'org-security-a';
  const orgB = 'org-security-b';

  const userOwnerOrgA: AuthenticatedUser = {
    userId: 'user-owner-a',
    email: 'owner_a@test.com',
    organizationId: orgA,
    role: UserRole.OWNER,
    permissions: Object.values(Permission),
  };

  const userTenantOrgA: AuthenticatedUser = {
    userId: 'user-tenant-a',
    email: 'tenant_a@test.com',
    organizationId: orgA,
    role: UserRole.TENANT,
    tenantId: 'tenant-a',
    permissions: [Permission.ROOM_READ, Permission.INVOICE_READ],
  };

  const userOwnerOrgB: AuthenticatedUser = {
    userId: 'user-owner-b',
    email: 'owner_b@test.com',
    organizationId: orgB,
    role: UserRole.OWNER,
    permissions: Object.values(Permission),
  };

  beforeAll(async () => {
    const mockPropertyService = {
      createProperty: jest.fn().mockResolvedValue({ _id: 'prop-1' }),
      bulkCreateRooms: jest.fn().mockResolvedValue({ createdCount: 5 }),
      getPropertyById: jest.fn().mockImplementation(async (user, id) => {
        if (id === 'prop-org-a' && user.organizationId !== orgA) {
          throw new ResourceNotFoundException('Property');
        }
        return { _id: id, organizationId: user.organizationId };
      }),
    };

    const mockContractService = {
      createContract: jest.fn().mockResolvedValue({ _id: 'c-1' }),
      getContractById: jest.fn().mockImplementation(async (user, id) => {
        if (id === 'contract-org-a' && user.organizationId !== orgA) {
          throw new ResourceNotFoundException('Contract');
        }
        return { _id: id, organizationId: user.organizationId };
      }),
    };

    const mockInvoiceService = {
      batchIssue: jest.fn().mockResolvedValue({ issuedCount: 2 }),
      getInvoiceById: jest.fn().mockImplementation(async (user, id) => {
        if (id === 'invoice-org-a' && user.organizationId !== orgA) {
          throw new ResourceNotFoundException('Invoice');
        }
        return { _id: id, organizationId: user.organizationId };
      }),
    };

    const mockBillingPeriodService = {
      create: jest.fn().mockResolvedValue({ _id: 'bp-1' }),
    };

    const mockReportService = {
      getRevenueReport: jest.fn().mockResolvedValue({ summary: {} }),
    };

    const mockAuditLogService = {
      getLogs: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [
        PropertyController,
        RoomController,
        ContractController,
        InvoiceController,
        BillingPeriodController,
        ReportController,
        AuditLogController,
      ],
      providers: [
        { provide: PropertyService, useValue: mockPropertyService },
        { provide: ContractService, useValue: mockContractService },
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: BillingPeriodService, useValue: mockBillingPeriodService },
        { provide: ReportService, useValue: mockReportService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: getConnectionToken(), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          if (!currentUser) {
            throw new UnauthorizedException('Authentication token missing or invalid');
          }
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

  // --------------------------------------------------------------------------
  // (a) KIỂM TRA MỌI ENDPOINT KHI KHÔNG CÓ TOKEN -> 401 UNAUTHORIZED
  // --------------------------------------------------------------------------
  describe('(a) Yêu cầu Authentication Token trên toàn bộ route', () => {
    beforeEach(() => {
      currentUser = null; // Giả lập request không gửi Authorization token
    });

    it('POST /properties không có token -> 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/properties')
        .send({ name: 'Nhà trọ Test' })
        .expect(401);

      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('POST /contracts không có token -> 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .send({})
        .expect(401);

      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('POST /billing-periods không có token -> 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/billing-periods')
        .send({})
        .expect(401);

      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('GET /reports/revenue không có token -> 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/revenue')
        .expect(401);

      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('GET /audit-logs không có token -> 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs')
        .expect(401);

      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });

  // --------------------------------------------------------------------------
  // (b) TENANT CỐ TÌNH GỌI ENDPOINT CỦA OWNER -> 403 FORBIDDEN
  // --------------------------------------------------------------------------
  describe('(b) Phân quyền RBAC: TENANT gọi endpoint OWNER -> 403 Forbidden', () => {
    beforeEach(() => {
      currentUser = userTenantOrgA; // Role TENANT
    });

    it('TENANT gọi POST /properties -> 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/properties')
        .send({ name: 'Nhà trọ lậu' })
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('TENANT gọi POST /rooms/bulk -> 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms/bulk')
        .send({})
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('TENANT gọi POST /contracts -> 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .send({})
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('TENANT gọi POST /billing-periods -> 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/billing-periods')
        .send({})
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('TENANT gọi POST /invoices/issue -> 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices/issue')
        .send({ invoiceIds: ['inv-1'] })
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('TENANT gọi GET /reports/revenue -> 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/revenue')
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('TENANT gọi GET /audit-logs -> 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs')
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });
  });

  // --------------------------------------------------------------------------
  // (c) MULTI-TENANT ISOLATION: TOKEN TỔ CHỨC KHÁC TRUY CẬP -> 404 RESOURCE NOT FOUND
  // --------------------------------------------------------------------------
  describe('(c) Bảo mật Multi-tenant: Tổ chức B truy cập tài nguyên của Tổ chức A -> 404', () => {
    beforeEach(() => {
      currentUser = userOwnerOrgB; // Thuộc Organization B
    });

    it('Org B truy cập Property của Org A -> 404 Not Found', async () => {
      const res = await request(app.getHttpServer())
        .get('/properties/prop-org-a')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('Org B truy cập Contract của Org A -> 404 Not Found', async () => {
      const res = await request(app.getHttpServer())
        .get('/contracts/contract-org-a')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('Org B truy cập Invoice của Org A -> 404 Not Found', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices/invoice-org-a')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });
  });
});
