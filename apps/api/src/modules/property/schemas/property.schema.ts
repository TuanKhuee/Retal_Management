import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PropertyDocument = Property & Document;

@Schema({ _id: false })
export class BankAccount {
  @Prop({ required: true, trim: true })
  bankCode: string;

  @Prop({ required: true, trim: true })
  accountNo: string;

  @Prop({ required: true, trim: true })
  accountName: string;
}

export const BankAccountSchema = SchemaFactory.createForClass(BankAccount);

@Schema({ _id: false })
export class BillingConfig {
  @Prop({ required: true, default: 3500 }) // Integer VND
  electricityUnitPrice: number;

  @Prop({ required: true, default: 25000 }) // Integer VND
  waterUnitPrice: number;

  @Prop({ default: 100000 }) // Integer VND
  internetUnitPrice: number;

  @Prop({ default: 50000 }) // Integer VND
  garbageUnitPrice: number;
}

export const BillingConfigSchema = SchemaFactory.createForClass(BillingConfig);

@Schema({ timestamps: true, collection: 'properties' })
export class Property {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ type: BankAccountSchema, required: false })
  bankAccount?: BankAccount;

  @Prop({ type: BillingConfigSchema, default: () => ({}) })
  billingConfig: BillingConfig;

  // Legacy field getters/proxies for billing calculator compatibility
  @Prop({ default: 3500 })
  electricityUnitPrice?: number;

  @Prop({ default: 25000 })
  waterUnitPrice?: number;

  @Prop({ default: 100000 })
  internetUnitPrice?: number;

  @Prop({ default: 50000 })
  garbageUnitPrice?: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.index({ organizationId: 1, name: 1 });
PropertySchema.index({ organizationId: 1, isActive: 1 });
