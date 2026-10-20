import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizeLogInterceptor } from './common/interceptors/sanitize-log.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AuditLogService } from './modules/audit-log/audit-log.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const auditLogService = app.get(AuditLogService);

  // Security: Helmet HTTP Headers
  app.use(helmet());

  // Security: CORS Configuration
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Request-Id',
      'X-Org-Id',
      'X-Organization-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
  });

  // Global API Prefix: /api/v1 (Exclude /health from prefix if accessed at root)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready'],
  });

  // Global Validation Pipe (Rule 10)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter (Rule 9)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Interceptors
  const auditInterceptor = new AuditLogInterceptor(reflector);
  auditInterceptor.setAuditLogService(auditLogService);

  app.useGlobalInterceptors(
    new SanitizeLogInterceptor(),
    new TransformInterceptor(),
    auditInterceptor,
  );

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rental Management Platform API')
    .setDescription(
      'Multi-tenant Rental Management Platform Backend with RBAC, Argon2id Auth, Billing Calculator, Transactions & Idempotency',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'Idempotency-Key', in: 'header' }, 'Idempotency-Key')
    .addApiKey({ type: 'apiKey', name: 'X-Org-Id', in: 'header' }, 'X-Org-Id')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
}

bootstrap();
