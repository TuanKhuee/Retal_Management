import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { JobsModule } from '../../jobs/jobs.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [JobsModule, NotificationModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
