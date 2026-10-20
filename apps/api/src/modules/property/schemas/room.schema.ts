import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { RoomStatus } from '../../../common/constants';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true, collection: 'rooms' })
export class Room {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Property', index: true })
  propertyId: string;

  @Prop({ required: true, trim: true })
  code: string; // Room code e.g. '101', 'A101'

  @Prop({ default: 1 })
  floor: number;

  @Prop({ default: 20 })
  area: number; // in m2

  @Prop({ required: true }) // Integer VND
  baseRent: number;

  @Prop({
    required: true,
    enum: RoomStatus,
    default: RoomStatus.VACANT,
    index: true,
  })
  status: RoomStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Contract', default: null })
  currentContractId?: string | null;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null; // Soft delete

  // Compatibility aliases
  @Prop()
  roomNumber?: string;

  @Prop()
  basePrice?: number;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

// Unique partial index: room code must be unique per property within an organization for non-deleted rooms
RoomSchema.index(
  { organizationId: 1, propertyId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

RoomSchema.index({ organizationId: 1, propertyId: 1, status: 1 });
RoomSchema.index({ organizationId: 1, deletedAt: 1 });
