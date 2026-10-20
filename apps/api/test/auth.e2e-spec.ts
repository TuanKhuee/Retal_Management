import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as request from 'supertest';
import {
  AuthController,
  MeController,
  OrgController,
} from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { OrganizationService } from '../src/modules/organization/organization.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { OwnershipGuard } from '../src/common/guards/ownership.guard';
import { UserRole } from '../src/common/constants';
import { ResourceNotFoundException } from '../src/common/exceptions';

describe('Auth & Multi-Tenant E2E Tests', () => {
  let app: INestApplication;

  let currentMockUser: any = {
    userId: 'owner-id-1',
    email: 'owner@example.com',
    organizationId: 'org-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      expiresIn: 900,
      user: {
        id: 'owner-id-1',
        email: 'owner@example.com',
        role: UserRole.OWNER,
        organizationId: 'org-1',
      },
    }),
    login: jest.fn().mockImplementation((dto) => {
      if (dto.password === 'WrongPassword!') {
        throw new UnauthorizedException('Invalid email/phone or password');
      }
      return Promise.resolve({
        accessToken: 'access-token-login',
        refreshToken: 'refresh-token-login',
        expiresIn: 900,
        user: { id: 'owner-id-1', email: dto.identifier, role: UserRole.OWNER },
      });
    }),
    refresh: jest.fn().mockImplementation((dto) => {
      if (dto.refreshToken === 'reused-token') {
        throw new UnauthorizedException(
          'Refresh token reuse detected. All sessions in this chain have been revoked.',
        );
      }
      return Promise.resolve({
        accessToken: 'new-access-token-rotated',
        refreshToken: 'new-refresh-token-rotated',
        expiresIn: 900,
      });
    }),
    getMe: jest.fn().mockResolvedValue({
      id: 'owner-id-1',
      email: 'owner@example.com',
      memberships: [{ organizationId: 'org-1', role: UserRole.OWNER }],
    }),
  };

  const mockOrgService = {
    getOrganization: jest.fn().mockImplementation((orgId) => {
      if (orgId !== 'org-1') {
        throw new ResourceNotFoundException('Organization');
      }
      return Promise.resolve({
        id: 'org-1',
        name: 'Nha Tro Binh An',
        settings: { roundingStep: 1000 },
      });
    }),
    updateSettings: jest.fn().mockResolvedValue({
      id: 'org-1',
      settings: { roundingStep: 1000, invoiceDueDays: 7 },
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, MeController, OrgController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: OrganizationService, useValue: mockOrgService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = currentMockUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Đăng ký & Đăng nhập', () => {
    it('POST /api/v1/auth/register (OWNER tạo user + org trong 1 transaction)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'owner@example.com',
          password: 'SecurePassword123!',
          fullName: 'Nguyen Van A',
          organizationName: 'Nha Tro Binh An',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.role).toBe(UserRole.OWNER);
    });

    it('POST /api/v1/auth/login (email/SĐT + argon2id)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'owner@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(res.body.data.accessToken).toBe('access-token-login');
    });
  });

  describe('2. Refresh Token Rotation & Reuse Detection', () => {
    it('POST /api/v1/auth/refresh (Rotation thành công cấp token mới)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(res.body.data.accessToken).toBe('new-access-token-rotated');
      expect(res.body.data.refreshToken).toBe('new-refresh-token-rotated');
    });

    it('POST /api/v1/auth/refresh (Reuse Detection: tái sử dụng token cũ -> 401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'reused-token' })
        .expect(401);

      expect(res.body.error.message).toContain('Refresh token reuse detected');
    });
  });

  describe('3. RBAC: TENANT gọi endpoint OWNER -> 403 Forbidden', () => {
    it('PATCH /api/v1/organization (TENANT gọi -> 403)', async () => {
      // Switch user to TENANT
      currentMockUser = {
        userId: 'tenant-user-1',
        email: 'tenant@example.com',
        organizationId: 'org-1',
        role: UserRole.TENANT,
        tenantId: 'tenant-123',
        permissions: [],
      };

      const res = await request(app.getHttpServer())
        .patch('/api/v1/organization')
        .send({ invoiceDueDays: 7 })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('not allowed to access this resource');
    });
  });

  describe('4. Multi-tenant: Truy cập chéo Organization -> 404 Not Found', () => {
    it('GET /api/v1/organization (Khác organizationId -> 404 Not Found, không phải 403)', async () => {
      // User belongs to org-DIFFERENT
      currentMockUser = {
        userId: 'user-other',
        email: 'other@example.com',
        organizationId: 'org-DIFFERENT',
        role: UserRole.OWNER,
        permissions: [],
      };

      const res = await request(app.getHttpServer())
        .get('/api/v1/organization')
        .expect(404);

      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(res.body.error.message).toBe('Organization not found');
    });
  });
});
