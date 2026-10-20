import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

// Controllers
import { AuthController, MeController, OrgController } from '../modules/auth/auth.controller';
import { OrganizationController } from '../modules/organization/organization.controller';
import { PropertyController } from '../modules/property/property.controller';
import { RoomController } from '../modules/property/room.controller';
import { TenantController } from '../modules/tenant/tenant.controller';
import { ServiceController } from '../modules/service/service.controller';
import { ContractController, MoveInController } from '../modules/contract/contract.controller';
import { MeterController } from '../modules/meter-reading/meter.controller';
import { MeterReadingController } from '../modules/meter-reading/meter-reading.controller';
import { BillingPeriodController } from '../modules/billing-period/billing-period.controller';
import { InvoiceController } from '../modules/invoice/invoice.controller';
import { DebtController } from '../modules/invoice/debt.controller';
import { PaymentController, PaymentClaimController } from '../modules/payment/payment.controller';
import { MaintenanceController } from '../modules/maintenance/maintenance.controller';
import { AttachmentController } from '../modules/attachment/attachment.controller';
import { NotificationController } from '../modules/notification/notification.controller';
import { ReportController } from '../modules/report/report.controller';
import { AuditLogController } from '../modules/audit-log/audit-log.controller';
import { HealthController } from '../infra/health/health.controller';

async function generateOpenApi() {
  console.log('Building NestJS testing module with all controllers...');

  const moduleRef = await Test.createTestingModule({
    controllers: [
      AuthController,
      MeController,
      OrgController,
      OrganizationController,
      PropertyController,
      RoomController,
      TenantController,
      ServiceController,
      ContractController,
      MoveInController,
      MeterController,
      MeterReadingController,
      BillingPeriodController,
      InvoiceController,
      DebtController,
      PaymentController,
      PaymentClaimController,
      MaintenanceController,
      AttachmentController,
      NotificationController,
      ReportController,
      AuditLogController,
      HealthController,
    ],
  })
    .useMocker(() => ({}))
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready'],
  });

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

  const rootOutputPath = path.resolve(__dirname, '../../../openapi.json');
  fs.writeFileSync(rootOutputPath, JSON.stringify(document, null, 2), 'utf-8');
  console.log(`OpenAPI schema successfully written to: ${rootOutputPath}`);

  const backendOutputPath = path.resolve(__dirname, '../../openapi.json');
  fs.writeFileSync(backendOutputPath, JSON.stringify(document, null, 2), 'utf-8');
  console.log(`OpenAPI schema successfully written to: ${backendOutputPath}`);

  await app.close();
  console.log('OpenAPI generation finished successfully!');
  process.exit(0);
}

generateOpenApi().catch((err) => {
  console.error('Failed to generate OpenAPI schema:', err);
  process.exit(1);
});
