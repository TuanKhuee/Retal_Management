import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { BillingPeriodController } from '../src/modules/billing-period/billing-period.controller';
import { BillingPeriodService } from '../src/modules/billing-period/billing-period.service';
import { BillingPeriodRepository } from '../src/modules/billing-period/repositories/billing-period.repository';
import { InvoiceController } from '../src/modules/invoice/invoice.controller';
import { DebtController } from '../src/modules/invoice/debt.controller';
import { InvoiceService } from '../src/modules/invoice/invoice.service';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository';
import {
  PaymentController,
  PaymentClaimController,
} from '../src/modules/payment/payment.controller';
import { PaymentService } from '../src/modules/payment/payment.service';
import { PaymentRepository } from '../src/modules/payment/payment.repository';
import { ContractRepository } from '../src/modules/contract/contract.repository';
import { PropertyRepository } from '../src/modules/property/repositories/property.repository';
import { RoomRepository } from '../src/modules/property/repositories/room.repository';
import { TenantRepository } from '../src/modules/tenant/tenant.repository';
import { ServiceRepository } from '../src/modules/service/repositories/service.repository';
import { MeterReadingRepository } from '../src/modules/meter-reading/meter-reading.repository';
import { MeterRepository } from '../src/modules/meter-reading/repositories/meter.repository';
import { OrganizationRepository } from '../src/modules/organization/organization.repository';
import { CounterRepository } from '../src/modules/auth/repositories/counter.repository';
import { RealtimeGateway } from '../src/infra/socket/socket.gateway';
import { FcmService } from '../src/infra/fcm/fcm.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import {
  BillingPeriodStatus,
  ContractStatus,
  ErrorCode,
  InvoiceStatus,
  MeterReadingStatus,
  MeterType,
  PaymentMethod,
  PaymentStatus,
  Permission,
  RoomStatus,
  ServiceCalcMethod,
  UserRole,
} from '../src/common/constants';
import { AuthenticatedUser } from '../src/common/types/jwt-payload.interface';

