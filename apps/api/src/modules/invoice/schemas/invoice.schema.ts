import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { InvoiceItemType, InvoiceStatus } from '../../../common/constants';

export type InvoiceDocument = Invoice & Document;

@Schema({ _id: false })
export class MeterReadingSnapshot {
  @Prop()
  oldReading: number;

  @Prop()
  newReading: number;
}

export const MeterReadingSnapshotSchema =
  SchemaFactory.createForClass(MeterReadingSnapshot);

@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ required: true, enum: InvoiceItemType })
  type: InvoiceItemType;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 }) // Integer VND
  unitPrice: number;

  @Prop({ required: true, min: 0 }) // Integer VND (quantity * unitPrice)
  amount: number;

  @Prop({ type: MeterReadingSnapshotSchema })
  meterReadingSnapshot?: MeterReadingSnapshot;
}

export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, trim: true })
  invoiceNumber: string;

  @Prop({ trim: true, index: true })
  invoiceNo?: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Contract', index: true })
  contractId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Property', index: true })
  propertyId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Room', index: true })
  roomId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId: string;

  @Prop({ required: true, index: true }) // e.g. "2026-10"
  billingPeriodId: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({
    required: true,
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
    index: true,
  })
  status: InvoiceStatus;

  @Prop({ default: true, index: true })
  active: boolean; // Set to false when CANCELLED or VOIDED

  @Prop()
  cancellationReason?: string;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: [InvoiceItemSchema], default: [] })
  items: InvoiceItem[];

  @Prop({ required: true, min: 0 }) // Integer VND
  subtotal: number;

  @Prop({ default: 0, min: 0 }) // Integer VND
  discount: number;

  @Prop({ required: true, min: 0 }) // Integer VND
  totalAmount: number;

  @Prop({ default: 0, min: 0 }) // Integer VND
  paidAmount: number;

  @Prop({ required: true, min: 0 }) // Integer VND (totalAmount - paidAmount)
  remainingAmount: number;

  @Prop({ default: 0 })
  version: number; // Optimistic concurrency control

  @Prop()
  notes?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Unique partial index: Only 1 active invoice per contract per billing period
InvoiceSchema.index(
  { contractId: 1, billingPeriodId: 1, active: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
  },
);

InvoiceSchema.index({ organizationId: 1, status: 1 });
InvoiceSchema.index({ organizationId: 1, tenantId: 1 });
InvoiceSchema.index({ organizationId: 1, invoiceNumber: 1 });
