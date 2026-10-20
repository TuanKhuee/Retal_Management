import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageModule } from '../../infra/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [StorageController],
})
export class StorageApiModule {}
