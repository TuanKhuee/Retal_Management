import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { RealtimeGateway } from './socket.gateway';
import { UserRole } from '../../common/constants';

describe('RealtimeGateway (Socket.IO /rt)', () => {
  let gateway: RealtimeGateway;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let configService: Partial<Record<keyof ConfigService, jest.Mock>>;
  let mockConnection: any;

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    mockConnection = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
  });

  describe('JWT Handshake Authentication & Auto Room Joining', () => {
    it('từ chối kết nối nếu không có JWT token', async () => {
      const mockClient: any = {
        id: 'sock-1',
        handshake: { auth: {}, headers: {}, query: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
      };

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication token required',
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('từ chối kết nối nếu JWT token không hợp lệ hoặc đã hết hạn', async () => {
      const mockClient: any = {
        id: 'sock-2',
        handshake: { auth: { token: 'invalid.jwt.token' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
      };

      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt expired'));

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid or expired token',
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('xác thực thành công cho TENANT: tự động join user:{userId} và tenant:{tenantId}', async () => {
      const mockClient: any = {
        id: 'sock-3',
        handshake: { auth: { token: 'valid.token' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        data: {},
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'user-tenant-1',
        email: 'tenant1@test.com',
        organizationId: 'org-test',
        role: UserRole.TENANT,
        tenantId: 'tenant-1',
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.data.user).toBeDefined();
      expect(mockClient.join).toHaveBeenCalledWith('user:user-tenant-1');
      expect(mockClient.join).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockClient.join).not.toHaveBeenCalledWith('org:org-test:staff'); // Tenant không được join staff
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('xác thực thành công cho OWNER: tự động join user:{userId} và org:{orgId}:staff', async () => {
      const mockClient: any = {
        id: 'sock-4',
        handshake: { auth: { token: 'valid.owner.token' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        data: {},
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'user-owner-1',
        email: 'owner@test.com',
        organizationId: 'org-test',
        role: UserRole.OWNER,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user:user-owner-1');
      expect(mockClient.join).toHaveBeenCalledWith('org:org-test:staff');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Room Security: User KHÔNG join được room của người khác', () => {
    it('chặn client tự ý join room user của người khác qua join_user', async () => {
      const mockClient: any = {
        data: {
          user: {
            userId: 'user-tenant-1',
            organizationId: 'org-test',
          },
        },
        emit: jest.fn(),
        join: jest.fn(),
      };

      // Cố ý gửi userId của người khác
      const res = gateway.handleJoinUser(mockClient, { userId: 'victim-user-999' });

      expect(res.status).toBe('denied');
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied: Cannot join room of another user',
      });
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('chặn TENANT A join room ticket bảo trì maint:{id} của TENANT B', async () => {
      const mockClient: any = {
        data: {
          user: {
            userId: 'user-tenant-a',
            role: UserRole.TENANT,
            tenantId: 'tenant-a',
            organizationId: 'org-test',
          },
        },
        emit: jest.fn(),
        join: jest.fn(),
      };

      // Mock database lookup: ticket thuộc về tenant-b
      mockConnection.collection().findOne.mockResolvedValue({
        _id: 'ticket-b',
        tenantId: 'tenant-b', // Không phải tenant-a
        organizationId: 'org-test',
      });

      const res = await gateway.handleJoinMaintenance(mockClient, {
        requestId: 'ticket-b',
      });

      expect(res.status).toBe('denied');
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied: Cannot join ticket room of another tenant',
      });
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('cho phép TENANT A join room ticket bảo trì của chính mình', async () => {
      const mockClient: any = {
        data: {
          user: {
            userId: 'user-tenant-a',
            role: UserRole.TENANT,
            tenantId: 'tenant-a',
            organizationId: 'org-test',
          },
        },
        emit: jest.fn(),
        join: jest.fn(),
      };

      mockConnection.collection().findOne.mockResolvedValue({
        _id: 'ticket-a',
        tenantId: 'tenant-a', // Đúng của tenant-a
        organizationId: 'org-test',
      });

      const res = await gateway.handleJoinMaintenance(mockClient, {
        requestId: 'ticket-a',
      });

      expect(res.status).toBe('joined');
      expect(mockClient.join).toHaveBeenCalledWith('maint:ticket-a');
    });
  });
});
