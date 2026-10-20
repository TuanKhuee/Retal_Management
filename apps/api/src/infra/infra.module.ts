import { Module } from '@nestjs/common';
import { MongoInfraModule } from './mongo/mongo.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { FcmModule } from './fcm/fcm.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    MongoInfraModule,
    RedisModule,
    QueueModule,
    StorageModule,
    FcmModule,
    SocketModule,
  ],
  exports: [
    MongoInfraModule,
    RedisModule,
    QueueModule,
    StorageModule,
    FcmModule,
    SocketModule,
  ],
})
export class InfraModule {}
