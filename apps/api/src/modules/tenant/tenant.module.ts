import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantRepository } from './tenant.repository';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { Contract, ContractSchema } from '../contract/schemas/contract.schema';
import { Invoice, InvoiceSchema } from '../invoice/schemas/invoice.schema';
import { Room, RoomSchema } from '../property/schemas/room.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [TenantController],
  providers: [TenantRepository, TenantService],
  exports: [TenantRepository, TenantService],
})
export class TenantModule {}
