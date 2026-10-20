import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { MeterController } from '../src/modules/meter-reading/meter.controller';
import { MeterReadingController } from '../src/modules/meter-reading/meter-reading.controller';
import { MeterReadingService } from '../src/modules/meter-reading/meter-reading.service';
import { MeterRepository } from '../src/modules/meter-reading/repositories/meter.repository';
import { MeterReadingRepository } from '../src/modules/meter-reading/meter-reading.repository';
import { RoomRepository } from '../src/modules/property/repositories/room.repository';
import { PropertyRepository } from '../src/modules/property/repositories/property.repository';
import { ServiceRepository } from '../src/modules/service/repositories/service.repository';
import { Meter } from '../src/modules/meter-reading/schemas/meter.schema';
import { MeterReading } from '../src/modules/meter-reading/schemas/meter-reading.schema';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import {
  ErrorCode,
  MeterReadingFlag,
  MeterReadingStatus,
  MeterStatus,
  MeterType,
  Permission,
  RoomStatus,
  UserRole,
} from '../src/common/constants';
import { AuthenticatedUser } from '../src/common/types/jwt-payload.interface';

describe('Meters & Meter-Readings E2E Tests', () => {
  let app: INestApplication;
  let currentUser: AuthenticatedUser;

  // In-memory data store for E2E tests
  const mockDb: {
    meters: any[];
    meterReadings: any[];
    rooms: any[];
    properties: any[];
    services: any[];
  } = {
    meters: [],
    meterReadings: [],
    rooms: [],
    properties: [],
    services: [],
  };

  const resetDb = () => {
    mockDb.properties = [
      {
        _id: 'prop-1',
        organizationId: 'org-test-1',
        name: 'Khu Trọ Bình Dân',
        billingConfig: { electricityUnitPrice: 3500, waterUnitPrice: 25000 },
      },
    ];

    mockDb.rooms = [
      {
        _id: 'room-101',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        floor: 1,
        status: RoomStatus.OCCUPIED,
        deletedAt: null,
      },
      {
        _id: 'room-102',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '102',
        floor: 1,
        status: RoomStatus.VACANT,
        deletedAt: null,
      },
    ];

    mockDb.meters = [
      {
        _id: 'meter-elec-101',
        organizationId: 'org-test-1',
        roomId: 'room-101',
        type: MeterType.ELECTRIC,
        serialNo: 'EM-101',
        multiplier: 1,
        initialValue: 100,
        status: MeterStatus.ACTIVE,
      },
      {
        _id: 'meter-water-101',
        organizationId: 'org-test-1',
        roomId: 'room-101',
        type: MeterType.WATER,
        serialNo: 'WM-101',
        multiplier: 1,
        initialValue: 50,
        status: MeterStatus.ACTIVE,
      },
      {
        _id: 'meter-elec-102',
        organizationId: 'org-test-1',
        roomId: 'room-102',
        type: MeterType.ELECTRIC,
        serialNo: 'EM-102',
        multiplier: 1,
        initialValue: 200,
        status: MeterStatus.ACTIVE,
      },
    ];

    mockDb.meterReadings = [
      {
        _id: 'mr-elec-prev',
        organizationId: 'org-test-1',
        roomId: 'room-101',
        meterId: 'meter-elec-101',
        period: '2026-09',
        previousValue: 9800,
        currentValue: 9950,
        consumption: 150,
        status: MeterReadingStatus.LOCKED,
        isLocked: true,
      },
    ];

    mockDb.services = [
      {
        _id: 'srv-elec',
        organizationId: 'org-test-1',
        code: 'ELEC',
        name: 'Điện sinh hoạt',
        unitPrice: 3800,
        isActive: true,
      },
      {
        _id: 'srv-water',
        organizationId: 'org-test-1',
        code: 'WATER',
        name: 'Nước sinh hoạt',
        unitPrice: 28000,
        isActive: true,
      },
    ];
  };

  beforeAll(async () => {
    resetDb();

    currentUser = {
      userId: 'user-owner-1',
      email: 'owner@example.com',
      organizationId: 'org-test-1',
      role: UserRole.OWNER,
      permissions: [Permission.METER_READ, Permission.METER_RECORD],
    };

    const mockMeterRepo = {
      findById: jest.fn(async (orgId, id) => {
        return mockDb.meters.find((m) => m._id === id && m.organizationId === orgId) || null;
      }),
      findOne: jest.fn(async (orgId, filter) => {
        return mockDb.meters.find((m) => {
          if (m.organizationId !== orgId) return false;
          for (const key of Object.keys(filter)) {
            if (m[key] !== filter[key]) return false;
          }
          return true;
        }) || null;
      }),
      find: jest.fn(async (orgId, filter) => {
        return mockDb.meters.filter((m) => {
          if (m.organizationId !== orgId) return false;
          if (filter.roomId && m.roomId !== filter.roomId) return false;
          return true;
        });
      }),
      findMetersByRoom: jest.fn(async (orgId, roomId) => {
        return mockDb.meters.filter((m) => m.organizationId === orgId && m.roomId === roomId);
      }),
      findActiveMeterByRoomAndType: jest.fn(async (orgId, roomId, type) => {
        return (
          mockDb.meters.find(
            (m) =>
              m.organizationId === orgId &&
              m.roomId === roomId &&
              m.type === type &&
              m.status === MeterStatus.ACTIVE,
          ) || null
        );
      }),
      create: jest.fn(async (orgId, data) => {
        const item = { ...data, _id: `meter-${Date.now()}`, organizationId: orgId };
        mockDb.meters.push(item);
        return item;
      }),
      updateOne: jest.fn(async (orgId, filter, update) => {
        const item = mockDb.meters.find((m) => m.organizationId === orgId && m._id === filter._id);
        if (item && update.$set) {
          Object.assign(item, update.$set);
        }
        return item;
      }),
    };

    const mockMeterReadingRepo = {
      findById: jest.fn(async (orgId, id) => {
        return mockDb.meterReadings.find((r) => r._id === id && r.organizationId === orgId) || null;
      }),
      findByMeterAndPeriod: jest.fn(async (orgId, meterId, period) => {
        return (
          mockDb.meterReadings.find(
            (r) => r.organizationId === orgId && r.meterId === meterId && r.period === period,
          ) || null
        );
      }),
      findByRoomAndPeriod: jest.fn(async (orgId, roomId, period) => {
        return mockDb.meterReadings.filter(
          (r) => r.organizationId === orgId && r.roomId === roomId && r.period === period,
        );
      }),
      findHistoricalReadings: jest.fn(async (orgId, meterId, beforePeriod, limit = 3) => {
        return mockDb.meterReadings
          .filter((r) => r.organizationId === orgId && r.meterId === meterId && r.period < beforePeriod)
          .sort((a, b) => b.period.localeCompare(a.period))
          .slice(0, limit);
      }),
      findLatestReading: jest.fn(async (orgId, meterId, beforePeriod) => {
        const readings = mockDb.meterReadings
          .filter((r) => r.organizationId === orgId && r.meterId === meterId && (!beforePeriod || r.period < beforePeriod))
          .sort((a, b) => b.period.localeCompare(a.period));
        return readings[0] || null;
      }),
      find: jest.fn(async (orgId, filter) => {
        return mockDb.meterReadings.filter((r) => {
          if (r.organizationId !== orgId) return false;
          if (filter.period && r.period !== filter.period) return false;
          if (filter.roomId && r.roomId !== filter.roomId) return false;
          if (filter.meterId && r.meterId !== filter.meterId) return false;
          return true;
        });
      }),
      create: jest.fn(async (orgId, data) => {
        const item = {
          ...data,
          _id: `mr-${Math.random().toString(36).substring(2, 9)}`,
          organizationId: orgId,
          flags: data.flags || [],
        };
        mockDb.meterReadings.push(item);
        return item;
      }),
      updateOne: jest.fn(async (orgId, filter, update) => {
        const item = mockDb.meterReadings.find((r) => r.organizationId === orgId && r._id === filter._id);
        if (item && update.$set) {
          Object.assign(item, update.$set);
        }
        return item;
      }),
    };

    const mockRoomRepo = {
      findById: jest.fn(async (orgId, id) => {
        return mockDb.rooms.find((r) => r._id === id && r.organizationId === orgId) || null;
      }),
      findByIdOrThrow: jest.fn(async (orgId, id) => {
        const r = mockDb.rooms.find((room) => room._id === id && room.organizationId === orgId);
        if (!r) throw new Error('Room not found');
        return r;
      }),
      findRoomsByProperty: jest.fn(async (orgId, propertyId) => {
        return mockDb.rooms.filter((r) => r.organizationId === orgId && r.propertyId === propertyId);
      }),
    };

    const mockPropertyRepo = {
      findById: jest.fn(async (orgId, id) => {
        return mockDb.properties.find((p) => p._id === id && p.organizationId === orgId) || null;
      }),
      findByIdOrThrow: jest.fn(async (orgId, id) => {
        const p = mockDb.properties.find((prop) => prop._id === id && prop.organizationId === orgId);
        if (!p) throw new Error('Property not found');
        return p;
      }),
    };

    const mockServiceRepo = {
      findByCode: jest.fn(async (orgId, code) => {
        return mockDb.services.find((s) => s.organizationId === orgId && s.code === code) || null;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MeterController, MeterReadingController],
      providers: [
        MeterReadingService,
        { provide: MeterRepository, useValue: mockMeterRepo },
        { provide: MeterReadingRepository, useValue: mockMeterReadingRepo },
        { provide: RoomRepository, useValue: mockRoomRepo },
        { provide: PropertyRepository, useValue: mockPropertyRepo },
        { provide: ServiceRepository, useValue: mockServiceRepo },
        { provide: getModelToken(Meter.name), useValue: {} },
        { provide: getModelToken(MeterReading.name), useValue: {} },
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
  });

  describe('1. Meters Management (GET /rooms/:id/meters, POST /rooms/:id/meters, PATCH /meters/:id)', () => {
    it('POST /rooms/:id/meters: tạo công tơ mới cho phòng', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms/room-102/meters')
        .send({
          type: MeterType.WATER,
          serialNo: 'WM-102-NEW',
          multiplier: 1,
          initialValue: 15,
        })
        .expect(201);

      expect(res.body.data.serialNo).toBe('WM-102-NEW');
      expect(res.body.data.roomId).toBe('room-102');
    });

    it('GET /rooms/:id/meters: lấy danh sách công tơ theo phòng', async () => {
      const res = await request(app.getHttpServer())
        .get('/rooms/room-101/meters')
        .expect(200);

      expect(res.body.data).toHaveLength(2); // ELEC & WATER
    });

    it('PATCH /meters/:id: cập nhật thông tin công tơ', async () => {
      const res = await request(app.getHttpServer())
        .patch('/meters/meter-elec-101')
        .send({
          serialNo: 'EM-101-UPDATED',
          multiplier: 1.2,
        })
        .expect(200);

      expect(res.body.data.serialNo).toBe('EM-101-UPDATED');
      expect(res.body.data.multiplier).toBe(1.2);
    });
  });

  describe('2. Meter Readings Board (GET /meter-readings?propertyId&period)', () => {
    it('lấy bảng nhập số cả khu kèm previousValue và cảnh báo', async () => {
      const res = await request(app.getHttpServer())
        .get('/meter-readings?propertyId=prop-1&period=2026-10')
        .expect(200);

      expect(res.body.data.propertyId).toBe('prop-1');
      expect(res.body.data.period).toBe('2026-10');
      expect(res.body.data.rows).toBeInstanceOf(Array);

      // Find room 101 electric meter item
      const room101Elec = res.body.data.rows.find(
        (b: any) => b.roomId === 'room-101' && b.meterType === MeterType.ELECTRIC,
      );
      expect(room101Elec).toBeDefined();
      expect(room101Elec.previousValue).toBe(9950); // From period 2026-09 currentValue
      expect(room101Elec.status).toBe(MeterReadingStatus.DRAFT);
    });
  });

  describe('3. Single Update & Consumption Validation (PUT /meter-readings/:id)', () => {
    it('tính toán consumption tự động trên server và chặn currentValue < previousValue', async () => {
      // 1. Pre-insert a draft reading
      const draftReading = {
        _id: 'mr-test-draft',
        organizationId: 'org-test-1',
        roomId: 'room-101',
        meterId: 'meter-elec-101',
        period: '2026-10',
        previousValue: 9950,
        currentValue: 9950,
        consumption: 0,
        flags: [],
        status: MeterReadingStatus.DRAFT,
      };
      mockDb.meterReadings.push(draftReading);

      // Current < Prev without flag -> Expect 422
      const errRes = await request(app.getHttpServer())
        .put('/meter-readings/mr-test-draft')
        .send({
          currentValue: 9900,
        })
        .expect(422);

      expect(errRes.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(errRes.body.error.message).toContain('Current value (9900) cannot be less than previous value (9950)');

      // Valid update: 10100
      const okRes = await request(app.getHttpServer())
        .put('/meter-readings/mr-test-draft')
        .send({
          currentValue: 10100,
        })
        .expect(200);

      expect(okRes.body.data.consumption).toBe(150); // (10100 - 9950)
    });

    it('Rollover: cho phép currentValue < previousValue khi có cờ ROLLOVER', async () => {
      const draftReading = {
        _id: 'mr-test-rollover',
        organizationId: 'org-test-1',
        roomId: 'room-101',
        meterId: 'meter-elec-101',
        period: '2026-10',
        previousValue: 9950,
        currentValue: 9950,
        consumption: 0,
        flags: [],
        status: MeterReadingStatus.DRAFT,
      };
      mockDb.meterReadings.push(draftReading);

      // Rollover from 9950 to 50
      const res = await request(app.getHttpServer())
        .put('/meter-readings/mr-test-rollover')
        .send({
          currentValue: 50,
          flags: [MeterReadingFlag.ROLLOVER],
          adjustment: 0,
        })
        .expect(200);

      expect(res.body.data.consumption).toBe(100); // 10000 - 9950 + 50
      expect(res.body.data.flags).toContain(MeterReadingFlag.ROLLOVER);
    });

    it('Thay công tơ: cho phép ghi nhận cờ METER_REPLACED kèm adjustment có lý do', async () => {
      const draftReading = {
        _id: 'mr-test-replace',
        organizationId: 'org-test-1',
        roomId: 'room-101',
        meterId: 'meter-elec-101',
        period: '2026-10',
        previousValue: 9950,
        currentValue: 9950,
        consumption: 0,
        flags: [],
        status: MeterReadingStatus.DRAFT,
      };
      mockDb.meterReadings.push(draftReading);

      // Replaced: old meter consumed 40 before swap, new starts at 20
      const res = await request(app.getHttpServer())
        .put('/meter-readings/mr-test-replace')
        .send({
          currentValue: 20,
          flags: [MeterReadingFlag.METER_REPLACED],
          adjustment: 40,
          adjustmentReason: 'Đổi công tơ mới ngày 15/10, công tơ cũ chốt thêm 40 kWh',
        })
        .expect(200);

      expect(res.body.data.consumption).toBe(60); // 20 + 40
      expect(res.body.data.flags).toContain(MeterReadingFlag.METER_REPLACED);
    });

    it('Khóa rồi sửa -> Trả về lỗi 422 BUSINESS_RULE_VIOLATION', async () => {
      const lockedReading = {
        _id: 'mr-test-locked',
        organizationId: 'org-test-1',
        roomId: 'room-101',
        meterId: 'meter-elec-101',
        period: '2026-10',
        previousValue: 9950,
        currentValue: 10050,
        consumption: 100,
        status: MeterReadingStatus.LOCKED,
      };
      mockDb.meterReadings.push(lockedReading);

      const res = await request(app.getHttpServer())
        .put('/meter-readings/mr-test-locked')
        .send({
          currentValue: 10060,
        })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(res.body.error.message).toContain('LOCKED');
    });
  });

  describe('4. Batch Save & Lock Period (POST /meter-readings/batch, POST /meter-readings/lock)', () => {
    it('POST /meter-readings/batch: lưu hàng loạt chỉ số thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/meter-readings/batch')
        .send({
          propertyId: 'prop-1',
          period: '2026-10',
          readings: [
            {
              meterId: 'meter-elec-101',
              roomId: 'room-101',
              currentValue: 10150,
            },
            {
              meterId: 'meter-water-101',
              roomId: 'room-101',
              currentValue: 70,
            },
          ],
        })
        .expect(200);

      expect(res.body.data.savedCount).toBe(2);
    });

    it('POST /meter-readings/lock: chốt số kỳ và snapshot giá từ Service tương ứng', async () => {
      // Create draft reading for 2026-10
      mockDb.meterReadings.push({
        _id: 'mr-lock-elec',
        organizationId: 'org-test-1',
        roomId: 'room-101',
        meterId: 'meter-elec-101',
        period: '2026-10',
        previousValue: 9950,
        currentValue: 10150,
        consumption: 200,
        status: MeterReadingStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .post('/meter-readings/lock')
        .send({
          propertyId: 'prop-1',
          period: '2026-10',
        })
        .expect(200);

      expect(res.body.data.lockedCount).toBeGreaterThanOrEqual(1);

      // Verify the locked reading has snapshot unitPrice = 3800 and amount = 200 * 3800 = 760,000
      const locked = mockDb.meterReadings.find((r) => r._id === 'mr-lock-elec');
      expect(locked.status).toBe(MeterReadingStatus.LOCKED);
      expect(locked.unitPrice).toBe(3800);
      expect(locked.amount).toBe(760000);
    });
  });

  describe('5. Import Excel (POST /meter-readings/import: Preview & Commit)', () => {
    it('Preview: trả danh sách lỗi chi tiết từng dòng không làm hỏng dữ liệu', async () => {
      const res = await request(app.getHttpServer())
        .post('/meter-readings/import')
        .send({
          propertyId: 'prop-1',
          period: '2026-10',
          commit: false,
          rows: [
            { roomCode: '101', meterType: MeterType.WATER, currentValue: 60 },
            { roomCode: '999', meterType: MeterType.WATER, currentValue: 80 }, // Error: room 999 not found
            { roomCode: '101', meterType: MeterType.ELECTRIC, currentValue: 9000 }, // Error: < previousValue (9950)
          ],
        })
        .expect(200);

      expect(res.body.data.action).toBe('preview');
      expect(res.body.data.totalRows).toBe(3);
      expect(res.body.data.validCount).toBe(1);
      expect(res.body.data.errorCount).toBe(2);
      expect(res.body.data.errors).toHaveLength(2);
      expect(res.body.data.errors[0].row).toBe(2);
      expect(res.body.data.errors[0].error).toContain('Room code "999" not found');
      expect(res.body.data.errors[1].row).toBe(3);
      expect(res.body.data.errors[1].error).toContain('Current value (9000) < previous value (9950)');
    });

    it('Commit với lỗi: trả 422 BUSINESS_RULE_VIOLATION và không lưu dữ liệu', async () => {
      const res = await request(app.getHttpServer())
        .post('/meter-readings/import')
        .send({
          propertyId: 'prop-1',
          period: '2026-10',
          commit: true,
          rows: [
            { roomCode: '999', meterType: MeterType.WATER, currentValue: 80 },
          ],
        })
        .expect(422);

      expect(res.body.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(res.body.error.message).toContain('Import failed');
      expect(res.body.error.details).toBeInstanceOf(Array);
      expect(res.body.error.details[0].row).toBe(1);
    });

    it('Commit thành công: ghi nhận dữ liệu vào cơ sở dữ liệu', async () => {
      const res = await request(app.getHttpServer())
        .post('/meter-readings/import')
        .send({
          propertyId: 'prop-1',
          period: '2026-10',
          commit: true,
          rows: [
            { roomCode: '101', meterType: MeterType.WATER, currentValue: 65 },
          ],
        })
        .expect(200);

      expect(res.body.data.action).toBe('commit');
      expect(res.body.data.totalCommitted).toBe(1);
    });
  });
});
