import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { AuthModule } from '../auth/auth.module';
import { ContractModule } from '../contract/contract.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    AuthModule,
    ContractModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationRepository,
    NotificationService,
    NotificationProcessor,
  ],
  exports: [NotificationRepository, NotificationService],
})
export class NotificationModule {}
