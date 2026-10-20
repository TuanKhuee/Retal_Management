import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationService } from './notification.service';

@Processor('notification-dispatch')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing BullMQ notification job #${job.id}: ${job.data?.type}`);
    return this.notificationService.processNotificationDirectly(job.data);
  }
}
