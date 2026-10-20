import { ContractService } from './contract.service';
import { ContractRepository } from './contract.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { TenantRepository } from '../tenant/tenant.repository';
import { ContractStatus, RoomStatus, UserRole } from '../../common/constants';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

import { PropertyRepository } from '../property/repositories/property.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import { AuthService } from '../auth/auth.service';

describe('ContractService', () => {
  let service: ContractService;
  let contractRepo: jest.Mocked<Partial<ContractRepository>>;
  let roomRepo: jest.Mocked<Partial<RoomRepository>>;
  let tenantRepo: jest.Mocked<Partial<TenantRepository>>;
  let propertyRepo: jest.Mocked<Partial<PropertyRepository>>;
  let counterRepo: jest.Mocked<Partial<CounterRepository>>;
  let authService: jest.Mocked<Partial<AuthService>>;
  let mockConnection: any;
  let mockMeterReadingModel: any;
  let mockInvoiceModel: any;

  const mockUser: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@example.com',
    organizationId: 'org-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  const mockTenantUser: AuthenticatedUser = {
    userId: 'user-tenant-1',
    email: 'tenant@example.com',
    organizationId: 'org-1',
    role: UserRole.TENANT,
    tenantId: 'tenant-123',
    permissions: [],
  };

  beforeEach(() => {
    contractRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      findActiveContractByRoom: jest.fn(),
      updateOne: jest.fn(),
      findPaginated: jest.fn(),
      getModel: jest.fn().mockReturnValue({ create: jest.fn() }),
    };

    roomRepo = {
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      updateOne: jest.fn(),
    };

    tenantRepo = {
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
    };

    propertyRepo = {
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
    };

    counterRepo = {
      getNextSequence: jest.fn().mockResolvedValue(1),
    };

    authService = {
      createTenantInvitation: jest.fn().mockResolvedValue({ inviteToken: 'test-token' } as any),
    };

    mockConnection = {
      startSession: jest.fn(),
    };

    mockMeterReadingModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      }),
    };

    mockInvoiceModel = {
      find: jest.fn().mockResolvedValue([]),
    };

    service = new ContractService(
      contractRepo as unknown as ContractRepository,
      roomRepo as unknown as RoomRepository,
      tenantRepo as unknown as TenantRepository,
      propertyRepo as unknown as PropertyRepository,
      counterRepo as unknown as CounterRepository,
      authService as unknown as AuthService,
      mockConnection,
      mockMeterReadingModel,
      mockInvoiceModel,
    );
  });

  describe('activateContract', () => {
    it('should activate a DRAFT contract and set room to OCCUPIED', async () => {
      const draftContract = {
        _id: 'contract-1',
        contractNumber: 'HD-001',
        roomId: 'room-1',
        status: ContractStatus.DRAFT,
      };

      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(draftContract);
      (contractRepo.findActiveContractByRoom as jest.Mock).mockResolvedValue(null);
      (contractRepo.updateOne as jest.Mock).mockResolvedValue({
        ...draftContract,
        status: ContractStatus.ACTIVE,
        isCurrent: true,
      });

      const result = await service.activateContract(mockUser, 'contract-1');

      expect(contractRepo.updateOne).toHaveBeenCalledWith(
        'org-1',
        { _id: 'contract-1' },
        { $set: { status: ContractStatus.ACTIVE, isCurrent: true } },
      );
      expect(roomRepo.updateOne).toHaveBeenCalledWith(
        'org-1',
        { _id: 'room-1' },
        { $set: { status: RoomStatus.OCCUPIED, currentContractId: 'contract-1' } },
      );
      expect(result?.status).toBe(ContractStatus.ACTIVE);
    });

    it('should throw 422 BUSINESS_RULE_VIOLATION if contract is not DRAFT', async () => {
      const activeContract = {
        _id: 'contract-1',
        status: ContractStatus.ACTIVE,
      };
      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(activeContract);

      await expect(service.activateContract(mockUser, 'contract-1')).rejects.toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should throw 422 BUSINESS_RULE_VIOLATION if room already has an active contract', async () => {
      const draftContract = {
        _id: 'contract-1',
        roomId: 'room-1',
        status: ContractStatus.DRAFT,
      };
      const existingActiveContract = {
        _id: 'contract-2',
        contractNumber: 'HD-999',
        roomId: 'room-1',
        status: ContractStatus.ACTIVE,
      };

      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(draftContract);
      (contractRepo.findActiveContractByRoom as jest.Mock).mockResolvedValue(
        existingActiveContract,
      );

      await expect(service.activateContract(mockUser, 'contract-1')).rejects.toThrow(
        BusinessRuleViolationException,
      );
    });
  });

  describe('terminateContract', () => {
    it('should terminate an ACTIVE contract and free the room to AVAILABLE', async () => {
      const activeContract = {
        _id: 'contract-1',
        roomId: 'room-1',
        status: ContractStatus.ACTIVE,
      };

      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(activeContract);
      (contractRepo.updateOne as jest.Mock).mockResolvedValue({
        ...activeContract,
        status: ContractStatus.TERMINATED,
      });

      await service.terminateContract(mockUser, 'contract-1', {
        reason: 'Tenant moved out',
      });

      expect(contractRepo.updateOne).toHaveBeenCalledWith(
        'org-1',
        { _id: 'contract-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: ContractStatus.TERMINATED,
            isCurrent: false,
            terminationReason: 'Tenant moved out',
          }),
        }),
      );
      expect(roomRepo.updateOne).toHaveBeenCalledWith(
        'org-1',
        { _id: 'room-1' },
        { $set: { status: RoomStatus.VACANT, currentContractId: null } },
      );
    });

    it('should throw 422 BUSINESS_RULE_VIOLATION if terminating non-active contract', async () => {
      const terminatedContract = {
        _id: 'contract-1',
        status: ContractStatus.TERMINATED,
      };
      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(terminatedContract);

      await expect(
        service.terminateContract(mockUser, 'contract-1', { reason: 'Test' }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });
  });

  describe('Ownership protection (Rule 2)', () => {
    it('should return 404 NOT FOUND if tenant tries to access another tenant contract', async () => {
      const otherTenantContract = {
        _id: 'contract-99',
        tenantId: 'tenant-OTHER',
        status: ContractStatus.ACTIVE,
      };

      (contractRepo.findById as jest.Mock).mockResolvedValue(otherTenantContract);

      await expect(
        service.getContractById(mockTenantUser, 'contract-99'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should allow tenant to access their own contract', async () => {
      const myContract = {
        _id: 'contract-1',
        tenantId: 'tenant-123',
        status: ContractStatus.ACTIVE,
      };

      (contractRepo.findById as jest.Mock).mockResolvedValue(myContract);

      const res = await service.getContractById(mockTenantUser, 'contract-1');
      expect(res).toBeDefined();
      expect(res._id).toBe('contract-1');
    });
  });
});
