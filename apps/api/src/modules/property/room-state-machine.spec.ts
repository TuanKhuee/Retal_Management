import { PropertyService } from './property.service';
import { PropertyRepository } from './repositories/property.repository';
import { RoomRepository } from './repositories/room.repository';
import { RoomStatus, UserRole } from '../../common/constants';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { ConflictException } from '@nestjs/common';

describe('Room State Machine & Lifecycle Unit Tests', () => {
  let service: PropertyService;
  let propertyRepo: jest.Mocked<Partial<PropertyRepository>>;
  let roomRepo: jest.Mocked<Partial<RoomRepository>>;
  let mockInvoiceModel: any;
  let mockContractModel: any;

  const mockUser: AuthenticatedUser = {
    userId: 'owner-id-1',
    email: 'owner@example.com',
    organizationId: 'org-test-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(() => {
    propertyRepo = {
      findById: jest.fn(),
      findByIdOrThrow: jest.fn().mockResolvedValue({ _id: 'prop-1', name: 'Toa Nha A' }),
      create: jest.fn(),
      updateOne: jest.fn(),
      findPaginated: jest.fn(),
    };

    roomRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPropertyAndCode: jest.fn(),
      findRoomsByProperty: jest.fn(),
      updateOne: jest.fn(),
      softDelete: jest.fn(),
      bulkInsert: jest.fn(),
      countByStatus: jest.fn(),
    };

    mockInvoiceModel = {
      aggregate: jest.fn(),
    };

    mockContractModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    service = new PropertyService(
      propertyRepo as unknown as PropertyRepository,
      roomRepo as unknown as RoomRepository,
      mockInvoiceModel,
      mockContractModel,
    );
  });

  describe('1. State Machine Transitions (changeRoomStatus)', () => {
    it('cho phép chuyển VACANT -> MAINTENANCE', async () => {
      const room = {
        _id: 'room-1',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.VACANT,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(room);
      (roomRepo.updateOne as jest.Mock).mockResolvedValue({
        ...room,
        status: RoomStatus.MAINTENANCE,
      });

      const result = await service.changeRoomStatus(mockUser, 'room-1', {
        status: RoomStatus.MAINTENANCE,
      });

      expect(result).toBeDefined();
      expect(result!.status).toBe(RoomStatus.MAINTENANCE);
      expect(roomRepo.updateOne).toHaveBeenCalledWith(
        'org-test-1',
        { _id: 'room-1', deletedAt: null },
        { $set: { status: RoomStatus.MAINTENANCE } },
      );
    });

    it('cho phép chuyển VACANT -> RESERVED', async () => {
      const room = {
        _id: 'room-1',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.VACANT,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(room);
      (roomRepo.updateOne as jest.Mock).mockResolvedValue({
        ...room,
        status: RoomStatus.RESERVED,
      });

      const result = await service.changeRoomStatus(mockUser, 'room-1', {
        status: RoomStatus.RESERVED,
      });

      expect(result).toBeDefined();
      expect(result!.status).toBe(RoomStatus.RESERVED);
    });

    it('cho phép chuyển MAINTENANCE -> VACANT', async () => {
      const room = {
        _id: 'room-1',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.MAINTENANCE,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(room);
      (roomRepo.updateOne as jest.Mock).mockResolvedValue({
        ...room,
        status: RoomStatus.VACANT,
      });

      const result = await service.changeRoomStatus(mockUser, 'room-1', {
        status: RoomStatus.VACANT,
      });

      expect(result).toBeDefined();
      expect(result!.status).toBe(RoomStatus.VACANT);
    });

    it('cho phép chuyển RESERVED -> VACANT', async () => {
      const room = {
        _id: 'room-1',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.RESERVED,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(room);
      (roomRepo.updateOne as jest.Mock).mockResolvedValue({
        ...room,
        status: RoomStatus.VACANT,
      });

      const result = await service.changeRoomStatus(mockUser, 'room-1', {
        status: RoomStatus.VACANT,
      });

      expect(result).toBeDefined();
      expect(result!.status).toBe(RoomStatus.VACANT);
    });

    it('CHẶN chuyển trạng thái khi phòng đang OCCUPIED -> throw BusinessRuleViolationException', async () => {
      const occupiedRoom = {
        _id: 'room-1',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.OCCUPIED,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(occupiedRoom);

      await expect(
        service.changeRoomStatus(mockUser, 'room-1', {
          status: RoomStatus.MAINTENANCE,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);

      expect(roomRepo.updateOne).not.toHaveBeenCalled();
    });

    it('CHẶN trực tiếp set trạng thái phòng thành OCCUPIED -> throw BusinessRuleViolationException', async () => {
      const vacantRoom = {
        _id: 'room-1',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.VACANT,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(vacantRoom);

      await expect(
        service.changeRoomStatus(mockUser, 'room-1', {
          status: RoomStatus.OCCUPIED,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);

      expect(roomRepo.updateOne).not.toHaveBeenCalled();
    });

    it('báo lỗi 404 ResourceNotFoundException khi phòng không tồn tại hoặc đã bị xóa mềm', async () => {
      (roomRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changeRoomStatus(mockUser, 'room-missing', {
          status: RoomStatus.MAINTENANCE,
        }),
      ).rejects.toThrow(ResourceNotFoundException);

      // Đã bị xóa mềm
      (roomRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'room-deleted',
        deletedAt: new Date(),
      });

      await expect(
        service.changeRoomStatus(mockUser, 'room-deleted', {
          status: RoomStatus.MAINTENANCE,
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('2. Room Soft Delete Rules (deleteRoom)', () => {
    it('CHẶN xóa phòng khi trạng thái là OCCUPIED -> throw BusinessRuleViolationException', async () => {
      const occupiedRoom = {
        _id: 'room-1',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.OCCUPIED,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(occupiedRoom);

      await expect(service.deleteRoom(mockUser, 'room-1')).rejects.toThrow(
        BusinessRuleViolationException,
      );

      expect(roomRepo.softDelete).not.toHaveBeenCalled();
    });

    it('cho phép xóa mềm phòng khi trạng thái là VACANT', async () => {
      const vacantRoom = {
        _id: 'room-1',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '101',
        status: RoomStatus.VACANT,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(vacantRoom);
      (roomRepo.softDelete as jest.Mock).mockResolvedValue({
        ...vacantRoom,
        deletedAt: new Date(),
      });

      const res = await service.deleteRoom(mockUser, 'room-1');
      expect(res.id).toBe('room-1');
      expect(roomRepo.softDelete).toHaveBeenCalledWith('org-test-1', 'room-1');
    });

    it('cho phép xóa mềm phòng khi trạng thái là MAINTENANCE', async () => {
      const maintenanceRoom = {
        _id: 'room-2',
        organizationId: 'org-test-1',
        propertyId: 'prop-1',
        code: '102',
        status: RoomStatus.MAINTENANCE,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(maintenanceRoom);
      (roomRepo.softDelete as jest.Mock).mockResolvedValue({
        ...maintenanceRoom,
        deletedAt: new Date(),
      });

      const res = await service.deleteRoom(mockUser, 'room-2');
      expect(res.id).toBe('room-2');
      expect(roomRepo.softDelete).toHaveBeenCalledWith('org-test-1', 'room-2');
    });
  });

  describe('3. Bulk Room Creation (bulkCreateRooms)', () => {
    it('tạo hàng loạt phòng với pattern hợp lệ như A101-A103', async () => {
      (roomRepo.findRoomsByProperty as jest.Mock).mockResolvedValue([]);
      (roomRepo.bulkInsert as jest.Mock).mockImplementation((_orgId, rooms) =>
        Promise.resolve(rooms.map((r: any, idx: number) => ({ ...r, _id: `id-${idx}` }))),
      );

      const res = await service.bulkCreateRooms(mockUser, {
        propertyId: 'prop-1',
        pattern: 'A101-A103',
        floor: 1,
        area: 25,
        baseRent: 3500000,
      });

      expect(res.totalRequested).toBe(3);
      expect(res.createdCount).toBe(3);
      expect(res.skippedCount).toBe(0);
      expect(roomRepo.bulkInsert).toHaveBeenCalledWith(
        'org-test-1',
        expect.arrayContaining([
          expect.objectContaining({ code: 'A101', status: RoomStatus.VACANT }),
          expect.objectContaining({ code: 'A102', status: RoomStatus.VACANT }),
          expect.objectContaining({ code: 'A103', status: RoomStatus.VACANT }),
        ]),
      );
    });

    it('tự động bỏ qua các mã phòng đã tồn tại trong property', async () => {
      (roomRepo.findRoomsByProperty as jest.Mock).mockResolvedValue([
        { code: 'A102', status: RoomStatus.OCCUPIED },
      ]);
      (roomRepo.bulkInsert as jest.Mock).mockImplementation((_orgId, rooms) =>
        Promise.resolve(rooms),
      );

      const res = await service.bulkCreateRooms(mockUser, {
        propertyId: 'prop-1',
        pattern: 'A101-A103',
        floor: 1,
        area: 25,
        baseRent: 3500000,
      });

      expect(res.totalRequested).toBe(3);
      expect(res.createdCount).toBe(2);
      expect(res.skippedCount).toBe(1);
      expect(res.skippedCodes).toEqual(['A102']);
    });

    it('chặn pattern không đúng định dạng (vd: A101-B105 khác prefix)', async () => {
      await expect(
        service.bulkCreateRooms(mockUser, {
          propertyId: 'prop-1',
          pattern: 'A101-B105',
          floor: 1,
          area: 25,
          baseRent: 3500000,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('chặn khi tạo quá 100 phòng một lần', async () => {
      await expect(
        service.bulkCreateRooms(mockUser, {
          propertyId: 'prop-1',
          pattern: 'A100-A250',
          floor: 1,
          area: 25,
          baseRent: 3500000,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });
  });

  describe('4. Unique Room Code in Property', () => {
    it('chặn tạo trùng code phòng trong cùng property -> throw ConflictException', async () => {
      (roomRepo.findByPropertyAndCode as jest.Mock).mockResolvedValue({
        _id: 'existing-room',
        code: '101',
      });

      await expect(
        service.createRoom(mockUser, {
          propertyId: 'prop-1',
          code: '101',
          floor: 1,
          area: 20,
          baseRent: 3000000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
