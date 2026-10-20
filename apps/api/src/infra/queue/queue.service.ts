import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private invoiceQueue: Queue | null = null;
  private notificationQueue: Queue | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.config.get<number>('REDIS_PORT', 6379));
    const password = this.config.get<string>('REDIS_PASSWORD');

    const connection = {
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    };

    try {
      this.invoiceQueue = new Queue('invoice-generation', { connection });
      this.invoiceQueue.on('error', () => {});
      this.notificationQueue = new Queue('notification-dispatch', { connection });
      this.notificationQueue.on('error', () => {});
      this.logger.log('BullMQ queues initialized');
    } catch (err: any) {
      this.logger.warn(`BullMQ init degraded: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.invoiceQueue) await this.invoiceQueue.close();
    if (this.notificationQueue) await this.notificationQueue.close();
  }

  async addInvoiceJob(data: any): Promise<void> {
    if (this.invoiceQueue) {
      try {
        await this.invoiceQueue.add('generate-invoice', data, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to push invoice job: ${err.message}`);
      }
    }
  }

  async addNotificationJob(data: any): Promise<void> {
    if (this.notificationQueue) {
      try {
        await this.notificationQueue.add('dispatch-notification', data, {
          attempts: 3,
        });
      } catch (err: any) {
        this.logger.warn(`Failed to push notification job: ${err.message}`);
      }
    }
  }
}
