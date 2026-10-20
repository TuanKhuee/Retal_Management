import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Meter, MeterSchema } from './schemas/meter.schema';
import { MeterReading, MeterReadingSchema } from './schemas/meter-reading.schema';
import { MeterRepository } from './repositories/meter.repository';
import { MeterReadingRepository } from './meter-reading.repository';
import { MeterReadingService } from './meter-reading.service';
import { MeterController } from './meter.controller';
import { MeterReadingController } from './meter-reading.controller';
import { PropertyModule } from '../property/property.module';
import { ServiceModule } from '../service/service.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Meter.name, schema: MeterSchema },
      { name: MeterReading.name, schema: MeterReadingSchema },
    ]),
    PropertyModule,
    ServiceModule,
  ],
  controllers: [MeterController, MeterReadingController],
  providers: [
    MeterRepository,
    MeterReadingRepository,
    MeterReadingService,
  ],
  exports: [
    MeterRepository,
    MeterReadingRepository,
    MeterReadingService,
  ],
})
export class MeterReadingModule {}
