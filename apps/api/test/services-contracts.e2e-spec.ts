import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { ServiceController } from '../src/modules/service/service.controller';
import { ServiceService } from '../src/modules/service/service.service';
import { ServiceRepository } from '../src/modules/service/repositories/service.repository';
import {
  ContractController,
  MoveInController,
} from '../src/modules/contract/contract.controller';
import { ContractService } from '../src/modules/contract/contract.service';
import { ContractRepository } from '../src/modules/contract/contract.repository';
import { RoomRepository } from '../src/modules/property/repositories/room.repository';
import { TenantRepository } from '../src/modules/tenant/tenant.repository';
import { PropertyRepository } from '../src/modules/property/repositories/property.repository';
import { CounterRepository } from '../src/modules/auth/repositories/counter.repository';
import { AuthService } from '../src/modules/auth/auth.service';
import { MeterReading } from '../src/modules/meter-reading/schemas/meter-reading.schema';
import { Invoice } from '../src/modules/invoice/schemas/invoice.schema';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import {
  ContractStatus,
  DepositStatus,
  DepositLedgerType,
  ErrorCode,
  RoomStatus,
  ServiceCalcMethod,
  ServiceType,
  UserRole,
} from '../src/common/constants';
import { AuthenticatedUser } from '../src/common/types/jwt-payload.interface';

