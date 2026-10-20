import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BillingPeriodStatus } from '../../../common/constants';

export type BillingPeriodDocument = BillingPeriod & Document;

@Schema({ timestamps: true, collection: 'billing_periods' })
export class BillingPeriod {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Property', index: true })
  propertyId: string;

  @Prop({ required: true, index: true }) // 'YYYY-MM'
  period: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({
    required: true,
    enum: BillingPeriodStatus,
    default: BillingPeriodStatus.OPEN,
    index: true,
  })
  status: BillingPeriodStatus;

  @Prop()
  closedAt?: Date;

  @Prop()
  closedBy?: string;

  @Prop()
  notes?: string;
}

export const BillingPeriodSchema = SchemaFactory.createForClass(BillingPeriod);

// Unique index: Mỗi khu trọ chỉ có 1 kỳ tính phí cùng tên 'YYYY-MM' trong cùng tổ chức
BillingPeriodSchema.index(
  { organizationId: 1, propertyId: 1, period: 1 },
  { unique: true },
);
