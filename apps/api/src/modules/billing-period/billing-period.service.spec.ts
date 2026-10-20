import { BillingPeriodService } from './billing-period.service';
import { BillingPeriodRepository } from './repositories/billing-period.repository';
import { ContractRepository } from '../contract/contract.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { ServiceRepository } from '../service/repositories/service.repository';
import { MeterReadingRepository } from '../meter-reading/meter-reading.repository';
import { MeterRepository } from '../meter-reading/repositories/meter.repository';
import { InvoiceRepository } from '../invoice/invoice.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import {
  BillingPeriodStatus,
  ContractStatus,
  InvoiceStatus,
  MeterReadingStatus,
  MeterType,
  ServiceCalcMethod,
  UserRole,
} from '../../common/constants';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

describe('BillingPeriodService', () => {
  let service: BillingPeriodService;
  let periodRepo: jest.Mocked<Partial<BillingPeriodRepository>>;
  let contractRepo: jest.Mocked<Partial<ContractRepository>>;
  let propertyRepo: jest.Mocked<Partial<PropertyRepository>>;
  let roomRepo: jest.Mocked<Partial<RoomRepository>>;
  let serviceRepo: jest.Mocked<Partial<ServiceRepository>>;
  let meterReadingRepo: jest.Mocked<Partial<MeterReadingRepository>>;
  let meterRepo: jest.Mocked<Partial<MeterRepository>>;
  let invoiceRepo: jest.Mocked<Partial<InvoiceRepository>>;
  let counterRepo: jest.Mocked<Partial<CounterRepository>>;
  let orgRepo: jest.Mocked<Partial<OrganizationRepository>>;

  const mockUser: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@example.com',
    organizationId: 'org-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(() => {
    periodRepo = {
      findById: jest.fn(),
      findByPropertyAndPeriod: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn(),
    };
    contractRepo = { find: jest.fn() };
    propertyRepo = { findByIdOrThrow: jest.fn() };
    roomRepo = { findById: jest.fn() };
    serviceRepo = { findById: jest.fn() };
    meterReadingRepo = { findByMeterAndPeriod: jest.fn(), findByRoomAndPeriod: jest.fn() };
    meterRepo = { findMetersByRoom: jest.fn() };
    invoiceRepo = { findActiveByContractAndPeriod: jest.fn(), create: jest.fn() };
    counterRepo = { getNextSequence: jest.fn().mockResolvedValue(101) };
    orgRepo = { findById: jest.fn().mockResolvedValue({ settings: { roundingStep: 1000, invoiceDueDays: 5 } }) };

    service = new BillingPeriodService(
      periodRepo as unknown as BillingPeriodRepository,
      contractRepo as unknown as ContractRepository,
      propertyRepo as unknown as PropertyRepository,
      roomRepo as unknown as RoomRepository,
      serviceRepo as unknown as ServiceRepository,
      meterReadingRepo as unknown as MeterReadingRepository,
      meterRepo as unknown as MeterRepository,
      invoiceRepo as unknown as InvoiceRepository,
      counterRepo as unknown as CounterRepository,
      orgRepo as unknown as OrganizationRepository,
    );
  });

  describe('generateInvoices', () => {
    it('chỉ tạo hóa đơn khi chỉ số đồng hồ (METER) bắt buộc đã LOCKED', async () => {
      (periodRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'bp-1',
        propertyId: 'prop-1',
        period: '2026-10',
        status: BillingPeriodStatus.OPEN,
      });

      (contractRepo.find as jest.Mock).mockResolvedValue([
        {
          _id: 'contract-1',
          propertyId: 'prop-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          status: ContractStatus.ACTIVE,
          rent: 3000000,
          startDate: '2026-10-01',
          serviceSubscriptions: [{ serviceId: 'srv-elec' }],
        },
      ]);

      (roomRepo.findById as jest.Mock).mockResolvedValue({ _id: 'room-1', code: '101' });
      (invoiceRepo.findActiveByContractAndPeriod as jest.Mock).mockResolvedValue(null);
      (serviceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'srv-elec',
        code: 'ELEC',
        calcMethod: ServiceCalcMethod.METER,
        unitPrice: 3500,
      });

      (meterRepo.findMetersByRoom as jest.Mock).mockResolvedValue([
        { _id: 'meter-elec-1', type: MeterType.ELECTRIC, serialNo: 'E01' },
      ]);

      // Đồng hồ chưa LOCKED (DRAFT)
      (meterReadingRepo.findByMeterAndPeriod as jest.Mock).mockResolvedValue({
        _id: 'mr-1',
        status: MeterReadingStatus.DRAFT,
        isLocked: false,
      });

      const res = await service.generateInvoices(mockUser, 'bp-1');

      expect(res.created).toBe(0);
      expect(res.skipped).toHaveLength(1);
      expect(res.skipped[0].roomCode).toBe('101');
      expect(res.skipped[0].reason).toContain('chưa được KHÓA (LOCKED)');
    });

    it('tạo hóa đơn thành công khi chỉ số đã LOCKED với mã INV-YYMM-000123', async () => {
      (periodRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'bp-1',
        propertyId: 'prop-1',
        period: '2026-10',
        status: BillingPeriodStatus.OPEN,
      });

      (contractRepo.find as jest.Mock).mockResolvedValue([
        {
          _id: 'contract-1',
          propertyId: 'prop-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          status: ContractStatus.ACTIVE,
          rent: 3000000,
          startDate: '2026-10-01',
          serviceSubscriptions: [{ serviceId: 'srv-elec' }],
        },
      ]);

      (roomRepo.findById as jest.Mock).mockResolvedValue({ _id: 'room-1', code: '101' });
      (invoiceRepo.findActiveByContractAndPeriod as jest.Mock).mockResolvedValue(null);
      (serviceRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'srv-elec',
        code: 'ELEC',
        calcMethod: ServiceCalcMethod.METER,
        unitPrice: 3500,
      });

      (meterRepo.findMetersByRoom as jest.Mock).mockResolvedValue([
        { _id: 'meter-elec-1', type: MeterType.ELECTRIC, serialNo: 'E01' },
      ]);

      // Đồng hồ đã LOCKED
      (meterReadingRepo.findByMeterAndPeriod as jest.Mock).mockResolvedValue({
        _id: 'mr-1',
        status: MeterReadingStatus.LOCKED,
        isLocked: true,
        consumption: 100,
        unitPrice: 3500,
      });

      (invoiceRepo.create as jest.Mock).mockImplementation((_orgId, data) =>
        Promise.resolve({ _id: 'inv-1', ...data }),
      );

      const res = await service.generateInvoices(mockUser, 'bp-1');

      expect(res.created).toBe(1);
      expect(res.skipped).toHaveLength(0);
      expect(invoiceRepo.create).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          invoiceNumber: 'INV-2610-000101',
          invoiceNo: 'INV-2610-000101',
          status: InvoiceStatus.DRAFT,
          totalAmount: 3350000, // 3,000,000 + 100*3500
        }),
      );
    });

    it('Concurrency: 2 request generate song song -> Idempotent không tạo trùng (duplicates counter)', async () => {
      (periodRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'bp-1',
        propertyId: 'prop-1',
        period: '2026-10',
        status: BillingPeriodStatus.OPEN,
      });

      (contractRepo.find as jest.Mock).mockResolvedValue([
        {
          _id: 'contract-1',
          propertyId: 'prop-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          status: ContractStatus.ACTIVE,
          rent: 3000000,
        },
      ]);

      // Giả lập hóa đơn đã tồn tại cho hợp đồng này trong kỳ (do request 1 đã tạo)
      (invoiceRepo.findActiveByContractAndPeriod as jest.Mock).mockResolvedValue({
        _id: 'inv-existing',
      });

      const res = await service.generateInvoices(mockUser, 'bp-1');

      expect(res.created).toBe(0);
      expect(res.duplicates).toBe(1);
      expect(invoiceRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('đóng kỳ tính phí chuyển trạng thái sang CLOSED', async () => {
      (periodRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'bp-1',
        status: BillingPeriodStatus.OPEN,
      });

      (periodRepo.updateOne as jest.Mock).mockResolvedValue({
        _id: 'bp-1',
        status: BillingPeriodStatus.CLOSED,
      });

      const res = await service.close(mockUser, 'bp-1', { notes: 'Đã hoàn tất thu tiền kỳ' });
      expect(periodRepo.updateOne).toHaveBeenCalledWith(
        'org-1',
        { _id: 'bp-1' },
        {
          $set: expect.objectContaining({
            status: BillingPeriodStatus.CLOSED,
            notes: 'Đã hoàn tất thu tiền kỳ',
          }),
        },
      );
    });
  });
});
