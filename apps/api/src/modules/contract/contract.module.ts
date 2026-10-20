import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contract, ContractSchema } from './schemas/contract.schema';
import { ContractRepository } from './contract.repository';
import { ContractService } from './contract.service';
import { ContractController, MoveInController } from './contract.controller';
import { PropertyModule } from '../property/property.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';
import {
  MeterReading,
  MeterReadingSchema,
} from '../meter-reading/schemas/meter-reading.schema';
import { Invoice, InvoiceSchema } from '../invoice/schemas/invoice.schema';
import { Counter, CounterSchema } from '../auth/schemas/counter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: MeterReading.name, schema: MeterReadingSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    PropertyModule,
    TenantModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ContractController, MoveInController],
  providers: [ContractRepository, ContractService],
  exports: [ContractRepository, ContractService],
})
export class ContractModule {}
