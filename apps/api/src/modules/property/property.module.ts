import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './schemas/property.schema';
import { Room, RoomSchema } from './schemas/room.schema';
import { PropertyRepository } from './repositories/property.repository';
import { RoomRepository } from './repositories/room.repository';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { RoomController } from './room.controller';
import { Invoice, InvoiceSchema } from '../invoice/schemas/invoice.schema';
import { Contract, ContractSchema } from '../contract/schemas/contract.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Room.name, schema: RoomSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
  ],
  controllers: [PropertyController, RoomController],
  providers: [PropertyRepository, RoomRepository, PropertyService],
  exports: [PropertyRepository, RoomRepository, PropertyService],
})
export class PropertyModule {}