describe('Billing, Invoices, Payments, Debts E2E Tests', () => {
  let app: INestApplication;
  let currentUser: AuthenticatedUser;

  // In-memory data store for E2E tests
  const mockDb: {
    properties: any[];
    rooms: any[];
    tenants: any[];
    contracts: any[];
    services: any[];
    meters: any[];
    meterReadings: any[];
    billingPeriods: any[];
    invoices: any[];
    payments: any[];
    counters: Record<string, number>;
  } = {
    properties: [],
    rooms: [],
    tenants: [],
    contracts: [],
    services: [],
    meters: [],
    meterReadings: [],
    billingPeriods: [],
    invoices: [],
    payments: [],
    counters: {},
  };

  const resetDb = () => {
    mockDb.counters = {
      'invoices_org-1_2610': 0,
    };

    mockDb.properties = [
      {
        _id: 'prop-1',
        organizationId: 'org-1',
        name: 'Khu Trọ Ban Mai',
        bankAccount: {
          bankCode: 'MB',
          accountNo: '0987654321',
          accountName: 'NGUYEN VAN CHU TRO',
        },
        billingConfig: {
          electricityUnitPrice: 3500,
          waterUnitPrice: 25000,
        },
      },
    ];

    mockDb.rooms = [
      {
        _id: 'room-101',
        organizationId: 'org-1',
        propertyId: 'prop-1',
        code: '101',
        floor: 1,
        status: RoomStatus.OCCUPIED,
      },
      {
        _id: 'room-102',
        organizationId: 'org-1',
        propertyId: 'prop-1',
        code: '102',
        floor: 1,
        status: RoomStatus.OCCUPIED,
      },
    ];

    mockDb.tenants = [
      {
        _id: 'tenant-1',
        organizationId: 'org-1',
        fullName: 'Nguyen Van A',
        phone: '0901111111',
      },
      {
        _id: 'tenant-2',
        organizationId: 'org-1',
        fullName: 'Tran Thi B',
        phone: '0902222222',
      },
    ];

    mockDb.services = [
      {
        _id: 'srv-elec',
        organizationId: 'org-1',
        code: 'ELEC',
        name: 'Tiền điện',
        calcMethod: ServiceCalcMethod.METER,
        unitPrice: 3500,
      },
      {
        _id: 'srv-water',
        organizationId: 'org-1',
        code: 'WATER',
        name: 'Tiền nước',
        calcMethod: ServiceCalcMethod.METER,
        unitPrice: 25000,
      },
      {
        _id: 'srv-net',
        organizationId: 'org-1',
        code: 'INTERNET',
        name: 'Internet wifi',
        calcMethod: ServiceCalcMethod.FIXED,
        unitPrice: 100000,
      },
    ];

    mockDb.contracts = [
      {
        _id: 'contract-1',
        organizationId: 'org-1',
        propertyId: 'prop-1',
        roomId: 'room-101',
        tenantId: 'tenant-1',
        primaryTenantId: 'tenant-1',
        status: ContractStatus.ACTIVE,
        rent: 3000000,
        startDate: '2026-10-01',
        occupants: [{ fullName: 'Ban Cung Phong' }],
        serviceSubscriptions: [
          { serviceId: 'srv-elec' },
          { serviceId: 'srv-water' },
          { serviceId: 'srv-net', quantity: 1 },
        ],
      },
    ];

    mockDb.meters = [
      {
        _id: 'meter-e1',
        organizationId: 'org-1',
        roomId: 'room-101',
        type: MeterType.ELECTRIC,
        serialNo: 'ELEC-101',
        multiplier: 1,
      },
      {
        _id: 'meter-w1',
        organizationId: 'org-1',
        roomId: 'room-101',
        type: MeterType.WATER,
        serialNo: 'WATER-101',
        multiplier: 1,
      },
    ];

    mockDb.meterReadings = [
      {
        _id: 'mr-e1',
        organizationId: 'org-1',
        meterId: 'meter-e1',
        roomId: 'room-101',
        period: '2026-10',
        previousValue: 100,
        currentValue: 230,
        consumption: 130, // 130 * 3500 = 455,000
        unitPrice: 3500,
        status: MeterReadingStatus.DRAFT, // Initially DRAFT!
        isLocked: false,
      },
      {
        _id: 'mr-w1',
        organizationId: 'org-1',
        meterId: 'meter-w1',
        roomId: 'room-101',
        period: '2026-10',
        previousValue: 50,
        currentValue: 62,
        consumption: 12, // 12 * 25000 = 300,000
        unitPrice: 25000,
        status: MeterReadingStatus.DRAFT, // Initially DRAFT!
        isLocked: false,
      },
    ];

    mockDb.billingPeriods = [];
    mockDb.invoices = [];
    mockDb.payments = [];
  };

  beforeAll(async () => {
    resetDb();

    currentUser = {
      userId: 'user-owner-1',
      email: 'owner@example.com',
      organizationId: 'org-1',
      role: UserRole.OWNER,
      permissions: [
        Permission.BILLING_PERIOD_MANAGE,
        Permission.BILLING_PERIOD_READ,
        Permission.INVOICE_CREATE,
        Permission.INVOICE_READ,
        Permission.INVOICE_ISSUE,
        Permission.INVOICE_CANCEL,
        Permission.PAYMENT_CREATE,
        Permission.PAYMENT_READ,
        Permission.DEBT_READ,
      ],
    };

    const mockPeriodRepo = {
      create: jest.fn(async (orgId, data) => {
        const item = { ...data, _id: `bp-${Date.now()}`, organizationId: orgId };
        mockDb.billingPeriods.push(item);
        return item;
      }),
      findById: jest.fn(async (orgId, id) => {
        return mockDb.billingPeriods.find((b) => b._id === id && b.organizationId === orgId) || null;
      }),
      findByPropertyAndPeriod: jest.fn(async (orgId, propertyId, period) => {
        return (
          mockDb.billingPeriods.find(
            (b) => b.organizationId === orgId && b.propertyId === propertyId && b.period === period,
          ) || null
        );
      }),
      find: jest.fn(async (orgId, filter) => {
        return mockDb.billingPeriods.filter((b) => {
          if (b.organizationId !== orgId) return false;
          if (filter.propertyId && b.propertyId !== filter.propertyId) return false;
          if (filter.status && b.status !== filter.status) return false;
          return true;
        });
      }),
      updateOne: jest.fn(async (orgId, filter, update) => {
        const item = mockDb.billingPeriods.find((b) => b.organizationId === orgId && b._id === filter._id);
        if (item && update.$set) {
          Object.assign(item, update.$set);
        }
        return item;
      }),
    };

    const mockInvoiceRepo = {
      create: jest.fn(async (orgId, data) => {
        const item = { ...data, _id: `inv-${Date.now()}-${Math.random()}`, organizationId: orgId };
        mockDb.invoices.push(item);
        return item;
      }),
      findById: jest.fn(async (orgId, id) => {
        return mockDb.invoices.find((i) => i._id === id && i.organizationId === orgId) || null;
      }),
      findByIdOrThrow: jest.fn(async (orgId, id) => {
        const found = mockDb.invoices.find((i) => i._id === id && i.organizationId === orgId);
        if (!found) throw new Error('Invoice not found');
        return found;
      }),
      findActiveByContractAndPeriod: jest.fn(async (orgId, contractId, period) => {
        return (
          mockDb.invoices.find(
            (i) =>
              i.organizationId === orgId &&
              i.contractId === contractId &&
              i.billingPeriodId === period &&
              i.active === true,
          ) || null
        );
      }),
      find: jest.fn(async (orgId, filter) => {
        return mockDb.invoices.filter((i) => {
          if (i.organizationId !== orgId) return false;
          if (filter.contractId && i.contractId !== filter.contractId) return false;
          if (filter.billingPeriodId && i.billingPeriodId !== filter.billingPeriodId) return false;
          if (filter.active !== undefined && i.active !== filter.active) return false;
          if (filter.status && filter.status.$in && !filter.status.$in.includes(i.status)) return false;
          if (filter.status && typeof filter.status === 'string' && i.status !== filter.status) return false;
          return true;
        });
      }),
      updateOne: jest.fn(async (orgId, filter, update) => {
        const item = mockDb.invoices.find((i) => i.organizationId === orgId && i._id === filter._id);
        if (item && update.$set) {
          Object.assign(item, update.$set);
        }
        return item;
      }),
      updateWithOptimisticLock: jest.fn(async (orgId, id, version, update) => {
        const item = mockDb.invoices.find((i) => i.organizationId === orgId && i._id === id);
        if (!item) throw new Error('Invoice not found');
        if (item.version !== version) {
          throw new Error('Optimistic lock failure: version changed');
        }
        item.version++;
        if (update.$set) {
          Object.assign(item, update.$set);
        }
        return item;
      }),
      findPaginated: jest.fn(async (orgId, filter, page = 1, limit = 20) => {
        const items = mockDb.invoices.filter((i) => {
          if (i.organizationId !== orgId) return false;
          if (filter.status && filter.status.$in && !filter.status.$in.includes(i.status)) return false;
          if (filter.status && typeof filter.status === 'string' && i.status !== filter.status) return false;
          if (filter.tenantId && i.tenantId !== filter.tenantId) return false;
          return true;
        });
        return {
          data: items,
          meta: { page, limit, totalItems: items.length, totalPages: 1, hasNext: false, hasPrev: false },
        };
      }),
    };

    const mockPaymentRepo = {
      create: jest.fn(async (orgId, data) => {
        const item = { ...data, _id: `pay-${Date.now()}-${Math.random()}`, organizationId: orgId };
        mockDb.payments.push(item);
        return item;
      }),
      findById: jest.fn(async (orgId, id) => {
        return mockDb.payments.find((p) => p._id === id && p.organizationId === orgId) || null;
      }),
      findByIdempotencyKey: jest.fn(async (orgId, key) => {
        return mockDb.payments.find((p) => p.organizationId === orgId && p.idempotencyKey === key) || null;
      }),
      findByMethodAndReference: jest.fn(async (orgId, method, ref) => {
        return (
          mockDb.payments.find(
            (p) =>
              p.organizationId === orgId &&
              p.paymentMethod === method &&
              p.transactionReference === ref &&
              p.active === true,
          ) || null
        );
      }),
      updateOne: jest.fn(async (orgId, filter, update) => {
        const item = mockDb.payments.find((p) => p.organizationId === orgId && p._id === filter._id);
        if (item && update.$set) {
          Object.assign(item, update.$set);
        }
        return item;
      }),
      findPaginated: jest.fn(async (orgId, filter, page = 1, limit = 20) => {
        const items = mockDb.payments.filter((p) => p.organizationId === orgId);
        return {
          data: items,
          meta: { page, limit, totalItems: items.length, totalPages: 1 },
        };
      }),
    };

    const mockContractRepo = {
      find: jest.fn(async (orgId, filter) => {
        return mockDb.contracts.filter((c) => {
          if (c.organizationId !== orgId) return false;
          if (filter.propertyId && c.propertyId !== filter.propertyId) return false;
          if (filter.status && c.status !== filter.status) return false;
          return true;
        });
      }),
      findByIdOrThrow: jest.fn(async (orgId, id) => {
        const found = mockDb.contracts.find((c) => c._id === id && c.organizationId === orgId);
        if (!found) throw new Error('Contract not found');
        return found;
      }),
    };

    const mockPropertyRepo = {
      findById: jest.fn(async (orgId, id) => {
        return mockDb.properties.find((p) => p._id === id && p.organizationId === orgId) || null;
      }),
      findByIdOrThrow: jest.fn(async (orgId, id) => {
        const found = mockDb.properties.find((p) => p._id === id && p.organizationId === orgId);
        if (!found) throw new Error('Property not found');
        return found;
      }),
    };

    const mockRoomRepo = {
      findById: jest.fn(async (orgId, id) => {
        return mockDb.rooms.find((r) => r._id === id && r.organizationId === orgId) || null;
      }),
      findByIdOrThrow: jest.fn(async (orgId, id) => {
        const found = mockDb.rooms.find((r) => r._id === id && r.organizationId === orgId);
        if (!found) throw new Error('Room not found');
        return found;
      }),
    };

    const mockTenantRepo = {
      findById: jest.fn(async (orgId, id) => {
        return mockDb.tenants.find((t) => t._id === id && t.organizationId === orgId) || null;
      }),
    };

    const mockServiceRepo = {
      findById: jest.fn(async (orgId, id) => {
        return mockDb.services.find((s) => s._id === id && s.organizationId === orgId) || null;
      }),
    };

    const mockMeterRepo = {
      findMetersByRoom: jest.fn(async (orgId, roomId) => {
        return mockDb.meters.filter((m) => m.organizationId === orgId && m.roomId === roomId);
      }),
    };

    const mockMeterReadingRepo = {
      findByMeterAndPeriod: jest.fn(async (orgId, meterId, period) => {
        return (
          mockDb.meterReadings.find(
            (mr) => mr.organizationId === orgId && mr.meterId === meterId && mr.period === period,
          ) || null
        );
      }),
      findByRoomAndPeriod: jest.fn(async (orgId, roomId, period) => {
        return (
          mockDb.meterReadings.find(
            (mr) => mr.organizationId === orgId && mr.roomId === roomId && mr.period === period,
          ) || null
        );
      }),
    };

    const mockOrgRepo = {
      findById: jest.fn(async () => ({
        settings: { roundingStep: 1000, invoiceDueDays: 5 },
      })),
    };

    const mockCounterRepo = {
      getNextSequence: jest.fn(async (seqKey) => {
        if (!mockDb.counters[seqKey]) {
          mockDb.counters[seqKey] = 1;
        } else {
          mockDb.counters[seqKey]++;
        }
        return mockDb.counters[seqKey];
      }),
    };

    const mockConnection = {
      startSession: jest.fn().mockRejectedValue(new Error('Standalone mongo mode')),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        BillingPeriodController,
        InvoiceController,
        DebtController,
        PaymentController,
        PaymentClaimController,
      ],
      providers: [
        BillingPeriodService,
        InvoiceService,
        PaymentService,
        { provide: BillingPeriodRepository, useValue: mockPeriodRepo },
        { provide: InvoiceRepository, useValue: mockInvoiceRepo },
        { provide: PaymentRepository, useValue: mockPaymentRepo },
        { provide: ContractRepository, useValue: mockContractRepo },
        { provide: PropertyRepository, useValue: mockPropertyRepo },
        { provide: RoomRepository, useValue: mockRoomRepo },
        { provide: TenantRepository, useValue: mockTenantRepo },
        { provide: ServiceRepository, useValue: mockServiceRepo },
        { provide: MeterRepository, useValue: mockMeterRepo },
        { provide: MeterReadingRepository, useValue: mockMeterReadingRepo },
        { provide: OrganizationRepository, useValue: mockOrgRepo },
        { provide: CounterRepository, useValue: mockCounterRepo },
        { provide: 'DatabaseConnection', useValue: mockConnection },
        { provide: RealtimeGateway, useValue: { emitToTenant: jest.fn(), emitToOrganization: jest.fn() } },
        { provide: FcmService, useValue: { sendPushNotification: jest.fn() } },
        { provide: getModelToken('BillingPeriod'), useValue: {} },
        { provide: getModelToken('Invoice'), useValue: {} },
        { provide: getModelToken('Payment'), useValue: {} },
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

    app = moduleFixture.createNestApplication();
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

  beforeEach(() => {
    resetDb();
    currentUser = {
      userId: 'user-owner-1',
      email: 'owner@example.com',
      organizationId: 'org-1',
      role: UserRole.OWNER,
      permissions: [
        Permission.BILLING_PERIOD_MANAGE,
        Permission.BILLING_PERIOD_READ,
        Permission.INVOICE_CREATE,
        Permission.INVOICE_READ,
        Permission.INVOICE_ISSUE,
        Permission.INVOICE_CANCEL,
        Permission.PAYMENT_CREATE,
        Permission.PAYMENT_READ,
        Permission.DEBT_READ,
      ],
    };
  });

  describe('1. Billing Periods & Idempotent Generation', () => {
    it('POST /billing-periods: tạo kỳ tính phí mới', async () => {
      const res = await request(app.getHttpServer())
        .post('/billing-periods')
        .send({
          propertyId: 'prop-1',
          period: '2026-10',
          notes: 'Kỳ tháng 10/2026',
        })
        .expect(201);

      expect(res.body.data.period).toBe('2026-10');
      expect(res.body.data.status).toBe(BillingPeriodStatus.OPEN);
    });

    it('POST /billing-periods/:id/generate-invoices: BỊ CHẶN (skipped) khi reading chưa LOCKED', async () => {
      // Create period
      const bp = {
        _id: 'bp-2610',
        organizationId: 'org-1',
        propertyId: 'prop-1',
        period: '2026-10',
        status: BillingPeriodStatus.OPEN,
      };
      mockDb.billingPeriods.push(bp);

      // Meter readings are DRAFT (isLocked = false)
      const res = await request(app.getHttpServer())
        .post('/billing-periods/bp-2610/generate-invoices')
        .expect(200);

      expect(res.body.data.created).toBe(0);
      expect(res.body.data.skipped).toHaveLength(1);
      expect(res.body.data.skipped[0].roomCode).toBe('101');
      expect(res.body.data.skipped[0].reason).toContain('chưa được KHÓA (LOCKED)');
    });

    it('POST /billing-periods/:id/generate-invoices: TẠO THÀNH CÔNG khi reading đã LOCKED', async () => {
      const bp = {
        _id: 'bp-2610',
        organizationId: 'org-1',
        propertyId: 'prop-1',
        period: '2026-10',
        status: BillingPeriodStatus.OPEN,
      };
      mockDb.billingPeriods.push(bp);

      // Lock meter readings!
      for (const r of mockDb.meterReadings) {
        r.status = MeterReadingStatus.LOCKED;
        r.isLocked = true;
      }

      const res = await request(app.getHttpServer())
        .post('/billing-periods/bp-2610/generate-invoices')
        .expect(200);

      expect(res.body.data.created).toBe(1);
      expect(res.body.data.skipped).toHaveLength(0);

      // Check created invoice:
      // Rent: 3,000,000 + Elec: 455,000 + Water: 300,000 + Net: 100,000 = 3,855,000 VND
      const createdInv = mockDb.invoices[0];
      expect(createdInv).toBeDefined();
      expect(createdInv.invoiceNo).toBe('INV-2610-000001');
      expect(createdInv.status).toBe(InvoiceStatus.DRAFT);
      expect(createdInv.totalAmount).toBe(3855000);
      expect(createdInv.remainingAmount).toBe(3855000);
    });

    it('Concurrency / Idempotency: 2 request generate song song -> KHÔNG tạo trùng (duplicates = 1)', async () => {
      const bp = {
        _id: 'bp-2610',
        organizationId: 'org-1',
        propertyId: 'prop-1',
        period: '2026-10',
        status: BillingPeriodStatus.OPEN,
      };
      mockDb.billingPeriods.push(bp);

      for (const r of mockDb.meterReadings) {
        r.status = MeterReadingStatus.LOCKED;
        r.isLocked = true;
      }

      // First run: created = 1
      await request(app.getHttpServer())
        .post('/billing-periods/bp-2610/generate-invoices')
        .expect(200);

      // Second run: duplicates = 1, created = 0!
      const res2 = await request(app.getHttpServer())
        .post('/billing-periods/bp-2610/generate-invoices')
        .expect(200);

      expect(res2.body.data.created).toBe(0);
      expect(res2.body.data.duplicates).toBe(1);
      expect(mockDb.invoices).toHaveLength(1); // Still exactly 1 invoice!
    });
  });

  describe('2. Invoices Operations (GET, PATCH DRAFT, ISSUE, CANCEL, QR, PDF)', () => {
    beforeEach(() => {
      mockDb.invoices = [
        {
          _id: 'inv-test-1',
          organizationId: 'org-1',
          invoiceNo: 'INV-2610-000001',
          invoiceNumber: 'INV-2610-000001',
          propertyId: 'prop-1',
          roomId: 'room-101',
          tenantId: 'tenant-1',
          contractId: 'contract-1',
          billingPeriodId: '2026-10',
          dueDate: new Date(Date.now() + 5 * 86400000),
          status: InvoiceStatus.DRAFT,
          active: true,
          items: [{ type: 'RENT', description: 'Tiền phòng', quantity: 1, unitPrice: 3000000, amount: 3000000 }],
          subtotal: 3000000,
          discount: 0,
          totalAmount: 3000000,
          paidAmount: 0,
          remainingAmount: 3000000,
          version: 0,
        },
      ];
    });

    it('PATCH /invoices/:id: sửa thành công khi hóa đơn ở trạng thái DRAFT', async () => {
      const res = await request(app.getHttpServer())
        .patch('/invoices/inv-test-1')
        .send({
          discount: 100000,
          notes: 'Ưu đãi tháng 10',
        })
        .expect(200);

      expect(res.body.data.discount).toBe(100000);
      expect(res.body.data.totalAmount).toBe(2900000);
      expect(res.body.data.remainingAmount).toBe(2900000);
    });

    it('POST /invoices/:id/issue: phát hành hóa đơn (DRAFT -> ISSUED)', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices/inv-test-1/issue')
        .expect(200);

      expect(res.body.data.status).toBe(InvoiceStatus.ISSUED);
    });

    it('PATCH /invoices/:id: BỊ CHẶN 422 khi sửa hóa đơn đã ISSUED', async () => {
      mockDb.invoices[0].status = InvoiceStatus.ISSUED;

      const res = await request(app.getHttpServer())
        .patch('/invoices/inv-test-1')
        .send({ discount: 50000 })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(res.body.error.message).toContain('Only DRAFT invoices can be edited');
    });

    it('GET /invoices/:id/payment-qr: sinh đúng link VietQR với bankAccount và remaining', async () => {
      mockDb.invoices[0].status = InvoiceStatus.ISSUED;

      const res = await request(app.getHttpServer())
        .get('/invoices/inv-test-1/payment-qr')
        .expect(200);

      expect(res.body.data.bankCode).toBe('MB');
      expect(res.body.data.accountNo).toBe('0987654321');
      expect(res.body.data.amount).toBe(3000000);
      expect(res.body.data.transferContent).toBe('INV-2610-000001');
      expect(res.body.data.qrUrl).toContain('https://img.vietqr.io/image/MB-0987654321-compact2.png');
    });

    it('GET /invoices/:id/pdf: trả về cấu trúc HTML xem/in hóa đơn hoàn chỉnh', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices/inv-test-1/pdf')
        .expect(200);

      expect(res.body.data.html).toContain('HÓA ĐƠN TIỀN NHÀ');
      expect(res.body.data.html).toContain('INV-2610-000001');
      expect(res.body.data.html).toContain('Tiền phòng');
    });

    it('POST /invoices/:id/cancel: CHẶN hủy hóa đơn đã PAID -> ném 422', async () => {
      mockDb.invoices[0].status = InvoiceStatus.PAID;

      const res = await request(app.getHttpServer())
        .post('/invoices/inv-test-1/cancel')
        .send({ reason: 'Nhầm lẫn' })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(res.body.error.message).toContain('Cannot cancel or void a fully paid invoice');
    });
  });

  describe('3. Payments & Idempotency / Concurrency Controls', () => {
    beforeEach(() => {
      mockDb.invoices = [
        {
          _id: 'inv-pay-1',
          organizationId: 'org-1',
          invoiceNo: 'INV-2610-000099',
          contractId: 'contract-1',
          tenantId: 'tenant-1',
          status: InvoiceStatus.ISSUED,
          totalAmount: 3000000,
          paidAmount: 0,
          remainingAmount: 3000000,
          version: 0,
          active: true,
        },
      ];
    });

    it('POST /payments: Thanh toán một phần -> PARTIALLY_PAID', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .send({
          invoiceId: 'inv-pay-1',
          amount: 1000000,
          paymentMethod: PaymentMethod.CASH,
          transactionReference: 'RECEIPT-001',
        })
        .expect(201);

      expect(res.body.data.status).toBe(PaymentStatus.CONFIRMED);
      expect(mockDb.invoices[0].paidAmount).toBe(1000000);
      expect(mockDb.invoices[0].remainingAmount).toBe(2000000);
      expect(mockDb.invoices[0].status).toBe(InvoiceStatus.PARTIALLY_PAID);
    });

    it('POST /payments: Thanh toán đủ còn lại -> PAID', async () => {
      mockDb.invoices[0].status = InvoiceStatus.PARTIALLY_PAID;
      mockDb.invoices[0].paidAmount = 1000000;
      mockDb.invoices[0].remainingAmount = 2000000;

      const res = await request(app.getHttpServer())
        .post('/payments')
        .send({
          invoiceId: 'inv-pay-1',
          amount: 2000000,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          transactionReference: 'FT-FULL-01',
        })
        .expect(201);

      expect(res.body.data.status).toBe(PaymentStatus.CONFIRMED);
      expect(mockDb.invoices[0].paidAmount).toBe(3000000);
      expect(mockDb.invoices[0].remainingAmount).toBe(0);
      expect(mockDb.invoices[0].status).toBe(InvoiceStatus.PAID);
    });

    it('POST /payments: Chặn thanh toán vượt quá số nợ còn lại (amount > remaining) -> 422', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .send({
          invoiceId: 'inv-pay-1',
          amount: 3500000, // Remaining is only 3,000,000
          paymentMethod: PaymentMethod.CASH,
        })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(res.body.error.message).toContain('exceeds remaining invoice balance');
    });

    it('POST /payments: Chặn trùng mã giao dịch theo Unique (method, reference) -> 422', async () => {
      // First payment
      await request(app.getHttpServer())
        .post('/payments')
        .send({
          invoiceId: 'inv-pay-1',
          amount: 500000,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          transactionReference: 'FT-DUP-123',
        })
        .expect(201);

      // Duplicate payment with same method and reference
      const res = await request(app.getHttpServer())
        .post('/payments')
        .send({
          invoiceId: 'inv-pay-1',
          amount: 500000,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          transactionReference: 'FT-DUP-123',
        })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(res.body.error.message).toContain('has already been processed');
    });
  });

  describe('4. Tenant Payment Claims Flow (Claim -> Confirm / Reject / Void)', () => {
    beforeEach(() => {
      mockDb.invoices = [
        {
          _id: 'inv-claim-1',
          organizationId: 'org-1',
          invoiceNo: 'INV-2610-000077',
          contractId: 'contract-1',
          tenantId: 'tenant-1',
          status: InvoiceStatus.ISSUED,
          totalAmount: 2500000,
          paidAmount: 0,
          remainingAmount: 2500000,
          version: 0,
          active: true,
        },
      ];
    });

    it('TENANT: gửi claim chuyển khoản -> tạo PENDING; OWNER: confirm -> CONFIRMED & updates invoice', async () => {
      // Tenant submits claim
      currentUser = {
        userId: 'user-tenant-1',
        email: 'tenant@example.com',
        organizationId: 'org-1',
        role: UserRole.TENANT,
        tenantId: 'tenant-1',
        permissions: [],
      };

      const claimRes = await request(app.getHttpServer())
        .post('/invoices/inv-claim-1/payment-claims')
        .send({
          amount: 2500000,
          transactionReference: 'MB-PROOF-888',
          proofAttachmentId: 'att-proof-image-1',
        })
        .expect(201);

      expect(claimRes.body.data.status).toBe(PaymentStatus.PENDING);
      expect(claimRes.body.data.proofAttachmentId).toBe('att-proof-image-1');
      const claimId = claimRes.body.data._id;

      // Owner confirms claim
      currentUser = {
        userId: 'user-owner-1',
        email: 'owner@example.com',
        organizationId: 'org-1',
        role: UserRole.OWNER,
        permissions: [Permission.PAYMENT_CREATE],
      };

      const confirmRes = await request(app.getHttpServer())
        .post(`/payments/${claimId}/confirm`)
        .expect(200);

      expect(confirmRes.body.data.status).toBe(PaymentStatus.CONFIRMED);
      expect(mockDb.invoices[0].status).toBe(InvoiceStatus.PAID);
      expect(mockDb.invoices[0].remainingAmount).toBe(0);
    });

    it('OWNER: void thanh toán đã CONFIRMED -> trả lại tiền nợ trên hóa đơn', async () => {
      const pay = {
        _id: 'pay-void-1',
        organizationId: 'org-1',
        invoiceId: 'inv-claim-1',
        amount: 1000000,
        status: PaymentStatus.CONFIRMED,
        active: true,
      };
      mockDb.payments.push(pay);

      mockDb.invoices[0].paidAmount = 1000000;
      mockDb.invoices[0].remainingAmount = 1500000;
      mockDb.invoices[0].status = InvoiceStatus.PARTIALLY_PAID;

      const res = await request(app.getHttpServer())
        .post('/payments/pay-void-1/void')
        .send({ reason: 'Chuyển tiền sai tài khoản người nhận' })
        .expect(200);

      expect(res.body.data.status).toBe(PaymentStatus.VOIDED);
      expect(mockDb.invoices[0].paidAmount).toBe(0);
      expect(mockDb.invoices[0].remainingAmount).toBe(2500000);
      expect(mockDb.invoices[0].status).toBe(InvoiceStatus.ISSUED);
    });
  });

  describe('5. Debts Aging Bucket Reports (GET /debts)', () => {
    it('GET /debts: tổng hợp và chia đúng các bucket quá hạn: current, 1-7, 8-30, >30 ngày', async () => {
      const today = new Date();
      const pastDays = (n: number) => new Date(today.getTime() - n * 86400000);

      mockDb.invoices = [
        {
          _id: 'inv-d1',
          organizationId: 'org-1',
          propertyId: 'prop-1',
          roomId: 'room-101',
          tenantId: 'tenant-1',
          totalAmount: 1000000,
          remainingAmount: 1000000,
          dueDate: pastDays(-3), // Chưa quá hạn (+3 days) -> current
          status: InvoiceStatus.ISSUED,
          active: true,
        },
        {
          _id: 'inv-d2',
          organizationId: 'org-1',
          propertyId: 'prop-1',
          roomId: 'room-101',
          tenantId: 'tenant-1',
          totalAmount: 500000,
          remainingAmount: 500000,
          dueDate: pastDays(4), // Quá hạn 4 ngày -> bucket 1-7
          status: InvoiceStatus.ISSUED,
          active: true,
        },
        {
          _id: 'inv-d3',
          organizationId: 'org-1',
          propertyId: 'prop-1',
          roomId: 'room-102',
          tenantId: 'tenant-2',
          totalAmount: 2000000,
          remainingAmount: 2000000,
          dueDate: pastDays(15), // Quá hạn 15 ngày -> bucket 8-30
          status: InvoiceStatus.PARTIALLY_PAID,
          active: true,
        },
        {
          _id: 'inv-d4',
          organizationId: 'org-1',
          propertyId: 'prop-1',
          roomId: 'room-102',
          tenantId: 'tenant-2',
          totalAmount: 3000000,
          remainingAmount: 3000000,
          dueDate: pastDays(40), // Quá hạn 40 ngày -> bucket >30
          status: InvoiceStatus.OVERDUE,
          active: true,
        },
      ];

      const res = await request(app.getHttpServer())
        .get('/debts')
        .expect(200);

      expect(res.body.data.totalDebt).toBe(6500000);
      expect(res.body.data.totalDebtors).toBe(2); // Room 101 & Room 102
      expect(res.body.data.summary.current).toBe(1000000);
      expect(res.body.data.summary.bucket_1_7).toBe(500000);
      expect(res.body.data.summary.bucket_8_30).toBe(2000000);
      expect(res.body.data.summary.bucket_over_30).toBe(3000000);
    });
  });

  describe('6. Phân quyền & Tenant Isolation', () => {
    it('TENANT chỉ thấy hóa đơn của chính mình và truy cập invoice của người khác trả 404', async () => {
      mockDb.invoices = [
        {
          _id: 'inv-tenant-1',
          organizationId: 'org-1',
          tenantId: 'tenant-1',
          status: InvoiceStatus.ISSUED,
          totalAmount: 2000000,
          remainingAmount: 2000000,
          active: true,
        },
        {
          _id: 'inv-tenant-2',
          organizationId: 'org-1',
          tenantId: 'tenant-2',
          status: InvoiceStatus.ISSUED,
          totalAmount: 3000000,
          remainingAmount: 3000000,
          active: true,
        },
      ];

      // As tenant 1
      currentUser = {
        userId: 'user-tenant-1',
        email: 'tenant1@example.com',
        organizationId: 'org-1',
        role: UserRole.TENANT,
        tenantId: 'tenant-1',
        permissions: [],
      };

      // Can get own invoice
      await request(app.getHttpServer())
        .get('/invoices/inv-tenant-1')
        .expect(200);

      // Accessing other tenant's invoice returns 404 (NOT 403)
      const res = await request(app.getHttpServer())
        .get('/invoices/inv-tenant-2')
        .expect(404);

      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });
  });
});
