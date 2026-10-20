import { MeterReadingService } from './meter-reading.service';
import { MeterReadingRepository } from './meter-reading.repository';
import { MeterRepository } from './repositories/meter.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { ServiceRepository } from '../service/repositories/service.repository';
import {
  MeterReadingFlag,
  MeterReadingStatus,
  MeterStatus,
  MeterType,
  RoomStatus,
  UserRole,
} from '../../common/constants';
import { BusinessRuleViolationException } from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

describe('MeterReadingService Unit Tests', () => {
  let service: MeterReadingService;
  let meterReadingRepo: jest.Mocked<Partial<MeterReadingRepository>>;
  let meterRepo: jest.Mocked<Partial<MeterRepository>>;
  let roomRepo: jest.Mocked<Partial<RoomRepository>>;
  let propertyRepo: jest.Mocked<Partial<PropertyRepository>>;
  let serviceRepo: jest.Mocked<Partial<ServiceRepository>>;
  let mockMeterModel: any;
  let mockMeterReadingModel: any;

  const mockUser: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@example.com',
    organizationId: 'org-test-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(() => {
    meterReadingRepo = {
      findById: jest.fn(),
      findByMeterAndPeriod: jest.fn(),
      findByRoomAndPeriod: jest.fn(),
      findHistoricalReadings: jest.fn(),
      findLatestReading: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    meterRepo = {
      findById: jest.fn(),
      findMetersByRoom: jest.fn(),
      findActiveMeterByRoomAndType: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    roomRepo = {
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      findRoomsByProperty: jest.fn(),
    };

    propertyRepo = {
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
    };

    serviceRepo = {
      findByCode: jest.fn(),
    };

    mockMeterModel = {};
    mockMeterReadingModel = {};

    service = new MeterReadingService(
      meterReadingRepo as unknown as MeterReadingRepository,
      meterRepo as unknown as MeterRepository,
      roomRepo as unknown as RoomRepository,
      propertyRepo as unknown as PropertyRepository,
      serviceRepo as unknown as ServiceRepository,
      mockMeterModel,
      mockMeterReadingModel,
    );
  });

  describe('1. Rollover (Công tơ quay vòng)', () => {
    it('cho phép currentValue < previousValue khi có cờ ROLLOVER và tính consumption chính xác', async () => {
      const reading = {
        _id: 'reading-1',
        organizationId: 'org-test-1',
        meterId: 'meter-1',
        roomId: 'room-1',
        period: '2026-10',
        previousValue: 9980, // Gần kịch kim 10,000
        status: MeterReadingStatus.DRAFT,
        isLocked: false,
      };

      (meterReadingRepo.findById as jest.Mock).mockResolvedValue(reading);
      (meterRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'meter-1',
        multiplier: 1,
      });
      (meterReadingRepo.findHistoricalReadings as jest.Mock).mockResolvedValue([]);
      (roomRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'room-1',
        status: RoomStatus.OCCUPIED,
      });
      (meterReadingRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) =>
        Promise.resolve({ ...reading, ...update.$set }),
      );

      // Công tơ quay vòng qua 10,000 tới 0025.
      // Bù phần quay vòng qua adjustment = 10,000.
      // consumption = (25 - 9980 + 10000) * 1 = 45 kWh.
      const updated = await service.updateReading(mockUser, 'reading-1', {
        currentValue: 25,
        flags: [MeterReadingFlag.ROLLOVER],
        adjustment: 10000,
        adjustmentReason: 'Đồng hồ quay vòng từ 9980 về 0025',
      });

      expect(updated).toBeDefined();
      expect(updated!.consumption).toBe(45);
      expect(updated!.flags).toContain(MeterReadingFlag.ROLLOVER);
    });

    it('chặn currentValue < previousValue nếu KHÔNG có cờ ROLLOVER hoặc METER_REPLACED -> throw 422', async () => {
      const reading = {
        _id: 'reading-1',
        organizationId: 'org-test-1',
        meterId: 'meter-1',
        roomId: 'room-1',
        previousValue: 1200,
        status: MeterReadingStatus.DRAFT,
        isLocked: false,
      };

      (meterReadingRepo.findById as jest.Mock).mockResolvedValue(reading);

      await expect(
        service.updateReading(mockUser, 'reading-1', {
          currentValue: 1150, // Nhỏ hơn previousValue mà không có cờ
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });
  });

  describe('2. Thay công tơ (METER_REPLACED)', () => {
    it('cho phép ghi nhận công tơ thay mới với chỉ số bắt đầu từ 0 và cộng dồn tiêu thụ công tơ cũ', async () => {
      const reading = {
        _id: 'reading-1',
        organizationId: 'org-test-1',
        meterId: 'meter-1',
        roomId: 'room-1',
        period: '2026-10',
        previousValue: 540,
        status: MeterReadingStatus.DRAFT,
        isLocked: false,
      };

      (meterReadingRepo.findById as jest.Mock).mockResolvedValue(reading);
      (meterRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'meter-1',
        multiplier: 1,
      });
      (meterReadingRepo.findHistoricalReadings as jest.Mock).mockResolvedValue([]);
      (roomRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'room-1',
        status: RoomStatus.OCCUPIED,
      });
      (meterReadingRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) =>
        Promise.resolve({ ...reading, ...update.$set }),
      );

      // Công tơ cũ trước khi tháo tiêu thụ 60 kWh (chỉ số tháo 600 - 540 = 60).
      // Công tơ mới chạy được 15 kWh (chỉ số 15).
      // Tổng tiêu thụ = 15 + 60 = 75 kWh.
      const updated = await service.updateReading(mockUser, 'reading-1', {
        currentValue: 15,
        flags: [MeterReadingFlag.METER_REPLACED],
        adjustment: 60,
        adjustmentReason: 'Thay công tơ bị cháy, công tơ cũ chốt 600 kWh',
      });

      expect(updated).toBeDefined();
      expect(updated!.consumption).toBe(75);
      expect(updated!.flags).toContain(MeterReadingFlag.METER_REPLACED);
    });
  });

  describe('3. Khóa rồi sửa (LOCKED -> 422)', () => {
    it('chặn cập nhật khi bản ghi đã ở trạng thái LOCKED -> throw 422 BusinessRuleViolationException', async () => {
      const lockedReading = {
        _id: 'reading-locked',
        organizationId: 'org-test-1',
        status: MeterReadingStatus.LOCKED,
        isLocked: true,
        previousValue: 100,
      };

      (meterReadingRepo.findById as jest.Mock).mockResolvedValue(lockedReading);

      await expect(
        service.updateReading(mockUser, 'reading-locked', {
          currentValue: 120,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);

      expect(meterReadingRepo.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('4. Cảnh báo ABNORMAL (Bất thường)', () => {
    it('tự động gắn cờ ABNORMAL khi tiêu thụ vượt quá 3 lần trung bình 3 kỳ trước', async () => {
      const reading = {
        _id: 'reading-1',
        organizationId: 'org-test-1',
        meterId: 'meter-1',
        roomId: 'room-1',
        period: '2026-10',
        previousValue: 1000,
        status: MeterReadingStatus.DRAFT,
      };

      (meterReadingRepo.findById as jest.Mock).mockResolvedValue(reading);
      (meterRepo.findById as jest.Mock).mockResolvedValue({ _id: 'meter-1', multiplier: 1 });
      // 3 kỳ trước: 100, 100, 100 -> avg = 100
      (meterReadingRepo.findHistoricalReadings as jest.Mock).mockResolvedValue([
        { consumption: 100 },
        { consumption: 100 },
        { consumption: 100 },
      ]);
      (roomRepo.findById as jest.Mock).mockResolvedValue({ _id: 'room-1', status: RoomStatus.OCCUPIED });
      (meterReadingRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) =>
        Promise.resolve({ ...reading, ...update.$set }),
      );

      // Nhập 1450 -> consumption = 450 (> 3 * 100)
      const updated = await service.updateReading(mockUser, 'reading-1', {
        currentValue: 1450,
      });

      expect(updated!.flags).toContain(MeterReadingFlag.ABNORMAL);
    });

    it('tự động gắn cờ ABNORMAL khi phòng OCCUPIED nhưng tiêu thụ = 0', async () => {
      const reading = {
        _id: 'reading-1',
        organizationId: 'org-test-1',
        meterId: 'meter-1',
        roomId: 'room-1',
        period: '2026-10',
        previousValue: 1000,
        status: MeterReadingStatus.DRAFT,
      };

      (meterReadingRepo.findById as jest.Mock).mockResolvedValue(reading);
      (meterRepo.findById as jest.Mock).mockResolvedValue({ _id: 'meter-1', multiplier: 1 });
      (meterReadingRepo.findHistoricalReadings as jest.Mock).mockResolvedValue([]);
      (roomRepo.findById as jest.Mock).mockResolvedValue({ _id: 'room-1', status: RoomStatus.OCCUPIED });
      (meterReadingRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) =>
        Promise.resolve({ ...reading, ...update.$set }),
      );

      // Nhập 1000 -> consumption = 0 trong khi phòng có người ở
      const updated = await service.updateReading(mockUser, 'reading-1', {
        currentValue: 1000,
      });

      expect(updated!.flags).toContain(MeterReadingFlag.ABNORMAL);
    });
  });

  describe('5. Import Excel (Preview trả lỗi từng dòng & Commit riêng)', () => {
    it('bước Preview: phân tích và trả danh sách lỗi chi tiết theo từng dòng', async () => {
      (propertyRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({ _id: 'prop-1' });
      (roomRepo.findRoomsByProperty as jest.Mock).mockResolvedValue([
        { _id: 'room-101', code: '101' },
      ]);
      (meterRepo.findActiveMeterByRoomAndType as jest.Mock).mockImplementation((_orgId, roomId, type) => {
        if (roomId === 'room-101' && type === MeterType.ELECTRIC) {
          return Promise.resolve({ _id: 'meter-elec', initialValue: 500, multiplier: 1 });
        }
        return Promise.resolve(null);
      });
      (meterReadingRepo.findLatestReading as jest.Mock).mockResolvedValue({ currentValue: 520 });

      // Dữ liệu import 3 dòng:
      // Dòng 1: Hợp lệ (101 điện: 550 > 520)
      // Dòng 2: Phòng 999 không tồn tại
      // Dòng 3: Dòng chỉ số điện 510 < 520 mà không có cờ rollover
      const previewRes = await service.importReadings(mockUser, {
        propertyId: 'prop-1',
        period: '2026-10',
        commit: false,
        rows: [
          { roomCode: '101', meterType: MeterType.ELECTRIC, currentValue: 550 },
          { roomCode: '999', meterType: MeterType.ELECTRIC, currentValue: 200 },
          { roomCode: '101', meterType: MeterType.ELECTRIC, currentValue: 510 },
        ],
      });

      expect(previewRes.action).toBe('preview');
      expect(previewRes.totalRows).toBe(3);
      expect(previewRes.validCount).toBe(1);
      expect(previewRes.errorCount).toBe(2);
      expect(previewRes.errors).toHaveLength(2);
      expect(previewRes.errors![0].row).toBe(2);
      expect(previewRes.errors![0].error).toContain('Room code "999" not found');
      expect(previewRes.errors![1].row).toBe(3);
      expect(previewRes.errors![1].error).toContain('Current value (510) < previous value (520)');
    });

    it('bước Commit: ném lỗi 422 nếu có dòng sai và KHÔNG commit dữ liệu', async () => {
      (propertyRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({ _id: 'prop-1' });
      (roomRepo.findRoomsByProperty as jest.Mock).mockResolvedValue([
        { _id: 'room-101', code: '101' },
      ]);
      (meterRepo.findActiveMeterByRoomAndType as jest.Mock).mockResolvedValue(null);

      await expect(
        service.importReadings(mockUser, {
          propertyId: 'prop-1',
          period: '2026-10',
          commit: true,
          rows: [{ roomCode: '101', meterType: MeterType.WATER, currentValue: 10 }],
        }),
      ).rejects.toThrow(BusinessRuleViolationException);

      expect(meterReadingRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('6. Lock Readings & Price Snapshot', () => {
    it('khóa số kỳ và snapshot chính xác unitPrice & amount từ Service', async () => {
      (propertyRepo.findByIdOrThrow as jest.Mock).mockResolvedValue({
        _id: 'prop-1',
        billingConfig: { electricityUnitPrice: 3500, waterUnitPrice: 25000 },
      });
      (meterReadingRepo.find as jest.Mock).mockResolvedValue([
        { _id: 'r1', meterId: 'm-elec', consumption: 100 },
        { _id: 'r2', meterId: 'm-water', consumption: 10 },
      ]);
      (serviceRepo.findByCode as jest.Mock).mockImplementation((_orgId, code) => {
        if (code === 'ELEC') return Promise.resolve({ unitPrice: 3800 });
        if (code === 'WATER') return Promise.resolve({ unitPrice: 28000 });
        return Promise.resolve(null);
      });
      (meterRepo.findById as jest.Mock).mockImplementation((_orgId, id) => {
        if (id === 'm-elec') return Promise.resolve({ type: MeterType.ELECTRIC });
        if (id === 'm-water') return Promise.resolve({ type: MeterType.WATER });
        return Promise.resolve(null);
      });
      (meterReadingRepo.updateOne as jest.Mock).mockResolvedValue({});

      const lockRes = await service.lockReadings(mockUser, {
        propertyId: 'prop-1',
        period: '2026-10',
      });

      expect(lockRes.lockedCount).toBe(2);
      // Điện: 100 * 3800 = 380,000; Nước: 10 * 28000 = 280,000; Tổng = 660,000
      expect(lockRes.totalAmount).toBe(660000);
      expect(meterReadingRepo.updateOne).toHaveBeenCalledWith(
        'org-test-1',
        { _id: 'r1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            unitPrice: 3800,
            amount: 380000,
            status: MeterReadingStatus.LOCKED,
            isLocked: true,
          }),
        }),
      );
    });
  });
});
