import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { PropertyController } from '../src/modules/property/property.controller';
import { RoomController } from '../src/modules/property/room.controller';
import { TenantController } from '../src/modules/tenant/tenant.controller';
import { PropertyService } from '../src/modules/property/property.service';
import { TenantService } from '../src/modules/tenant/tenant.service';
import { PropertyRepository } from '../src/modules/property/repositories/property.repository';
import { RoomRepository } from '../src/modules/property/repositories/room.repository';
import { TenantRepository } from '../src/modules/tenant/tenant.repository';
import { Invoice } from '../src/modules/invoice/schemas/invoice.schema';
import { Contract } from '../src/modules/contract/schemas/contract.schema';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ErrorCode, RoomStatus, UserRole } from '../src/common/constants';
import { CccdCrypto } from '../src/common/utils/cccd-crypto';
import { AuthenticatedUser } from '../src/common/types/jwt-payload.interface';
import { ResourceNotFoundException } from '../src/common/exceptions';

describe('Organization Isolation & Tenant Scoping E2E Tests', () => {
  let app: INestApplication;

  // Active mock user injected by JwtAuthGuard override
  let currentUser: AuthenticatedUser;

  // In-memory data store for testing multi-tenant isolation
  const rawCccd1 = '012345678901';
  const rawCccd2 = '098765432109';
  const encCccd1 = CccdCrypto.encrypt(rawCccd1);
  const encCccd2 = CccdCrypto.encrypt(rawCccd2);

  const mockDb: {
    properties: any[];
    rooms: any[];
    tenants: any[];
    contracts: any[];
  } = {
    properties: [
      {
        _id: 'prop-A-1',
        organizationId: 'org-A',
        name: 'Toa Nha A - Quan 1',
        address: '123 Le Loi, Q1',
        isActive: true,
        bankAccount: { bankCode: 'VCB', accountNo: '123456', accountName: 'NGUYEN VAN A' },
        billingConfig: { electricityUnitPrice: 3500, waterUnitPrice: 25000 },
      },
      {
        _id: 'prop-B-1',
        organizationId: 'org-B',
        name: 'Toa Nha B - Binh Thanh',
        address: '456 Xo Viet Nghe Tinh, BT',
        isActive: true,
        bankAccount: { bankCode: 'MB', accountNo: '654321', accountName: 'TRAN VAN B' },
        billingConfig: { electricityUnitPrice: 4000, waterUnitPrice: 30000 },
      },
    ],
    rooms: [
      {
        _id: 'room-A-1',
        organizationId: 'org-A',
        propertyId: 'prop-A-1',
        code: 'A101',
        floor: 1,
        area: 25,
        baseRent: 4000000,
        status: RoomStatus.OCCUPIED,
        currentContractId: 'contract-A-1',
        deletedAt: null,
      },
      {
        _id: 'room-A-2',
        organizationId: 'org-A',
        propertyId: 'prop-A-1',
        code: 'A102',
        floor: 1,
        area: 25,
        baseRent: 4200000,
        status: RoomStatus.OCCUPIED,
        currentContractId: 'contract-A-2',
        deletedAt: null,
      },
      {
        _id: 'room-A-3',
        organizationId: 'org-A',
        propertyId: 'prop-A-1',
        code: 'A103',
        floor: 1,
        area: 30,
        baseRent: 5000000,
        status: RoomStatus.VACANT,
        currentContractId: null,
        deletedAt: null,
      },
      {
        _id: 'room-B-1',
        organizationId: 'org-B',
        propertyId: 'prop-B-1',
        code: 'B101',
        floor: 1,
        area: 20,
        baseRent: 3500000,
        status: RoomStatus.VACANT,
        currentContractId: null,
        deletedAt: null,
      },
    ],
    tenants: [
      {
        _id: 'tenant-A-1',
        organizationId: 'org-A',
        fullName: 'Le Thi Hoa',
        phone: '0901111111',
        idCard: { numberEnc: encCccd1, numberLast4: '8901' },
        isActive: true,
      },
      {
        _id: 'tenant-A-2',
        organizationId: 'org-A',
        fullName: 'Pham Van Binh',
        phone: '0902222222',
        idCard: { numberEnc: encCccd2, numberLast4: '2109' },
        isActive: true,
      },
      {
        _id: 'tenant-B-1',
        organizationId: 'org-B',
        fullName: 'Dang Van Cuong',
        phone: '0903333333',
        idCard: { numberEnc: encCccd1, numberLast4: '8901' },
        isActive: true,
      },
    ],
    contracts: [
      {
        _id: 'contract-A-1',
        organizationId: 'org-A',
        propertyId: 'prop-A-1',
        roomId: 'room-A-1',
        tenantId: 'tenant-A-1',
        isCurrent: true,
      },
      {
        _id: 'contract-A-2',
        organizationId: 'org-A',
        propertyId: 'prop-A-1',
        roomId: 'room-A-2',
        tenantId: 'tenant-A-2',
        isCurrent: true,
      },
    ],
  };

  const mockPropertyRepo = {
    create: jest.fn().mockImplementation((orgId, data) =>
      Promise.resolve({ _id: 'prop-new', organizationId: orgId, ...data }),
    ),
    findById: jest.fn().mockImplementation((orgId, id) => {
      const found = mockDb.properties.find(
        (p) => p.organizationId === orgId && p._id === id,
      );
      return Promise.resolve(found || null);
    }),
    findByIdOrThrow: jest.fn().mockImplementation(async (orgId, id, name = 'Property') => {
      const found = mockDb.properties.find(
        (p) => p.organizationId === orgId && p._id === id,
      );
      if (!found) {
        throw new ResourceNotFoundException(name);
      }
      return found;
    }),
    findPaginated: jest.fn().mockImplementation((orgId, filter, page = 1, limit = 20) => {
      const items = mockDb.properties.filter((p) => p.organizationId === orgId);
      return Promise.resolve({
        data: items,
        meta: { page, limit, totalItems: items.length, totalPages: 1 },
      });
    }),
    updateOne: jest.fn().mockImplementation((orgId, query, update) => {
      const prop = mockDb.properties.find(
        (p) => p.organizationId === orgId && p._id === query._id,
      );
      if (!prop) return Promise.resolve(null);
      Object.assign(prop, update.$set);
      return Promise.resolve(prop);
    }),
  };

  const mockRoomRepo = {
    create: jest.fn().mockImplementation((orgId, data) =>
      Promise.resolve({ _id: 'room-new', organizationId: orgId, ...data }),
    ),
    findById: jest.fn().mockImplementation((orgId, id) => {
      const found = mockDb.rooms.find(
        (r) => r.organizationId === orgId && r._id === id && !r.deletedAt,
      );
      return Promise.resolve(found || null);
    }),
    findByPropertyAndCode: jest.fn().mockImplementation((orgId, propId, code) => {
      const found = mockDb.rooms.find(
        (r) =>
          r.organizationId === orgId &&
          r.propertyId === propId &&
          r.code === code &&
          !r.deletedAt,
      );
      return Promise.resolve(found || null);
    }),
    findRoomsByProperty: jest.fn().mockImplementation((orgId, propId) => {
      const found = mockDb.rooms.filter(
        (r) => r.organizationId === orgId && r.propertyId === propId && !r.deletedAt,
      );
      return Promise.resolve(found);
    }),
    countByStatus: jest.fn().mockImplementation((orgId, propId, status) => {
      const filtered = mockDb.rooms.filter((r) => {
        if (r.organizationId !== orgId || r.propertyId !== propId || r.deletedAt) return false;
        return status ? r.status === status : true;
      });
      return Promise.resolve(filtered.length);
    }),
    updateOne: jest.fn().mockImplementation((orgId, query, update) => {
      const room = mockDb.rooms.find(
        (r) => r.organizationId === orgId && r._id === query._id && !r.deletedAt,
      );
      if (!room) return Promise.resolve(null);
      Object.assign(room, update.$set);
      return Promise.resolve(room);
    }),
    softDelete: jest.fn().mockImplementation((orgId, id) => {
      const room = mockDb.rooms.find(
        (r) => r.organizationId === orgId && r._id === id && !r.deletedAt,
      );
      if (room) room.deletedAt = new Date();
      return Promise.resolve(room || null);
    }),
    bulkInsert: jest.fn().mockImplementation((orgId, rooms) => {
      return Promise.resolve(rooms.map((r: any, idx: number) => ({ ...r, _id: `bulk-${idx}` })));
    }),
    findPaginated: jest.fn().mockImplementation((orgId, filter, page = 1, limit = 20) => {
      const filtered = mockDb.rooms.filter((r) => {
        if (r.organizationId !== orgId || r.deletedAt) return false;
        if (filter.propertyId && r.propertyId !== filter.propertyId) return false;
        if (filter._id && r._id !== filter._id) return false;
        return true;
      });
      return Promise.resolve({
        data: filtered,
        meta: { page, limit, totalItems: filtered.length, totalPages: 1 },
      });
    }),
  };

  const mockTenantRepo = {
    create: jest.fn().mockImplementation((orgId, data) =>
      Promise.resolve({ _id: 'tenant-new', organizationId: orgId, ...data }),
    ),
    findById: jest.fn().mockImplementation((orgId, id) => {
      const found = mockDb.tenants.find(
        (t) => t.organizationId === orgId && t._id === id && t.isActive,
      );
      return Promise.resolve(found || null);
    }),
    findByPhone: jest.fn().mockImplementation((orgId, phone) => {
      const found = mockDb.tenants.find(
        (t) => t.organizationId === orgId && t.phone === phone,
      );
      return Promise.resolve(found || null);
    }),
    updateOne: jest.fn().mockImplementation((orgId, query, update) => {
      const tenant = mockDb.tenants.find(
        (t) => t.organizationId === orgId && t._id === query._id,
      );
      if (!tenant) return Promise.resolve(null);
      Object.assign(tenant, update.$set);
      return Promise.resolve(tenant);
    }),
    findPaginated: jest.fn().mockImplementation((orgId, filter, page = 1, limit = 20) => {
      const filtered = mockDb.tenants.filter((t) => t.organizationId === orgId && t.isActive);
      return Promise.resolve({
        data: filtered,
        meta: { page, limit, totalItems: filtered.length, totalPages: 1 },
      });
    }),
  };

  const mockInvoiceModel = {
    aggregate: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockContractModel = {
    findOne: jest.fn().mockImplementation((query) => {
      const found = mockDb.contracts.find(
        (c) =>
          c.organizationId === query.organizationId &&
          c.tenantId === query.tenantId &&
          c.isCurrent === query.isCurrent,
      );
      return Promise.resolve(found || null);
    }),
    findById: jest.fn().mockImplementation((id) => {
      const found = mockDb.contracts.find((c) => c._id === id);
      return Promise.resolve(found || null);
    }),
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockAuthService = {
    createTenantInvitation: jest.fn().mockResolvedValue({
      inviteToken: 'mock-invite-token-7days',
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController, RoomController, TenantController],
      providers: [
        PropertyService,
        TenantService,
        { provide: PropertyRepository, useValue: mockPropertyRepo },
        { provide: RoomRepository, useValue: mockRoomRepo },
        { provide: TenantRepository, useValue: mockTenantRepo },
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
        { provide: getModelToken(Contract.name), useValue: mockContractModel },
        { provide: AuthService, useValue: mockAuthService },
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
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // SUITE 1: MULTI-TENANT ISOLATION (CHỦ TRỌ ORG-A KHÔNG THỂ TRUY CẬP ORG-B)
  // Quy tắc cốt lõi: Truy cập chéo tổ chức trả về 404 NOT FOUND (KHÔNG PHẢI 403)
  // =========================================================================
  describe('Suite 1: Organization Isolation (Org A vs Org B)', () => {
    beforeEach(() => {
      currentUser = {
        userId: 'user-owner-A',
        email: 'ownerA@example.com',
        organizationId: 'org-A',
        role: UserRole.OWNER,
        permissions: [],
      };
    });

    it('GET /api/v1/properties/:id (Org A đọc Property của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/properties/prop-B-1')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('PATCH /api/v1/properties/:id (Org A sửa Property của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/properties/prop-B-1')
        .send({ name: 'Hacked Property Name' })
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('POST /api/v1/properties/:id/deactivate (Org A vô hiệu hóa Property của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/prop-B-1/deactivate')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('GET /api/v1/properties/:id/dashboard (Org A xem Dashboard của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/properties/prop-B-1/dashboard')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('GET /api/v1/rooms/:id (Org A đọc Room của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rooms/room-B-1')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('PATCH /api/v1/rooms/:id (Org A sửa Room của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/rooms/room-B-1')
        .send({ baseRent: 9999999 })
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('DELETE /api/v1/rooms/:id (Org A xóa Room của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/rooms/room-B-1')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('POST /api/v1/rooms/:id/status (Org A đổi status Room của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rooms/room-B-1/status')
        .send({ status: RoomStatus.MAINTENANCE })
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('GET /api/v1/tenants/:id (Org A đọc hồ sơ Tenant của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-B-1')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('PATCH /api/v1/tenants/:id (Org A sửa hồ sơ Tenant của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/tenants/tenant-B-1')
        .send({ fullName: 'Malicious Change' })
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('GET /api/v1/tenants/:id/history (Org A xem lịch sử Tenant của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-B-1/history')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('POST /api/v1/tenants/:id/invite (Org A mời Tenant của Org B -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenants/tenant-B-1/invite')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });
  });

  // =========================================================================
  // SUITE 2: TENANT SCOPING & ROLE PERMISSIONS (TENANT CHỈ ĐỌC PHÒNG/HỒ SƠ MÌNH)
  // =========================================================================
  describe('Suite 2: Tenant Scoping & RBAC Rules', () => {
    beforeEach(() => {
      // User là Tenant A-1 (thuộc Org A, đang thuê room-A-1)
      currentUser = {
        userId: 'user-tenant-A1',
        email: 'tenantA1@example.com',
        organizationId: 'org-A',
        role: UserRole.TENANT,
        tenantId: 'tenant-A-1',
        permissions: [],
      };
    });

    it('GET /api/v1/rooms/:id (TENANT đọc phòng của chính mình -> 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rooms/room-A-1')
        .expect(200);

      expect(res.body.data._id).toBe('room-A-1');
      expect(res.body.data.code).toBe('A101');
    });

    it('GET /api/v1/rooms/:id (TENANT đọc phòng của người khác trong cùng Org -> 404 NOT_FOUND)', async () => {
      // Tenant A-1 cố truy cập room-A-2 (thuộc hợp đồng của Tenant A-2)
      const res = await request(app.getHttpServer())
        .get('/api/v1/rooms/room-A-2')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('GET /api/v1/rooms/:id (TENANT đọc phòng trống không có hợp đồng -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rooms/room-A-3')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('GET /api/v1/tenants/:id (TENANT đọc hồ sơ của chính mình -> 200 OK, giải mã CCCD)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-A-1')
        .expect(200);

      expect(res.body.data._id).toBe('tenant-A-1');
      expect(res.body.data.fullName).toBe('Le Thi Hoa');
      // CCCD được giải mã hoàn chỉnh cho chính chủ
      expect(res.body.data.idCard.number).toBe(rawCccd1);
    });

    it('GET /api/v1/tenants/:id (TENANT đọc hồ sơ của khách thuê khác -> 404 NOT_FOUND)', async () => {
      // Tenant A-1 cố xem hồ sơ của Tenant A-2
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-A-2')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('GET /api/v1/tenants/:id/history (TENANT xem lịch sử của chính mình -> 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-A-1/history')
        .expect(200);

      expect(res.body.data).toHaveProperty('tenant');
      expect(res.body.data).toHaveProperty('contracts');
    });

    it('GET /api/v1/tenants/:id/history (TENANT xem lịch sử khách thuê khác -> 404 NOT_FOUND)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants/tenant-A-2/history')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('RBAC Guard: TENANT tạo tài sản (POST /properties) -> 403 FORBIDDEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .send({
          name: 'Nha Tro Trai Phep',
          address: '789 Duong X',
          bankAccount: { bankCode: 'VCB', accountNo: '111', accountName: 'LE THI HOA' },
        })
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('RBAC Guard: TENANT tạo phòng (POST /rooms) -> 403 FORBIDDEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .send({
          propertyId: 'prop-A-1',
          code: 'A999',
          floor: 1,
          area: 20,
          baseRent: 3000000,
        })
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('RBAC Guard: TENANT xóa phòng (DELETE /rooms/:id) -> 403 FORBIDDEN', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/rooms/room-A-1')
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('RBAC Guard: TENANT đổi status phòng (POST /rooms/:id/status) -> 403 FORBIDDEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rooms/room-A-1/status')
        .send({ status: RoomStatus.VACANT })
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('RBAC Guard: TENANT gửi lời mời (POST /tenants/:id/invite) -> 403 FORBIDDEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenants/tenant-A-1/invite')
        .expect(403);

      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });
  });

  // =========================================================================
  // SUITE 3: ROOM STATE & SOFT DELETE BUSINESS RULES QUA HTTP
  // =========================================================================
  describe('Suite 3: Room Soft Delete & State Rules via HTTP', () => {
    beforeEach(() => {
      currentUser = {
        userId: 'user-owner-A',
        email: 'ownerA@example.com',
        organizationId: 'org-A',
        role: UserRole.OWNER,
        permissions: [],
      };
    });

    it('DELETE /api/v1/rooms/:id (CHẶN xóa mềm khi phòng đang OCCUPIED -> 422 BUSINESS_RULE_VIOLATION)', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/rooms/room-A-1') // room-A-1 is OCCUPIED
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    });

    it('DELETE /api/v1/rooms/:id (cho phép xóa mềm khi phòng là VACANT -> 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/rooms/room-A-3') // room-A-3 is VACANT
        .expect(200);

      expect(res.body.data.id).toBe('room-A-3');
    });

    it('POST /api/v1/rooms/:id/status (CHẶN đổi status khi phòng đang OCCUPIED -> 422 BUSINESS_RULE_VIOLATION)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rooms/room-A-1/status')
        .send({ status: RoomStatus.MAINTENANCE })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    });
  });
});
