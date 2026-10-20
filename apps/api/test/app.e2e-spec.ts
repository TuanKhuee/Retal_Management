import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { OrganizationService } from '../src/modules/organization/organization.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('App Endpoints & Standards (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      user: { id: 'u1', email: 'owner@example.com' },
    }),
    login: jest.fn().mockResolvedValue({
      accessToken: 'mock-login-token',
      refreshToken: 'mock-refresh',
      user: { id: 'u1', email: 'owner@example.com' },
    }),
    getMe: jest.fn().mockResolvedValue({
      id: 'u1',
      email: 'owner@example.com',
      role: 'OWNER',
    }),
  };

  const mockOrgService = {
    getOrganization: jest.fn().mockResolvedValue({ id: 'org-1' }),
    updateSettings: jest.fn().mockResolvedValue({ id: 'org-1' }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: OrganizationService,
          useValue: mockOrgService,
        },
      ],
    }).compile();

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
    if (app) {
      await app.close();
    }
  });

  it('Standard Success Response format: { data, meta? }', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'owner@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user.email).toBe('owner@example.com');
  });

  it('Standard Error Response format on validation failure: { error: { code, message, details, requestId } }', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        // identifier missing
        password: '123',
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('requestId');
    expect(res.headers).toHaveProperty('x-request-id');
  });

  it('Standard Error Response format on 404: { error: { code, message, requestId } }', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/non-existent-endpoint')
      .expect(404);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });
});
