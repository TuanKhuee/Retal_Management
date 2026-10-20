import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { ReportService } from './report.service';
import { ReportExportJob } from '../../jobs/report-export.job';
import { NotificationService } from '../notification/notification.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';

describe('ReportService', () => {
  let service: ReportService;
  let reportExportJob: Partial<Record<keyof ReportExportJob, jest.Mock>>;
  let notificationService: Partial<Record<keyof NotificationService, jest.Mock>>;
  let mockConnection: any;

  const mockOwner: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@test.com',
    organizationId: 'org-test',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(async () => {
    reportExportJob = {
      execute: jest.fn().mockResolvedValue({ success: true }),
    };

    notificationService = {
      dispatchNotification: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      collection: jest.fn().mockImplementation((name: string) => ({
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockImplementation(async () => {
            if (name === 'invoices') {
              return [
                {
                  totalBilled: 10000000,
                  totalCollected: 7500000,
                  totalRemaining: 2500000,
                  invoiceCount: 4,
                },
              ];
            }
            if (name === 'rooms') {
              return [
                { _id: 'OCCUPIED', count: 8 },
                { _id: 'VACANT', count: 2 },
              ];
            }
            if (name === 'meter_readings') {
              return [
                { _id: 'ELECTRIC', totalConsumption: 350, totalAmount: 1225000, count: 5 },
                { _id: 'WATER', totalConsumption: 40, totalAmount: 400000, count: 5 },
              ];
            }
            return [];
          }),
        }),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockImplementation(async () => {
            if (name === 'invoices') {
              return [
                {
                  _id: 'inv-1',
                  remainingAmount: 1000000,
                  dueDate: new Date(Date.now() - 3 * 86400000), // 3 days overdue -> days1To7
                  roomId: 'room-1',
                },
                {
                  _id: 'inv-2',
                  remainingAmount: 1500000,
                  dueDate: new Date(Date.now() + 5 * 86400000), // future -> current
                  roomId: 'room-2',
                },
              ];
            }
            if (name === 'maintenance_requests') {
              return [
                {
                  _id: 'm1',
                  status: 'RESOLVED',
                  category: 'PLUMBING',
                  priority: 'HIGH',
                  cost: { amount: 200000, paidBy: 'LANDLORD' },
                },
              ];
            }
            return [];
          }),
        }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: ReportExportJob, useValue: reportExportJob },
        { provide: NotificationService, useValue: notificationService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  describe('Revenue Report', () => {
    it('tính toán tổng doanh thu, đã thu, còn lại và tỷ lệ thu', async () => {
      const res = await service.getRevenueReport('org-test', {});
      expect(res.summary.totalBilled).toBe(10000000);
      expect(res.summary.totalCollected).toBe(7500000);
      expect(res.summary.totalRemaining).toBe(2500000);
      expect(res.summary.collectionRate).toBe(75);
    });
  });

  describe('Debt Report', () => {
    it('gom nợ theo aging buckets: current và days1To7', async () => {
      const res = await service.getDebtReport('org-test', {});
      expect(res.totalDebt).toBe(2500000);
      expect(res.agingBuckets.current).toBe(1500000);
      expect(res.agingBuckets.days1To7).toBe(1000000);
      expect(res.agingBuckets.days8To30).toBe(0);
      expect(res.agingBuckets.over30Days).toBe(0);
    });
  });

  describe('Occupancy Report', () => {
    it('tính tỷ lệ lấp đầy phòng', async () => {
      const res = await service.getOccupancyReport('org-test', {});
      expect(res.totalRooms).toBe(10);
      expect(res.occupiedRooms).toBe(8);
      expect(res.vacantRooms).toBe(2);
      expect(res.occupancyRate).toBe(80);
    });
  });

  describe('Utilities Report', () => {
    it('tổng hợp điện và nước tiêu thụ', async () => {
      const res = await service.getUtilitiesReport('org-test', {});
      expect(res.electricity.consumption).toBe(350);
      expect(res.water.consumption).toBe(40);
    });
  });

  describe('Maintenance Report', () => {
    it('tổng hợp yêu cầu bảo trì và chi phí', async () => {
      const res = await service.getMaintenanceReport('org-test', {});
      expect(res.totalRequests).toBe(1);
      expect(res.byStatus.RESOLVED).toBe(1);
      expect(res.costs.totalCost).toBe(200000);
      expect(res.costs.landlordPaidCost).toBe(200000);
    });
  });

  describe('Export Report', () => {
    it('khởi tạo async export job và trả về jobId trạng thái QUEUED', async () => {
      const res = await service.exportReport(mockOwner, 'revenue', { format: 'EXCEL' as any });
      expect(res.jobId).toBeDefined();
      expect(res.type).toBe('revenue');
      expect(res.status).toBe('QUEUED');
    });
  });
});
