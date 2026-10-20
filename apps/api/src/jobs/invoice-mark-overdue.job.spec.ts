import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceMarkOverdueJob } from './invoice-mark-overdue.job';
import { InvoiceRepository } from '../modules/invoice/invoice.repository';
import { NotificationService } from '../modules/notification/notification.service';
import { InvoiceStatus, NotificationType } from '../common/constants';

describe('InvoiceMarkOverdueJob (Idempotency Test)', () => {
  let job: InvoiceMarkOverdueJob;
  let invoiceRepo: Partial<Record<keyof InvoiceRepository, jest.Mock>>;
  let notificationService: Partial<Record<keyof NotificationService, jest.Mock>>;

  // In-memory invoice dataset
  let mockInvoices: any[];

  beforeEach(async () => {
    const yesterday = new Date(Date.now() - 86400000);
    const tomorrow = new Date(Date.now() + 86400000);

    mockInvoices = [
      {
        _id: 'inv-past-due-1',
        organizationId: 'org-test',
        invoiceNo: 'INV-2610-000001',
        invoiceNumber: 'INV-2610-000001',
        tenantId: 'tenant-1',
        status: InvoiceStatus.ISSUED, // Should become OVERDUE
        dueDate: yesterday,
        remainingAmount: 3500000,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      },
      {
        _id: 'inv-future-due-2',
        organizationId: 'org-test',
        invoiceNo: 'INV-2610-000002',
        invoiceNumber: 'INV-2610-000002',
        tenantId: 'tenant-2',
        status: InvoiceStatus.ISSUED, // Due tomorrow, should NOT change
        dueDate: tomorrow,
        remainingAmount: 4000000,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      },
    ];

    invoiceRepo = {
      find: jest.fn().mockImplementation(async (organizationId: string, filter: any) => {
        return mockInvoices.filter((inv) => {
          if (inv.organizationId !== organizationId) return false;
          if (filter.status?.$in && !filter.status.$in.includes(inv.status)) return false;
          if (filter.dueDate?.$lt && !(inv.dueDate < filter.dueDate.$lt)) return false;
          if (filter.remainingAmount?.$gt && !(inv.remainingAmount > filter.remainingAmount.$gt))
            return false;
          return true;
        });
      }),
    };

    notificationService = {
      dispatchNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceMarkOverdueJob,
        { provide: InvoiceRepository, useValue: invoiceRepo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    job = module.get<InvoiceMarkOverdueJob>(InvoiceMarkOverdueJob);
  });

  it('Lần chạy 1: quét hóa đơn quá hạn -> chuyển sang OVERDUE và bắn thông báo', async () => {
    const res1 = await job.execute('org-test');

    expect(res1.processed).toBe(1);
    expect(res1.updated).toBe(1);
    expect(mockInvoices[0].status).toBe(InvoiceStatus.OVERDUE);
    expect(mockInvoices[1].status).toBe(InvoiceStatus.ISSUED); // Không đổi
    expect(notificationService.dispatchNotification).toHaveBeenCalledTimes(1);
    expect(notificationService.dispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.INVOICE_OVERDUE,
        userId: 'tenant-1',
      }),
    );
  });

  it('Lần chạy 2 (Idempotent): chạy lại lần 2 không đổi kết quả và không bắn trùng thông báo', async () => {
    // Lần 1
    const res1 = await job.execute('org-test');
    expect(res1.updated).toBe(1);
    expect(notificationService.dispatchNotification).toHaveBeenCalledTimes(1);

    // Lần 2 (ngay sau đó hoặc cron chạy lại cùng ngày)
    const res2 = await job.execute('org-test');

    expect(res2.processed).toBe(0);
    expect(res2.updated).toBe(0);
    // Hóa đơn vẫn giữ nguyên trạng thái OVERDUE
    expect(mockInvoices[0].status).toBe(InvoiceStatus.OVERDUE);
    // Notification không bị gọi thêm lần nào nữa (vẫn là 1 lần duy nhất từ đợt 1)
    expect(notificationService.dispatchNotification).toHaveBeenCalledTimes(1);
  });
});
