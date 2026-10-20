import { ServiceService } from './service.service';
import { ServiceRepository } from './repositories/service.repository';
import { ServiceCalcMethod, ServiceType, UserRole } from '../../common/constants';
import { ConflictException } from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

describe('ServiceService Unit Tests', () => {
  let service: ServiceService;
  let serviceRepo: jest.Mocked<Partial<ServiceRepository>>;

  const mockUser: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@example.com',
    organizationId: 'org-test-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(() => {
    serviceRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findPaginated: jest.fn(),
      updateOne: jest.fn(),
    };

    service = new ServiceService(serviceRepo as unknown as ServiceRepository);
  });

  describe('createService', () => {
    it('tạo dịch vụ mới và khởi tạo priceHistory với giá ban đầu', async () => {
      (serviceRepo.findByCode as jest.Mock).mockResolvedValue(null);
      (serviceRepo.create as jest.Mock).mockImplementation((_orgId, data) =>
        Promise.resolve({ _id: 'srv-1', ...data }),
      );

      const result = await service.createService(mockUser, {
        code: 'ELEC',
        name: 'Điện sinh hoạt',
        type: ServiceType.UTILITY,
        unit: 'kWh',
        calcMethod: ServiceCalcMethod.METER,
        unitPrice: 3500,
        scope: { propertyIds: ['prop-1'] },
      });

      expect(result.code).toBe('ELEC');
      expect(result.unitPrice).toBe(3500);
      expect(result.priceHistory).toHaveLength(1);
      expect(result.priceHistory[0].unitPrice).toBe(3500);
      expect(result.priceHistory[0].effectiveFrom).toBeInstanceOf(Date);
      expect(serviceRepo.create).toHaveBeenCalledWith(
        'org-test-1',
        expect.objectContaining({
          code: 'ELEC',
          unitPrice: 3500,
          isActive: true,
        }),
      );
    });

    it('chặn tạo trùng mã dịch vụ trong cùng tổ chức -> throw ConflictException', async () => {
      (serviceRepo.findByCode as jest.Mock).mockResolvedValue({
        _id: 'existing-srv',
        code: 'ELEC',
      });

      await expect(
        service.createService(mockUser, {
          code: 'elec',
          name: 'Điện mới',
          unit: 'kWh',
          calcMethod: ServiceCalcMethod.METER,
          unitPrice: 4000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateService (Đổi giá -> push priceHistory, KHÔNG ảnh hưởng hóa đơn cũ)', () => {
    it('khi đổi unitPrice: tự động push vào priceHistory với effectiveFrom mới', async () => {
      const existingService = {
        _id: 'srv-1',
        organizationId: 'org-test-1',
        code: 'ELEC',
        name: 'Điện sinh hoạt',
        unitPrice: 3500,
        priceHistory: [{ unitPrice: 3500, effectiveFrom: new Date('2026-01-01') }],
      };
      (serviceRepo.findById as jest.Mock).mockResolvedValue(existingService);
      (serviceRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) => {
        return Promise.resolve({
          ...existingService,
          unitPrice: update.$set.unitPrice,
          priceHistory: [...existingService.priceHistory, update.$push.priceHistory],
        });
      });

      const effectiveDateStr = '2026-11-01T00:00:00.000Z';
      const result = await service.updateService(mockUser, 'srv-1', {
        unitPrice: 4000,
        effectiveFrom: effectiveDateStr,
      });

      expect(serviceRepo.updateOne).toHaveBeenCalledWith(
        'org-test-1',
        { _id: 'srv-1' },
        expect.objectContaining({
          $set: expect.objectContaining({ unitPrice: 4000 }),
          $push: {
            priceHistory: {
              unitPrice: 4000,
              effectiveFrom: new Date(effectiveDateStr),
            },
          },
        }),
      );
      expect(result.unitPrice).toBe(4000);
      expect(result.priceHistory).toHaveLength(2);
      expect(result.priceHistory[1].unitPrice).toBe(4000);
    });

    it('khi sửa trường khác không phải unitPrice: không push vào priceHistory', async () => {
      const existingService = {
        _id: 'srv-1',
        organizationId: 'org-test-1',
        code: 'WATER',
        name: 'Nước cũ',
        unitPrice: 25000,
        priceHistory: [{ unitPrice: 25000, effectiveFrom: new Date('2026-01-01') }],
      };
      (serviceRepo.findById as jest.Mock).mockResolvedValue(existingService);
      (serviceRepo.updateOne as jest.Mock).mockResolvedValue({
        ...existingService,
        name: 'Nước sinh hoạt sạch',
      });

      await service.updateService(mockUser, 'srv-1', {
        name: 'Nước sinh hoạt sạch',
      });

      expect(serviceRepo.updateOne).toHaveBeenCalledWith(
        'org-test-1',
        { _id: 'srv-1' },
        expect.objectContaining({
          $set: { name: 'Nước sinh hoạt sạch' },
        }),
      );
      // Không có $push khi giá không đổi
      const updateCall = (serviceRepo.updateOne as jest.Mock).mock.calls[0][2];
      expect(updateCall.$push).toBeUndefined();
    });

    it('báo lỗi 404 ResourceNotFoundException khi dịch vụ không tồn tại', async () => {
      (serviceRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateService(mockUser, 'srv-unknown', { name: 'Test' }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('listServices', () => {
    it('lọc dịch vụ theo propertyId bao gồm dịch vụ riêng của property và dịch vụ áp dụng toàn hệ thống', async () => {
      (serviceRepo.findPaginated as jest.Mock).mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
      });

      await service.listServices(mockUser, {
        propertyId: 'prop-1',
        isActive: true,
      });

      expect(serviceRepo.findPaginated).toHaveBeenCalledWith(
        'org-test-1',
        expect.objectContaining({
          isActive: true,
          $or: [{ 'scope.propertyIds': 'prop-1' }, { 'scope.propertyIds': { $size: 0 } }],
        }),
        undefined,
        undefined,
      );
    });
  });
});
