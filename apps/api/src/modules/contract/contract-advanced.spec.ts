import { ContractService } from './contract.service';
import { ContractRepository } from './contract.repository';
import { RoomRepository } from '../property/repositories/room.repository';
import { TenantRepository } from '../tenant/tenant.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import { AuthService } from '../auth/auth.service';
import {
  ContractStatus,
  DepositStatus,
  DepositLedgerType,
  RoomStatus,
  UserRole,
} from '../../common/constants';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

describe('Contract Advanced Features & Lifecycle Spec', () => {
  let service: ContractService;
  let contractRepo: jest.Mocked<Partial<ContractRepository>>;
  let roomRepo: jest.Mocked<Partial<RoomRepository>>;
  let tenantRepo: jest.Mocked<Partial<TenantRepository>>;
  let propertyRepo: jest.Mocked<Partial<PropertyRepository>>;
  let counterRepo: jest.Mocked<Partial<CounterRepository>>;
  let authService: jest.Mocked<Partial<AuthService>>;
  let mockConnection: any;
  let mockSession: any;
  let mockMeterReadingModel: any;
  let mockInvoiceModel: any;

  const mockUser: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@example.com',
    organizationId: 'org-test-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(() => {
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    contractRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      findActiveContractByRoom: jest.fn(),
      updateOne: jest.fn(),
      findPaginated: jest.fn(),
      getModel: jest.fn().mockReturnValue({
        create: jest.fn().mockImplementation((payload) => Promise.resolve(payload[0] || payload)),
      }),
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
      getNextSequence: jest.fn().mockResolvedValue(101),
    };

    authService = {
      createTenantInvitation: jest.fn().mockResolvedValue({ inviteToken: 'mock-invite-token' } as any),
    };

    mockMeterReadingModel = {
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          electricityNew: 1000,
          waterNew: 50,
        }),
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

  describe('1. Non-Financial Updates via PATCH /contracts/:id', () => {
    it('chặn cập nhật rent hoặc deposit qua PATCH -> throw BusinessRuleViolationException', async () => {
      await expect(
        service.updateContract(mockUser, 'contract-1', { rent: 5000000 }),
      ).rejects.toThrow(BusinessRuleViolationException);

      await expect(
        service.updateContract(mockUser, 'contract-1', { depositAmount: 5000000 }),
      ).rejects.toThrow(BusinessRuleViolationException);

      expect(contractRepo.updateOne).not.toHaveBeenCalled();
    });

    it('cho phép cập nhật các trường phi tài chính (occupants, terms, notes)', async () => {
      const existingContract = {
        _id: 'contract-1',
        rent: 4000000,
        terms: 'Dieu khoan cu',
      };
      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(existingContract);
      (contractRepo.updateOne as jest.Mock).mockResolvedValue({
        ...existingContract,
        terms: 'Dieu khoan moi',
      });

      const result = await service.updateContract(mockUser, 'contract-1', {
        terms: 'Dieu khoan moi',
        occupants: [{ fullName: 'Nguyen Van B', phone: '0912345678' }],
      });

      expect(contractRepo.updateOne).toHaveBeenCalledWith(
        'org-test-1',
        { _id: 'contract-1' },
        {
          $set: {
            terms: 'Dieu khoan moi',
            occupants: [{ fullName: 'Nguyen Van B', phone: '0912345678' }],
          },
        },
      );
      expect(result).toBeDefined();
    });
  });

  describe('2. Contract Revisions (POST /contracts/:id/revisions)', () => {
    it('thêm revision mới, tăng version, cập nhật rent và ghi lại modifiedBy', async () => {
      const contract = {
        _id: 'contract-1',
        rent: 4000000,
        version: 1,
        revisions: [],
      };
      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(contract);
      (contractRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) => {
        return Promise.resolve({
          ...contract,
          rent: update.$set.rent,
          version: 2,
          revisions: [update.$push.revisions],
        });
      });

      const res = await service.createRevision(mockUser, 'contract-1', {
        reason: 'Lắp thêm máy giặt và tăng giá thuê',
        rent: 4500000,
      });

      expect(contractRepo.updateOne).toHaveBeenCalledWith(
        'org-test-1',
        { _id: 'contract-1' },
        expect.objectContaining({
          $inc: { version: 1 },
          $set: expect.objectContaining({ rent: 4500000 }),
          $push: {
            revisions: expect.objectContaining({
              version: 2,
              reason: 'Lắp thêm máy giặt và tăng giá thuê',
              rent: 4500000,
              modifiedBy: 'user-owner-1',
            }),
          },
        }),
      );
      expect(res).toBeDefined();
      expect(res!.rent).toBe(4500000);
      expect(res!.version).toBe(2);
    });
  });

  describe('3. Deposit Ledger (POST /contracts/:id/deposit)', () => {
    it('ghi nhận nộp cọc (COLLECTED) và cập nhật trạng thái deposit.status thành COLLECTED', async () => {
      const contract = {
        _id: 'contract-1',
        deposit: { amount: 5000000, status: DepositStatus.PENDING, ledger: [] },
      };
      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(contract);
      (contractRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) => {
        return Promise.resolve({
          ...contract,
          deposit: {
            amount: 5000000,
            status: update.$set['deposit.status'],
            ledger: update.$set['deposit.ledger'],
          },
        });
      });

      const res = await service.recordDeposit(mockUser, 'contract-1', {
        type: DepositLedgerType.COLLECTED,
        amount: 5000000,
        reason: 'Nộp tiền cọc đợt 1',
      });

      expect(res).toBeDefined();
      expect(res!.deposit.status).toBe(DepositStatus.COLLECTED);
      expect(res!.deposit.ledger).toHaveLength(1);
      expect(res!.deposit.ledger[0].amount).toBe(5000000);
    });

    it('ghi nhận khấu trừ cọc (DEDUCTED) và hoàn cọc (REFUNDED)', async () => {
      const contract = {
        _id: 'contract-1',
        deposit: {
          amount: 5000000,
          status: DepositStatus.COLLECTED,
          ledger: [
            { type: DepositLedgerType.COLLECTED, amount: 5000000, date: new Date() },
          ],
        },
      };
      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(contract);
      (contractRepo.updateOne as jest.Mock).mockImplementation((_orgId, _filter, update) => {
        return Promise.resolve({
          ...contract,
          deposit: {
            amount: 5000000,
            status: update.$set['deposit.status'],
            ledger: update.$set['deposit.ledger'],
          },
        });
      });

      const res = await service.recordDeposit(mockUser, 'contract-1', {
        type: DepositLedgerType.DEDUCTED,
        amount: 2000000,
        reason: 'Trừ tiền làm hỏng sàn gỗ',
      });

      expect(res).toBeDefined();
      expect(res!.deposit.status).toBe(DepositStatus.PARTIALLY_REFUNDED);
      expect(res!.deposit.ledger).toHaveLength(2);
    });
  });

  describe('4. Move-out Preview (POST /contracts/:id/move-out/preview)', () => {
    it('tính toán chính xác tiền phòng prorate, tiền điện nước và cọc hoàn trả mà KHÔNG ghi database', async () => {
      const contract = {
        _id: 'contract-1',
        contractNo: 'HD-2026-0001',
        propertyId: 'prop-1',
        roomId: 'room-1',
        primaryTenantId: 'tenant-1',
        rent: 3100000, // 3.1 triệu / tháng (tháng 10 có 31 ngày -> 100k/ngày)
        deposit: {
          amount: 3100000,
          status: DepositStatus.COLLECTED,
          ledger: [{ type: DepositLedgerType.COLLECTED, amount: 3100000, date: new Date() }],
        },
      };
      const property = {
        _id: 'prop-1',
        billingConfig: {
          electricityUnitPrice: 3500,
          waterUnitPrice: 25000,
        },
      };

      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(contract);
      (propertyRepo.findById as jest.Mock).mockResolvedValue(property);

      // Trả phòng ngày 10/10/2026 -> ở 10 ngày trong tháng 31 ngày -> tiền phòng 1,000,000
      // Điện: 1050 - 1000 = 50 kWh * 3500 = 175,000
      // Nước: 52 - 50 = 2 m3 * 25000 = 50,000
      // Chi phí khác: 75,000
      // Tổng khấu trừ = 1,000,000 + 175,000 + 50,000 + 75,000 = 1,300,000
      // Tiền cọc hoàn trả = 3,100,000 - 1,300,000 = 1,800,000
      const preview = await service.moveOutPreview(mockUser, 'contract-1', {
        moveOutDate: '2026-10-10T00:00:00.000Z',
        finalMeterReading: {
          electricity: 1050,
          water: 52,
        },
        additionalCharges: [
          { description: 'Vệ sinh phòng', amount: 75000 },
        ],
      });

      expect(preview.breakdown.proratedRent.amount).toBe(1000000);
      expect(preview.breakdown.utilities.electricity.amount).toBe(175000);
      expect(preview.breakdown.utilities.water.amount).toBe(50000);
      expect(preview.settlement.totalDeductions).toBe(1300000);
      expect(preview.settlement.refundToTenant).toBe(1800000);
      expect(preview.settlement.additionalPaymentRequired).toBe(0);

      // Đảm bảo không ghi database
      expect(contractRepo.updateOne).not.toHaveBeenCalled();
      expect(roomRepo.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('5. Move-out Finalize (POST /contracts/:id/move-out)', () => {
    it('chốt chuyển ra: cập nhật TERMINATED, giải phóng phòng VACANT, ghi nhận trừ và hoàn cọc', async () => {
      const contract = {
        _id: 'contract-1',
        roomId: 'room-1',
        propertyId: 'prop-1',
        primaryTenantId: 'tenant-1',
        rent: 3000000,
        deposit: {
          amount: 3000000,
          status: DepositStatus.COLLECTED,
          ledger: [{ type: DepositLedgerType.COLLECTED, amount: 3000000, date: new Date() }],
        },
      };

      (contractRepo.findByIdOrThrow as jest.Mock).mockResolvedValue(contract);
      (propertyRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'prop-1',
        billingConfig: { electricityUnitPrice: 3500, waterUnitPrice: 25000 },
      });
      (contractRepo.updateOne as jest.Mock).mockResolvedValue({
        ...contract,
        status: ContractStatus.TERMINATED,
        isCurrent: false,
      });

      const res = await service.moveOut(mockUser, 'contract-1', {
        moveOutDate: '2026-10-10',
        reason: 'Het hop dong',
      });

      expect(contractRepo.updateOne).toHaveBeenCalledWith(
        'org-test-1',
        { _id: 'contract-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: ContractStatus.TERMINATED,
            isCurrent: false,
          }),
        }),
      );
      expect(roomRepo.updateOne).toHaveBeenCalledWith(
        'org-test-1',
        { _id: 'room-1' },
        {
          $set: {
            status: RoomStatus.VACANT,
            currentContractId: null,
          },
        },
      );
      expect(res.roomStatus).toBe(RoomStatus.VACANT);
    });
  });

  describe('6. Race Condition Protection (2 hợp đồng hiện hành cùng phòng song song)', () => {
    it('khi có 2 request kích hoạt/tạo hợp đồng hiện hành cùng phòng -> chỉ 1 thành công, cái thứ hai bị chặn', async () => {
      const room = { _id: 'room-101', status: RoomStatus.VACANT };
      const contract1 = {
        _id: 'contract-1',
        roomId: 'room-101',
        status: ContractStatus.DRAFT,
      };
      const contract2 = {
        _id: 'contract-2',
        roomId: 'room-101',
        status: ContractStatus.DRAFT,
      };

      // Giả lập hợp đồng 1 đã kích hoạt trước và chiếm isCurrent: true
      (contractRepo.findByIdOrThrow as jest.Mock).mockImplementation((_orgId, id) => {
        if (id === 'contract-1') return Promise.resolve(contract1);
        if (id === 'contract-2') return Promise.resolve(contract2);
        return Promise.resolve(null);
      });

      // Lần kiểm tra contract1: phòng chưa có active contract
      (contractRepo.findActiveContractByRoom as jest.Mock)
        .mockResolvedValueOnce(null)
        // Lần kiểm tra contract2 song song: đã thấy contract-1 active!
        .mockResolvedValueOnce({ _id: 'contract-1', contractNo: 'HD-2026-0001' });

      (contractRepo.updateOne as jest.Mock).mockResolvedValueOnce({
        ...contract1,
        status: ContractStatus.ACTIVE,
        isCurrent: true,
      });

      // Request 1 thành công
      const res1 = await service.activateContract(mockUser, 'contract-1');
      expect(res1?.status).toBe(ContractStatus.ACTIVE);

      // Request 2 song song phải bị chặn và quăng lỗi 422 BUSINESS_RULE_VIOLATION
      await expect(service.activateContract(mockUser, 'contract-2')).rejects.toThrow(
        BusinessRuleViolationException,
      );
    });
  });

  describe('7. Move-in Transaction Rollback', () => {
    it('move-in rollback toàn bộ khi phát sinh lỗi giữa chừng (ví dụ ghi meter reading thất bại)', async () => {
      const room = {
        _id: 'room-101',
        code: '101',
        status: RoomStatus.VACANT,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(room);
      (contractRepo.findActiveContractByRoom as jest.Mock).mockResolvedValue(null);
      (tenantRepo.findById as jest.Mock).mockResolvedValue({
        _id: 'tenant-101',
        fullName: 'Le Van An',
        phone: '0909000111',
      });

      // Giả lập lỗi ở bước ghi chỉ số đồng hồ đầu kỳ (Meter reading failure)
      (mockMeterReadingModel.create as jest.Mock).mockRejectedValue(
        new Error('Database disk error during meter reading insert'),
      );

      await expect(
        service.moveIn(mockUser, {
          propertyId: 'prop-1',
          roomId: 'room-101',
          tenantId: 'tenant-101',
          startDate: '2026-10-10',
          endDate: '2027-10-10',
          rent: 4000000,
          depositAmount: 4000000,
          initialMeterReading: { electricity: 120, water: 15 },
        }),
      ).rejects.toThrow('Database disk error during meter reading insert');

      // Kiểm tra transaction bị abort
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();

      // Kiểm tra phòng KHÔNG bị cập nhật trạng thái
      expect(roomRepo.updateOne).not.toHaveBeenCalled();
    });

    it('move-in bị chặn ngay lập tức nếu phòng không ở trạng thái VACANT', async () => {
      const occupiedRoom = {
        _id: 'room-101',
        code: '101',
        status: RoomStatus.OCCUPIED,
        deletedAt: null,
      };
      (roomRepo.findById as jest.Mock).mockResolvedValue(occupiedRoom);

      await expect(
        service.moveIn(mockUser, {
          propertyId: 'prop-1',
          roomId: 'room-101',
          tenantId: 'tenant-101',
          startDate: '2026-10-10',
          endDate: '2027-10-10',
          rent: 4000000,
          depositAmount: 4000000,
          initialMeterReading: { electricity: 120, water: 15 },
        }),
      ).rejects.toThrow(BusinessRuleViolationException);

      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });
  });
});
