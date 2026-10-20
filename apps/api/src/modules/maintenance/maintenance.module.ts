import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MaintenanceRequest,
  MaintenanceRequestSchema,
} from './schemas/maintenance-request.schema';
import {
  MaintenanceMessage,
  MaintenanceMessageSchema,
} from './schemas/maintenance-message.schema';
import { MaintenanceRequestRepository } from './maintenance-request.repository';
import { MaintenanceMessageRepository } from './maintenance-message.repository';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { ContractModule } from '../contract/contract.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaintenanceRequest.name, schema: MaintenanceRequestSchema },
      { name: MaintenanceMessage.name, schema: MaintenanceMessageSchema },
    ]),
    ContractModule,
    AuthModule,
  ],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceRequestRepository,
    MaintenanceMessageRepository,
    MaintenanceService,
  ],
  exports: [
    MaintenanceRequestRepository,
    MaintenanceMessageRepository,
    MaintenanceService,
  ],
})
export class MaintenanceModule {}
