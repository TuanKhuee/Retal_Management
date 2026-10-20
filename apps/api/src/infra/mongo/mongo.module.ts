import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/rental_management',
        autoIndex: true,
        serverSelectionTimeoutMS: 5000,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class MongoInfraModule {}
