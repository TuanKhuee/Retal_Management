import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { MeterStatus, MeterType } from '../../../common/constants';

export type MeterDocument = Meter & Document;

@Schema({ timestamps: true, collection: 'meters' })
export class Meter {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Room', index: true })
  roomId: string;

  @Prop({
    required: true,
    enum: MeterType,
    index: true,
  })
  type: MeterType;

  @Prop({ required: true, trim: true })
  serialNo: string;

  @Prop({ required: true, default: 1, min: 0.01 })
  multiplier: number;

  @Prop({ required: true, default: 0, min: 0 })
  initialValue: number;

  @Prop({
    required: true,
    enum: MeterStatus,
    default: MeterStatus.ACTIVE,
  })
  status: MeterStatus;

  @Prop({ default: Date.now })
  installedAt: Date;

  @Prop()
  replacedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Meter' })
  replacedByMeterId?: string;
}

export const MeterSchema = SchemaFactory.createForClass(Meter);

MeterSchema.index({ organizationId: 1, roomId: 1, type: 1 });
MeterSchema.index({ organizationId: 1, serialNo: 1 });
