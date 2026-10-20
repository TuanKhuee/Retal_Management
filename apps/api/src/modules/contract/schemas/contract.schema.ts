import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  ContractStatus,
  DepositStatus,
  DepositLedgerType,
} from '../../../common/constants';

export type ContractDocument = Contract & Document;

@Schema({ _id: false })
export class DepositLedgerEntry {
  @Prop({ required: true, enum: DepositLedgerType })
  type: DepositLedgerType;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: Date.now })
  date: Date;

  @Prop()
  reason?: string;

  @Prop()
  note?: string;
}

export const DepositLedgerEntrySchema =
  SchemaFactory.createForClass(DepositLedgerEntry);

@Schema({ _id: false })
export class Deposit {
  @Prop({ required: true, min: 0, default: 0 })
  amount: number;

  @Prop({
    required: true,
    enum: DepositStatus,
    default: DepositStatus.PENDING,
  })
  status: DepositStatus;

  @Prop({ type: [DepositLedgerEntrySchema], default: [] })
  ledger: DepositLedgerEntry[];
}

export const DepositSchema = SchemaFactory.createForClass(Deposit);

@Schema({ _id: false })
export class Occupant {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  idCard?: string;

  @Prop({ trim: true })
  relationship?: string;
}

export const OccupantSchema = SchemaFactory.createForClass(Occupant);

@Schema({ _id: false })
export class ServiceSubscription {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Service', required: true })
  serviceId: string;

  @Prop({ default: 1, min: 1 })
  quantity?: number;

  @Prop({ min: 0 })
  unitPriceOverride?: number;
}

export const ServiceSubscriptionSchema =
  SchemaFactory.createForClass(ServiceSubscription);

@Schema({ _id: false })
export class ContractRevision {
  @Prop({ required: true })
  version: number;

  @Prop({ default: Date.now })
  effectiveFrom: Date;

  @Prop({ required: true })
  reason: string;

  @Prop()
  rent?: number;

  @Prop()
  terms?: string;

  @Prop({ type: [ServiceSubscriptionSchema] })
  serviceSubscriptions?: ServiceSubscription[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  modifiedBy?: string;
}

export const ContractRevisionSchema =
  SchemaFactory.createForClass(ContractRevision);

@Schema({ timestamps: true, collection: 'contracts' })
export class Contract {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, trim: true })
  contractNo: string;

  // Compatibility alias
  @Prop({ trim: true })
  contractNumber?: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Property', index: true })
  propertyId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Room', index: true })
  roomId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  primaryTenantId: string;

  // Compatibility alias
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: string;

  @Prop({ type: [OccupantSchema], default: [] })
  occupants: Occupant[];

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: 5, min: 1, max: 31 })
  dueDay: number;

  // Compatibility alias
  @Prop({ default: 5 })
  billingCycleDay?: number;

  @Prop({ required: true, min: 0 })
  rent: number;

  // Compatibility alias
  @Prop()
  rentalPrice?: number;

  @Prop({ type: DepositSchema, default: () => ({ amount: 0, status: DepositStatus.PENDING, ledger: [] }) })
  deposit: Deposit;

  // Compatibility alias
  @Prop()
  depositAmount?: number;

  @Prop({ type: [ServiceSubscriptionSchema], default: [] })
  serviceSubscriptions: ServiceSubscription[];

  @Prop()
  terms?: string;

  @Prop({ type: [String], default: [] })
  attachmentIds: string[];

  @Prop({
    required: true,
    enum: ContractStatus,
    default: ContractStatus.PENDING,
    index: true,
  })
  status: ContractStatus;

  @Prop({ default: false, index: true })
  isCurrent: boolean;

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: [ContractRevisionSchema], default: [] })
  revisions: ContractRevision[];

  @Prop()
  terminationReason?: string;

  @Prop()
  terminatedAt?: Date;

  @Prop()
  notes?: string;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

// Unique Partial Index: Đảm bảo CHỈ DUY NHẤT 1 hợp đồng hiện hành (isCurrent: true) cho mỗi phòng trong tổ chức!
ContractSchema.index(
  { organizationId: 1, roomId: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true },
  },
);

ContractSchema.index({ organizationId: 1, primaryTenantId: 1 });
ContractSchema.index({ organizationId: 1, tenantId: 1 });
ContractSchema.index({ organizationId: 1, contractNo: 1 });
