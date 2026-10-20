import { Connection } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UserRepository } from './repositories/user.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { RefreshSessionRepository } from './repositories/refresh-session.repository';
import { DeviceTokenRepository } from './repositories/device-token.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { UserRole } from '../../common/constants';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

describe('AuthService (Unit & Security Rules)', () => {
  let service: AuthService;
  let connection: jest.Mocked<Partial<Connection>>;
  let userRepo: jest.Mocked<Partial<UserRepository>>;
  let membershipRepo: jest.Mocked<Partial<MembershipRepository>>;
  let sessionRepo: jest.Mocked<Partial<RefreshSessionRepository>>;
  let deviceRepo: jest.Mocked<Partial<DeviceTokenRepository>>;
  let orgRepo: jest.Mocked<Partial<OrganizationRepository>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let config: jest.Mocked<Partial<ConfigService>>;

  beforeEach(() => {
    connection = {
      startSession: jest.fn().mockRejectedValue(new Error('Standalone mongo mode')),
    };

    userRepo = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findByIdentifier: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      resetFailedAttempts: jest.fn(),
      updatePassword: jest.fn(),
      setResetToken: jest.fn(),
      findByResetToken: jest.fn(),
      setInviteToken: jest.fn(),
      findByInviteToken: jest.fn(),
      updateProfile: jest.fn(),
    };

    membershipRepo = {
      create: jest.fn(),
      findByUserAndOrg: jest.fn(),
      findFirstByUserId: jest.fn(),
      findByUserId: jest.fn(),
    };

    sessionRepo = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revokeSession: jest.fn(),
      revokeEntireFamily: jest.fn(),
      revokeAllForUser: jest.fn(),
    };

    deviceRepo = {
      upsertDeviceToken: jest.fn(),
      removeDeviceToken: jest.fn(),
    };

    orgRepo = {
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    config = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
        return defaultValue || 'secret';
      }),
    };

    service = new AuthService(
      connection as unknown as Connection,
      userRepo as unknown as UserRepository,
      membershipRepo as unknown as MembershipRepository,
      sessionRepo as unknown as RefreshSessionRepository,
      deviceRepo as unknown as DeviceTokenRepository,
      orgRepo as unknown as OrganizationRepository,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  describe('Registration in 1 Transaction (OWNER)', () => {
    it('should create user, organization, and membership in transaction', async () => {
      (userRepo.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepo.create as jest.Mock).mockResolvedValue({
        _id: 'user-1',
        email: 'owner@example.com',
        fullName: 'Nguyen Van A',
      });
      (orgRepo.create as jest.Mock).mockResolvedValue({
        _id: 'org-1',
        name: 'Nha Tro Binh An',
      });
      (membershipRepo.create as jest.Mock).mockResolvedValue({
        _id: 'mem-1',
        role: UserRole.OWNER,
      });

      const res = await service.register({
        email: 'owner@example.com',
        password: 'Password123!',
        fullName: 'Nguyen Van A',
        organizationName: 'Nha Tro Binh An',
      });

      expect(userRepo.create).toHaveBeenCalled();
      expect(orgRepo.create).toHaveBeenCalled();
      expect(membershipRepo.create).toHaveBeenCalled();
      expect(sessionRepo.create).toHaveBeenCalled();
      expect(res.accessToken).toBe('mock-jwt-token');
      expect(res.refreshToken).toBe('mock-jwt-token');
      expect(res.user.role).toBe(UserRole.OWNER);
    });

    it('should throw ConflictException if email exists', async () => {
      (userRepo.findByEmail as jest.Mock).mockResolvedValue({ _id: 'u1' });

      await expect(
        service.register({
          email: 'owner@example.com',
          password: 'Password123!',
          fullName: 'Nguyen Van A',
          organizationName: 'Nha Tro Binh An',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Login & 5-Attempt Lockout (Argon2id)', () => {
    it('should successfully log in with correct argon2id password', async () => {
      const passwordHash = await argon2.hash('CorrectPassword123!', {
        type: argon2.argon2id,
      });

      const mockUser = {
        _id: 'user-1',
        email: 'owner@example.com',
        passwordHash,
        failedLoginAttempts: 0,
        lockUntil: null,
      };

      (userRepo.findByIdentifier as jest.Mock).mockResolvedValue(mockUser);
      (membershipRepo.findFirstByUserId as jest.Mock).mockResolvedValue({
        organizationId: 'org-1',
        role: UserRole.OWNER,
      });

      const res = await service.login({
        identifier: 'owner@example.com',
        password: 'CorrectPassword123!',
      });

      expect(res.accessToken).toBeDefined();
      expect(userRepo.resetFailedAttempts).toHaveBeenCalledWith('user-1');
    });

    it('should increment failed attempts and lock account after 5 failed attempts', async () => {
      const passwordHash = await argon2.hash('CorrectPassword123!', {
        type: argon2.argon2id,
      });

      const mockUser = {
        _id: 'user-1',
        email: 'owner@example.com',
        passwordHash,
        failedLoginAttempts: 4, // 4th attempt now -> next will be 5th
        lockUntil: null,
      };

      (userRepo.findByIdentifier as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login({
          identifier: 'owner@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      // Verify incremented with lockUntil set
      expect(userRepo.incrementFailedAttempts).toHaveBeenCalledWith(
        'user-1',
        expect.any(Date),
      );
    });

    it('should reject login if account is currently locked', async () => {
      const mockUser = {
        _id: 'user-1',
        email: 'owner@example.com',
        failedLoginAttempts: 5,
        lockUntil: new Date(Date.now() + 10 * 60 * 1000), // Locked for 10 more minutes
      };

      (userRepo.findByIdentifier as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login({
          identifier: 'owner@example.com',
          password: 'AnyPassword!',
        }),
      ).rejects.toThrow(/temporarily locked/);
    });
  });

  describe('Refresh Token Rotation & REUSE DETECTION', () => {
    it('should successfully rotate token when valid refresh token is submitted', async () => {
      const mockSession = {
        _id: 'session-1',
        familyId: 'family-uuid-1',
        userId: 'user-1',
        organizationId: 'org-1',
        deviceId: 'dev-1',
        revokedAt: null,
        replacedBy: null,
      };

      (sessionRepo.findByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'user-1',
        email: 'owner@example.com',
        familyId: 'family-uuid-1',
      });
      (membershipRepo.findByUserAndOrg as jest.Mock).mockResolvedValue({
        organizationId: 'org-1',
        role: UserRole.OWNER,
      });

      const res = await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      // Should mark old session as revoked and set replacedBy
      expect(sessionRepo.revokeSession).toHaveBeenCalledWith(
        'session-1',
        expect.any(String),
      );
    });

    it('REUSE DETECTION: should revoke entire familyId if an already-revoked token is used', async () => {
      const revokedSession = {
        _id: 'session-old',
        familyId: 'compromised-family-123',
        userId: 'user-1',
        organizationId: 'org-1',
        revokedAt: new Date(Date.now() - 5000), // Already revoked!
        replacedBy: 'hash-of-replacement',
      };

      (sessionRepo.findByTokenHash as jest.Mock).mockResolvedValue(revokedSession);

      await expect(
        service.refresh({ refreshToken: 'stolen-or-replayed-token' }),
      ).rejects.toThrow(/Refresh token reuse detected/);

      // Verify that the ENTIRE family was immediately revoked
      expect(sessionRepo.revokeEntireFamily).toHaveBeenCalledWith(
        'compromised-family-123',
      );
    });
  });
});
