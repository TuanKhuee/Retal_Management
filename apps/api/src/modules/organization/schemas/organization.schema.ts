import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ _id: false })
export class OrganizationSettings {
  @Prop({ default: 5 })
  invoiceDueDays: number; // Days after issuing before invoice becomes OVERDUE

  @Prop({ default: 30 })
  billingClosingDay: number; // Closing cycle day of month (e.g. 30 or 25)

  @Prop({ default: 1000 })
  roundingStep: number; // VND rounding step, e.g., 1000 VND

  @Prop({ default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  @Prop({ default: 'VND' })
  currency: string;

  @Prop({ default: 0 })
  lateFeePercentage: number;
}

export const OrganizationSettingsSchema =
  SchemaFactory.createForClass(OrganizationSettings);

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop({ type: OrganizationSettingsSchema, default: () => ({}) })
  settings: OrganizationSettings;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