describe('Services & Contracts E2E Tests', () => {
  let app: INestApplication;
  let currentUser: AuthenticatedUser;

  // In-memory data store for E2E tests
  const mockDb: {
    services: any[];
    contracts: any[];
    rooms: any[];
    tenants: any[];
    properties: any[];
  } = {
    services: [
      {
        _id: 'srv-1',
        organizationId: 'org-1',
        code: 'ELEC',
        name: 'Điện sinh hoạt',
        type: ServiceType.UTILITY,
        unit: 'kWh',
        calcMethod: ServiceCalcMethod.METER,
        unitPrice: 3500,
        scope: { propertyIds: [] },
        priceHistory: [{ unitPrice: 3500, effectiveFrom: new Date('2026-01-01') }],
        isActive: true,
      },
    ],
    properties: [
      {
        _id: 'prop-1',
        organizationId: 'org-1',
        name: 'Nhà trọ Bình An',
        billingConfig: { electricityUnitPrice: 3500, waterUnitPrice: 25000 },
        isActive: true,
      },
    ],
    rooms: [
      {
        _id: 'room-1',
        organizationId: 'org-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.VACANT,
        currentContractId: null,
        deletedAt: null,
      },
      {
        _id: 'room-occupied',
        organizationId: 'org-1',
        propertyId: 'prop-1',
        code: '102',
        status: RoomStatus.OCCUPIED,
        currentContractId: 'contract-active-1',
        deletedAt: null,
      },
    ],
    tenants: [
      {
        _id: 'tenant-1',
        organizationId: 'org-1',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        isActive: true,
      },
    ],
    contracts: [
      {
        _id: 'contract-active-1',
        organizationId: 'org-1',
        contractNo: 'HD-2026-0001',
        propertyId: 'prop-1',
        roomId: 'room-occupied',
        primaryTenantId: 'tenant-1',
        tenantId: 'tenant-1',
        rent: 4000000,
        deposit: {
          amount: 4000000,
          status: DepositStatus.COLLECTED,
          ledger: [{ type: DepositLedgerType.COLLECTED, amount: 4000000, date: new Date() }],
        },
        status: ContractStatus.ACTIVE,
        isCurrent: true,
        version: 1,
        revisions: [],
      },
    ],
  };

  const mockServiceRepo = {
    create: jest.fn().mockImplementation((orgId, data) => {
      const created = { _id: `srv-${Date.now()}`, organizationId: orgId, ...data };
      mockDb.services.push(created);
      return Promise.resolve(created);
    }),
    findById: jest.fn().mockImplementation((orgId, id) => {
      const found = mockDb.services.find((s) => s.organizationId === orgId && s._id === id);
      return Promise.resolve(found || null);
    }),
    findByCode: jest.fn().mockImplementation((orgId, code) => {
      const found = mockDb.services.find(
        (s) => s.organizationId === orgId && s.code === code.toUpperCase().trim(),
      );
      return Promise.resolve(found || null);
    }),
    findPaginated: jest.fn().mockImplementation((orgId) => {
      const items = mockDb.services.filter((s) => s.organizationId === orgId);
      return Promise.resolve({
        data: items,
        meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
      });
    }),
    updateOne: jest.fn().mockImplementation((orgId, query, update) => {
      const srv = mockDb.services.find((s) => s.organizationId === orgId && s._id === query._id);
      if (!srv) return Promise.resolve(null);
      if (update.$set) Object.assign(srv, update.$set);
      if (update.$push?.priceHistory) srv.priceHistory.push(update.$push.priceHistory);
      return Promise.resolve(srv);
    }),
  };

  const mockContractRepo = {
    create: jest.fn().mockImplementation((orgId, data) => {
      const created = { _id: `contract-${Date.now()}`, organizationId: orgId, ...data };
      mockDb.contracts.push(created);
      return Promise.resolve(created);
    }),
    findById: jest.fn().mockImplementation((orgId, id) => {
      const found = mockDb.contracts.find((c) => c.organizationId === orgId && c._id === id);
      return Promise.resolve(found || null);
    }),
    findByIdOrThrow: jest.fn().mockImplementation(async (orgId, id, name = 'Contract') => {
      const found = mockDb.contracts.find((c) => c.organizationId === orgId && c._id === id);
      if (!found) {
        const { ResourceNotFoundException } = await import('../src/common/exceptions');
        throw new ResourceNotFoundException(name);
      }
      return found;
    }),
    findActiveContractByRoom: jest.fn().mockImplementation((orgId, roomId) => {
      const found = mockDb.contracts.find(
        (c) => c.organizationId === orgId && c.roomId === roomId && c.isCurrent === true,
      );
      return Promise.resolve(found || null);
    }),
    findPaginated: jest.fn().mockImplementation((orgId) => {
      const items = mockDb.contracts.filter((c) => c.organizationId === orgId);
      return Promise.resolve({
        data: items,
        meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
      });
    }),
    updateOne: jest.fn().mockImplementation((orgId, query, update) => {
      const contract = mockDb.contracts.find((c) => c.organizationId === orgId && c._id === query._id);
      if (!contract) return Promise.resolve(null);
      if (update.$set) Object.assign(contract, update.$set);
      if (update.$inc?.version) contract.version = (contract.version || 1) + update.$inc.version;
      if (update.$push?.revisions) contract.revisions.push(update.$push.revisions);
      if (update.$push?.['deposit.ledger']) {
        contract.deposit.ledger.push(...update.$push['deposit.ledger'].$each);
      }
      return Promise.resolve(contract);
    }),
    getModel: jest.fn().mockReturnValue({
      create: jest.fn().mockImplementation((payload) => {
        const doc = Array.isArray(payload) ? payload[0] : payload;
        const created = { _id: `contract-${Date.now()}`, ...doc };
        mockDb.contracts.push(created);
        return Promise.resolve(Array.isArray(payload) ? [created] : created);
      }),
    }),
  };

  const mockRoomRepo = {
    findById: jest.fn().mockImplementation((orgId, id) => {
      const found = mockDb.rooms.find((r) => r.organizationId === orgId && r._id === id);
      return Promise.resolve(found || null);
    }),
    findByIdOrThrow: jest.fn().mockImplementation(async (orgId, id) => {
      const found = mockDb.rooms.find((r) => r.organizationId === orgId && r._id === id);
      if (!found) {
        const { ResourceNotFoundException } = await import('../src/common/exceptions');
        throw new ResourceNotFoundException('Room');
      }
      return found;
    }),
    updateOne: jest.fn().mockImplementation((orgId, query, update) => {
      const room = mockDb.rooms.find((r) => r.organizationId === orgId && r._id === query._id);
      if (room && update.$set) Object.assign(room, update.$set);
      return Promise.resolve(room);
    }),
  };

  const mockTenantRepo = {
    findById: jest.fn().mockImplementation((orgId, id) => {
      const found = mockDb.tenants.find((t) => t.organizationId === orgId && t._id === id);
      return Promise.resolve(found || null);
    }),
    findByIdOrThrow: jest.fn().mockImplementation(async (orgId, id) => {
      const found = mockDb.tenants.find((t) => t.organizationId === orgId && t._id === id);
      if (!found) {
        const { ResourceNotFoundException } = await import('../src/common/exceptions');
        throw new ResourceNotFoundException('Tenant');
      }
      return found;
    }),
    findByPhone: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((orgId, data) => {
      const created = { _id: `tenant-${Date.now()}`, organizationId: orgId, ...data };
      mockDb.tenants.push(created);
      return Promise.resolve(created);
    }),
  };

  const mockPropertyRepo = {
    findById: jest.fn().mockImplementation((orgId, id) => {
      const found = mockDb.properties.find((p) => p.organizationId === orgId && p._id === id);
      return Promise.resolve(found || null);
    }),
    findByIdOrThrow: jest.fn().mockImplementation(async (orgId, id) => {
      const found = mockDb.properties.find((p) => p.organizationId === orgId && p._id === id);
      if (!found) {
        const { ResourceNotFoundException } = await import('../src/common/exceptions');
        throw new ResourceNotFoundException('Property');
      }
      return found;
    }),
  };

  const mockCounterRepo = {
    getNextSequence: jest.fn().mockResolvedValue(105),
  };

  const mockAuthService = {
    createTenantInvitation: jest.fn().mockResolvedValue({ inviteToken: 'test-invite-token' }),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
  };

  const mockMeterReadingModel = {
    create: jest.fn().mockResolvedValue({}),
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ electricityNew: 100, waterNew: 10 }),
    }),
  };

  const mockInvoiceModel = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ServiceController, ContractController, MoveInController],
      providers: [
        ServiceService,
        ContractService,
        { provide: ServiceRepository, useValue: mockServiceRepo },
        { provide: ContractRepository, useValue: mockContractRepo },
        { provide: RoomRepository, useValue: mockRoomRepo },
        { provide: TenantRepository, useValue: mockTenantRepo },
        { provide: PropertyRepository, useValue: mockPropertyRepo },
        { provide: CounterRepository, useValue: mockCounterRepo },
        { provide: AuthService, useValue: mockAuthService },
        { provide: 'DatabaseConnection', useValue: mockConnection },
        { provide: getModelToken(MeterReading.name), useValue: mockMeterReadingModel },
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
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

  // ==========================================
  // 1. SERVICES MODULE TESTS
  // ==========================================
  describe('1. Services Module (GET/POST /services, PATCH /services/:id)', () => {
    beforeEach(() => {
      currentUser = {
        userId: 'owner-1',
        email: 'owner@example.com',
        organizationId: 'org-1',
        role: UserRole.OWNER,
        permissions: [],
      };
    });

    it('POST /api/v1/services (Tạo mới dịch vụ kèm priceHistory ban đầu)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/services')
        .send({
          code: 'WATER',
          name: 'Nước sinh hoạt',
          type: ServiceType.UTILITY,
          unit: 'm3',
          calcMethod: ServiceCalcMethod.METER,
          unitPrice: 25000,
        })
        .expect(201);

      expect(res.body.data.code).toBe('WATER');
      expect(res.body.data.unitPrice).toBe(25000);
      expect(res.body.data.priceHistory).toHaveLength(1);
    });

    it('GET /api/v1/services (Danh sách dịch vụ phân trang)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/services')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('PATCH /api/v1/services/:id (Đổi giá -> push priceHistory { unitPrice, effectiveFrom })', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/services/srv-1')
        .send({
          unitPrice: 3800,
          effectiveFrom: '2026-11-01T00:00:00.000Z',
        })
        .expect(200);

      expect(res.body.data.unitPrice).toBe(3800);
      expect(res.body.data.priceHistory.length).toBeGreaterThanOrEqual(2);
      const latestPrice = res.body.data.priceHistory[res.body.data.priceHistory.length - 1];
      expect(latestPrice.unitPrice).toBe(3800);
    });
  });

  // ==========================================
  // 2. CONTRACTS ENDPOINTS & LIFECYCLE
  // ==========================================
  describe('2. Contracts Endpoints & Lifecycle', () => {
    beforeEach(() => {
      currentUser = {
        userId: 'owner-1',
        email: 'owner@example.com',
        organizationId: 'org-1',
        role: UserRole.OWNER,
        permissions: [],
      };
    });

    it('POST /api/v1/contracts (Tạo hợp đồng trạng thái PENDING)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contracts')
        .send({
          propertyId: 'prop-1',
          roomId: 'room-1',
          primaryTenantId: 'tenant-1',
          startDate: '2026-10-15',
          endDate: '2027-10-15',
          dueDay: 5,
          rent: 3500000,
          depositAmount: 3500000,
        })
        .expect(201);

      expect(res.body.data.contractNo).toMatch(/^HD-2026-\d+/);
      expect(res.body.data.status).toBe(ContractStatus.PENDING);
      expect(res.body.data.isCurrent).toBe(false);
    });

    it('PATCH /api/v1/contracts/:id (Chỉ sửa trường phi tài chính, chặn sửa rent/deposit -> 422)', async () => {
      // Cố tình sửa rent trực tiếp
      const errRes = await request(app.getHttpServer())
        .patch('/api/v1/contracts/contract-active-1')
        .send({ rent: 9999999 })
        .expect(422);

      expect(errRes.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);

      // Sửa hợp lệ trường phi tài chính (terms, dueDay)
      const successRes = await request(app.getHttpServer())
        .patch('/api/v1/contracts/contract-active-1')
        .send({ terms: 'Khong gay on ào sau 23h', dueDay: 7 })
        .expect(200);

      expect(successRes.body.data.terms).toBe('Khong gay on ào sau 23h');
      expect(successRes.body.data.dueDay).toBe(7);
    });

    it('POST /api/v1/contracts/:id/revisions (Đổi giá kèm reason -> thêm revision, tăng version)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contracts/contract-active-1/revisions')
        .send({
          reason: 'Lắp thêm tủ lạnh và tăng giá thuê',
          rent: 4300000,
        })
        .expect(200);

      expect(res.body.data.rent).toBe(4300000);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.revisions).toHaveLength(1);
      expect(res.body.data.revisions[0].reason).toBe('Lắp thêm tủ lạnh và tăng giá thuê');
    });

    it('POST /api/v1/contracts/:id/deposit (Ghi nhận nộp cọc / trừ cọc vào ledger)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contracts/contract-active-1/deposit')
        .send({
          type: DepositLedgerType.COLLECTED,
          amount: 1000000,
          reason: 'Thu bo sung tien coc',
        })
        .expect(200);

      expect(res.body.data.deposit.ledger.length).toBeGreaterThan(0);
      expect(res.body.data.deposit.status).toBe(DepositStatus.COLLECTED);
    });
  });

  // ==========================================
  // 3. MOVE-IN & MOVE-OUT WORKFLOWS
  // ==========================================
  describe('3. Move-in & Move-out Endpoints', () => {
    beforeEach(() => {
      currentUser = {
        userId: 'owner-1',
        email: 'owner@example.com',
        organizationId: 'org-1',
        role: UserRole.OWNER,
        permissions: [],
      };
    });

    it('POST /api/v1/move-in (1 atomic transaction: tenant + contract ACTIVE + meter reading LOCKED + room OCCUPIED)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/move-in')
        .send({
          propertyId: 'prop-1',
          roomId: 'room-1',
          newTenant: {
            fullName: 'Lê Văn Cường',
            phone: '0933221100',
            cccdNumber: '079201009988',
          },
          startDate: '2026-10-10',
          endDate: '2027-10-10',
          rent: 3800000,
          depositAmount: 3800000,
          initialMeterReading: { electricity: 120, water: 25 },
        })
        .expect(201);

      expect(res.body.data.contract.status).toBe(ContractStatus.ACTIVE);
      expect(res.body.data.contract.isCurrent).toBe(true);
      expect(res.body.data.initialMeterReading.status).toBe('LOCKED');
      expect(res.body.data.invitationToken).toBe('test-invite-token');
      // Phòng chuyển sang OCCUPIED
      const room = mockDb.rooms.find((r) => r._id === 'room-1');
      expect(room?.status).toBe(RoomStatus.OCCUPIED);
    });

    it('POST /api/v1/contracts/:id/move-out/preview (Tính hóa đơn cuối prorate, đối trừ cọc, KHÔNG ghi database)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contracts/contract-active-1/move-out/preview')
        .send({
          moveOutDate: '2026-10-15',
          finalMeterReading: { electricity: 140, water: 15 },
          additionalCharges: [{ description: 'Sơn lại tường bị bẩn', amount: 200000 }],
        })
        .expect(200);

      expect(res.body.data).toHaveProperty('breakdown');
      expect(res.body.data).toHaveProperty('settlement');
      expect(res.body.data.breakdown.proratedRent.amount).toBeGreaterThan(0);
      expect(res.body.data.settlement.refundToTenant).toBeGreaterThanOrEqual(0);
    });

    it('POST /api/v1/contracts/:id/move-out (Chốt trả phòng: contract TERMINATED, room VACANT, isCurrent=false)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contracts/contract-active-1/move-out')
        .send({
          moveOutDate: '2026-10-15',
          finalMeterReading: { electricity: 140, water: 15 },
          reason: 'Hết hạn hợp đồng',
        })
        .expect(200);

      expect(res.body.data.roomStatus).toBe(RoomStatus.VACANT);
      expect(res.body.data.contract.status).toBe(ContractStatus.TERMINATED);
      expect(res.body.data.contract.isCurrent).toBe(false);

      // Phòng 102 được giải phóng về VACANT
      const room = mockDb.rooms.find((r) => r._id === 'room-occupied');
      expect(room?.status).toBe(RoomStatus.VACANT);
      expect(room?.currentContractId).toBeNull();
    });
  });

  // ==========================================
  // 4. TENANT SCOPING: CHỈ XEM HỢP ĐỒNG CỦA CHÍNH MÌNH
  // ==========================================
  describe('4. Tenant Scoping Protection', () => {
    it('TENANT chỉ xem được hợp đồng của chính mình, xem hợp đồng người khác -> 404 NOT FOUND', async () => {
      // User là tenant-1
      currentUser = {
        userId: 'tenant-user-1',
        email: 'tenant1@example.com',
        organizationId: 'org-1',
        role: UserRole.TENANT,
        tenantId: 'tenant-1',
        permissions: [],
      };

      // Đọc hợp đồng của mình -> 200 OK
      const selfRes = await request(app.getHttpServer())
        .get('/api/v1/contracts/contract-active-1')
        .expect(200);
      expect(selfRes.body.data._id).toBe('contract-active-1');

      // Đổi sang user là tenant-OTHER -> cố truy cập contract-active-1 -> 404 NOT FOUND!
      currentUser = {
        userId: 'tenant-user-other',
        email: 'other@example.com',
        organizationId: 'org-1',
        role: UserRole.TENANT,
        tenantId: 'tenant-OTHER-999',
        permissions: [],
      };

      const crossRes = await request(app.getHttpServer())
        .get('/api/v1/contracts/contract-active-1')
        .expect(404);

      expect(crossRes.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });
  });
});
