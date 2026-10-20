import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../../../common/constants';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Invoice', index: true })
  invoiceId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Contract', index: true })
  contractId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId: string;

  @Prop({ required: true, min: 1 }) // Integer VND
  amount: number;

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop({ index: true })
  idempotencyKey?: string;

  @Prop({ index: true, trim: true })
  transactionReference?: string;

  @Prop({ default: Date.now })
  paymentDate: Date;

  @Prop({
    required: true,
    enum: PaymentStatus,
    default: PaymentStatus.CONFIRMED,
    index: true,
  })
  status: PaymentStatus;

  @Prop()
  proofAttachmentId?: string;

  @Prop()
  confirmedBy?: string;

  @Prop()
  confirmedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  voidReason?: string;

  @Prop()
  voidedAt?: Date;

  @Prop({ default: true, index: true })
  active: boolean;

  @Prop()
  notes?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Unique partial index for IdempotencyKey per organization
PaymentSchema.index(
  { organizationId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true, idempotencyKey: { $exists: true, $ne: null } },
  },
);

// Unique partial index for (method, reference) per organization
PaymentSchema.index(
  { organizationId: 1, paymentMethod: 1, transactionReference: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true, transactionReference: { $exists: true, $ne: null } },
  },
);

PaymentSchema.index({ organizationId: 1, invoiceId: 1 });
PaymentSchema.index({ organizationId: 1, tenantId: 1 });
PaymentSchema.index({ organizationId: 1, status: 1 });
