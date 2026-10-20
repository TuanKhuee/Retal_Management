import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceRequestRepository } from './maintenance-request.repository';
import { MaintenanceMessageRepository } from './maintenance-message.repository';
import { ContractRepository } from '../contract/contract.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import { RealtimeGateway } from '../../infra/socket/socket.gateway';
import { FcmService } from '../../infra/fcm/fcm.service';
import {
  ContractStatus,
  MaintenancePriority,
  MaintenanceStatus,
  UserRole,
} from '../../common/constants';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let maintenanceRepo: Partial<Record<keyof MaintenanceRequestRepository, jest.Mock>>;
  let messageRepo: Partial<Record<keyof MaintenanceMessageRepository, jest.Mock>>;
  let contractRepo: Partial<Record<keyof ContractRepository, jest.Mock>>;
  let counterRepo: Partial<Record<keyof CounterRepository, jest.Mock>>;
  let realtimeGateway: Partial<Record<keyof RealtimeGateway, jest.Mock>>;
  let fcmService: Partial<Record<keyof FcmService, jest.Mock>>;

  const mockTenantUserA: AuthenticatedUser = {
    userId: 'user-tenant-a',
    email: 'tenant_a@test.com',
    organizationId: 'org-test',
    role: UserRole.TENANT,
    tenantId: 'tenant-a',
    permissions: [],
  };

  const mockTenantUserB: AuthenticatedUser = {
    userId: 'user-tenant-b',
    email: 'tenant_b@test.com',
    organizationId: 'org-test',
    role: UserRole.TENANT,
    tenantId: 'tenant-b',
    permissions: [],
  };

  const mockOwnerUser: AuthenticatedUser = {
    userId: 'user-owner',
    email: 'owner@test.com',
    organizationId: 'org-test',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(async () => {
    maintenanceRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findWithFilters: jest.fn(),
    };

    messageRepo = {
      create: jest.fn(),
      findMessagesCursor: jest.fn(),
    };

    contractRepo = {
      findActiveContractsByTenant: jest.fn(),
    };

    counterRepo = {
      getNextSequence: jest.fn().mockResolvedValue(1),
    };

    realtimeGateway = {
      emitToOrganization: jest.fn(),
      emitToTenant: jest.fn(),
    };

    fcmService = {
      sendPushNotification: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: MaintenanceRequestRepository, useValue: maintenanceRepo },
        { provide: MaintenanceMessageRepository, useValue: messageRepo },
        { provide: ContractRepository, useValue: contractRepo },
        { provide: CounterRepository, useValue: counterRepo },
        { provide: RealtimeGateway, useValue: realtimeGateway },
        { provide: FcmService, useValue: fcmService },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  describe('createRequest', () => {
    it('TENANT tạo ticket thành công: tự gán roomId/tenantId từ hợp đồng active, sinh mã MR-YYMM-000123', async () => {
      (contractRepo.findActiveContractsByTenant as jest.Mock).mockResolvedValue([
        {
          _id: 'contract-1',
          propertyId: 'prop-1',
          roomId: 'room-101',
          status: ContractStatus.ACTIVE,
        },
      ]);

      const mockTicket = {
        _id: 'ticket-1',
        requestNo: 'MR-2610-000001',
        roomId: 'room-101',
        tenantId: 'tenant-a',
        category: 'PLUMBING',
        title: 'Nước rỉ bồn cầu',
        description: 'Bồn cầu bị rò rỉ nước liên tục',
        status: MaintenanceStatus.NEW,
        save: jest.fn(),
      };
      (maintenanceRepo.create as jest.Mock).mockResolvedValue(mockTicket);

      const result = await service.createRequest(mockTenantUserA, {
        category: 'PLUMBING',
        title: 'Nước rỉ bồn cầu',
        description: 'Bồn cầu bị rò rỉ nước liên tục',
      });

      expect(result.requestNo).toBe('MR-2610-000001');
      expect(result.roomId).toBe('room-101');
      expect(result.tenantId).toBe('tenant-a');
      expect(maintenanceRepo.create).toHaveBeenCalledWith(
        'org-test',
        expect.objectContaining({
          propertyId: 'prop-1',
          roomId: 'room-101',
          tenantId: 'tenant-a',
          status: MaintenanceStatus.NEW,
        }),
      );
      expect(realtimeGateway.emitToOrganization).toHaveBeenCalled();
    });

    it('từ chối tạo ticket nếu người thuê không có hợp đồng ACTIVE nào', async () => {
      (contractRepo.findActiveContractsByTenant as jest.Mock).mockResolvedValue([]);

      await expect(
        service.createRequest(mockTenantUserA, {
          category: 'PLUMBING',
          title: 'Hỏng vòi sen',
          description: 'Vòi sen bị gãy',
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });
  });

  describe('getRequestById & Tenant Isolation', () => {
    it('OWNER đọc được ticket bất kỳ trong tổ chức', async () => {
      const mockTicket = {
        _id: 'ticket-a',
        tenantId: 'tenant-a',
        title: 'Sửa điện',
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(mockTicket);

      const result = await service.getRequestById(mockOwnerUser, 'ticket-a');
      expect(result._id).toBe('ticket-a');
    });

    it('TENANT A đọc được ticket của chính mình', async () => {
      const mockTicket = {
        _id: 'ticket-a',
        tenantId: 'tenant-a',
        title: 'Sửa điện',
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(mockTicket);

      const result = await service.getRequestById(mockTenantUserA, 'ticket-a');
      expect(result._id).toBe('ticket-a');
    });

    it('TENANT A không đọc được ticket của TENANT B -> trả về 404 ResourceNotFoundException', async () => {
      const mockTicket = {
        _id: 'ticket-b',
        tenantId: 'tenant-b', // của tenant B
        title: 'Sửa mạng phòng B',
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(mockTicket);

      await expect(
        service.getRequestById(mockTenantUserA, 'ticket-b'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('State Machine & Transition Rules', () => {
    it('chuyển trạng thái đúng luồng: NEW -> ACCEPTED -> IN_PROGRESS -> RESOLVED (kèm cost)', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        status: MaintenanceStatus.NEW,
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      // 1. NEW -> ACCEPTED
      await service.transitionStatus(mockOwnerUser, 'ticket-1', {
        to: MaintenanceStatus.ACCEPTED,
        note: 'Đã tiếp nhận yêu cầu',
      });
      expect(ticket.status).toBe(MaintenanceStatus.ACCEPTED);

      // 2. ACCEPTED -> IN_PROGRESS
      await service.transitionStatus(mockOwnerUser, 'ticket-1', {
        to: MaintenanceStatus.IN_PROGRESS,
        note: 'Thợ đang tiến hành sửa',
      });
      expect(ticket.status).toBe(MaintenanceStatus.IN_PROGRESS);

      // 3. IN_PROGRESS -> RESOLVED
      await service.transitionStatus(mockOwnerUser, 'ticket-1', {
        to: MaintenanceStatus.RESOLVED,
        note: 'Đã thay xong dây điện',
        cost: { amount: 150000, paidBy: 'LANDLORD' },
      });
      expect(ticket.status).toBe(MaintenanceStatus.RESOLVED);
      expect(ticket.cost).toEqual({ amount: 150000, paidBy: 'LANDLORD' });
      expect(ticket.statusHistory.length).toBe(3);
    });

    it('từ chối chuyển trạng thái sai luồng (ví dụ NEW -> RESOLVED) -> ném 422', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        status: MaintenanceStatus.NEW,
        statusHistory: [],
        save: jest.fn(),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.transitionStatus(mockOwnerUser, 'ticket-1', {
          to: MaintenanceStatus.RESOLVED,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('từ chối chuyển trạng thái sai luồng (ví dụ IN_PROGRESS -> ACCEPTED) -> ném 422', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        status: MaintenanceStatus.IN_PROGRESS,
        statusHistory: [],
        save: jest.fn(),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.transitionStatus(mockOwnerUser, 'ticket-1', {
          to: MaintenanceStatus.ACCEPTED,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('TENANT confirm thành công khi ticket đã RESOLVED -> CONFIRMED', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        tenantId: 'tenant-a',
        status: MaintenanceStatus.RESOLVED,
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      await service.confirmRequest(mockTenantUserA, 'ticket-1', {
        note: 'Đã kiểm tra, hoạt động tốt',
      });
      expect(ticket.status).toBe(MaintenanceStatus.CONFIRMED);
    });

    it('TENANT từ chối confirm nếu ticket chưa RESOLVED -> ném 422', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        tenantId: 'tenant-a',
        status: MaintenanceStatus.IN_PROGRESS,
        statusHistory: [],
        save: jest.fn(),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.confirmRequest(mockTenantUserA, 'ticket-1'),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('TENANT reopen thành công khi ticket RESOLVED -> REOPENED, sau đó OWNER chuyển lại IN_PROGRESS', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        tenantId: 'tenant-a',
        status: MaintenanceStatus.RESOLVED,
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      // Reopen
      await service.reopenRequest(mockTenantUserA, 'ticket-1', {
        note: 'Vẫn còn nhỏ giọt',
      });
      expect(ticket.status).toBe(MaintenanceStatus.REOPENED);

      // OWNER chuyển lại IN_PROGRESS từ REOPENED
      await service.transitionStatus(mockOwnerUser, 'ticket-1', {
        to: MaintenanceStatus.IN_PROGRESS,
        note: 'Cử thợ qua siết lại',
      });
      expect(ticket.status).toBe(MaintenanceStatus.IN_PROGRESS);
    });

    it('TENANT cancel thành công khi NEW hoặc ACCEPTED, từ chối khi IN_PROGRESS (422)', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        tenantId: 'tenant-a',
        status: MaintenanceStatus.NEW,
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      // Cancel NEW
      await service.cancelRequest(mockTenantUserA, 'ticket-1', {
        note: 'Tự sửa được rồi',
      });
      expect(ticket.status).toBe(MaintenanceStatus.CANCELLED);

      // Khi ticket đã IN_PROGRESS
      ticket.status = MaintenanceStatus.IN_PROGRESS;
      await expect(
        service.cancelRequest(mockTenantUserA, 'ticket-1'),
      ).rejects.toThrow(BusinessRuleViolationException);
    });
  });

  describe('Messages / Chat', () => {
    it('chỉ người tham gia ticket mới gửi và đọc được messages', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        tenantId: 'tenant-a',
        save: jest.fn().mockResolvedValue(true),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      // TENANT A gửi tin nhắn thành công
      (messageRepo.create as jest.Mock).mockResolvedValue({
        _id: 'msg-1',
        content: 'Thợ qua chưa ạ?',
      });

      const sentMsg = await service.sendMessage(mockTenantUserA, 'ticket-1', {
        content: 'Thợ qua chưa ạ?',
      });
      expect(sentMsg.content).toBe('Thợ qua chưa ạ?');
      expect(ticket.unreadByOwner).toBe(true);

      // TENANT B cố gửi tin nhắn vào ticket của TENANT A -> ném 404
      await expect(
        service.sendMessage(mockTenantUserB, 'ticket-1', {
          content: 'Xâm nhập trái phép',
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('đánh dấu đã đọc tin nhắn', async () => {
      const ticket: any = {
        _id: 'ticket-1',
        tenantId: 'tenant-a',
        unreadByTenant: true,
        save: jest.fn().mockResolvedValue(true),
      };
      (maintenanceRepo.findById as jest.Mock).mockResolvedValue(ticket);

      const res = await service.markMessagesRead(mockTenantUserA, 'ticket-1');
      expect(res.success).toBe(true);
      expect(ticket.unreadByTenant).toBe(false);
    });
  });
});
