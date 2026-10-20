import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  MeterReadingFlag,
  MeterReadingSource,
  MeterReadingStatus,
} from '../../../common/constants';

export type MeterReadingDocument = MeterReading & Document;

@Schema({ timestamps: true, collection: 'meter_readings' })
export class MeterReading {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Meter', index: true })
  meterId?: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Room', index: true })
  roomId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Property', index: true })
  propertyId?: string;

  @Prop({ required: true, index: true }) // Format: 'YYYY-MM', e.g. '2026-10'
  period: string;

  // Compatibility alias
  @Prop({ index: true })
  billingPeriod?: string;

  @Prop({ default: 0, min: 0 })
  previousValue: number;

  @Prop({ default: 0, min: 0 })
  currentValue: number;

  @Prop({ default: 0 })
  consumption: number;

  @Prop({ default: 0 })
  adjustment: number;

  @Prop({ trim: true })
  adjustmentReason?: string;

  @Prop({ default: 0, min: 0 })
  unitPrice: number;

  @Prop({ default: 0, min: 0 })
  amount: number;

  @Prop({
    type: [String],
    enum: MeterReadingFlag,
    default: [],
  })
  flags: MeterReadingFlag[];

  @Prop({
    required: true,
    enum: MeterReadingSource,
    default: MeterReadingSource.MANUAL,
  })
  source: MeterReadingSource;

  @Prop({ trim: true })
  photoAttachmentId?: string;

  @Prop({
    required: true,
    enum: MeterReadingStatus,
    default: MeterReadingStatus.DRAFT,
    index: true,
  })
  status: MeterReadingStatus;

  @Prop({ default: false })
  isLocked: boolean;

  @Prop({ default: Date.now })
  recordedAt: Date;

  @Prop({ required: true })
  recordedBy: string;

  // Compatibility fields for legacy tests/records
  @Prop({ min: 0 })
  electricityOld?: number;

  @Prop({ min: 0 })
  electricityNew?: number;

  @Prop({ min: 0 })
  waterOld?: number;

  @Prop({ min: 0 })
  waterNew?: number;
}

export const MeterReadingSchema = SchemaFactory.createForClass(MeterReading);

// Unique index: Mỗi công tơ chỉ có 1 bản ghi chốt số trong 1 kỳ
MeterReadingSchema.index(
  { organizationId: 1, meterId: 1, period: 1 },
  {
    unique: true,
    partialFilterExpression: { meterId: { $exists: true, $ne: null } },
  },
);

MeterReadingSchema.index({ organizationId: 1, roomId: 1, period: 1 });
