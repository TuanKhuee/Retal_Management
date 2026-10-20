import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Service, ServiceSchema } from './schemas/service.schema';
import { ServiceRepository } from './repositories/service.repository';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Service.name, schema: ServiceSchema }]),
  ],
  controllers: [ServiceController],
  providers: [ServiceRepository, ServiceService],
  exports: [ServiceService, ServiceRepository],
})
export class ServiceModule {}
