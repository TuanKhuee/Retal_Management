import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  MaintenancePriority,
  MaintenanceStatus,
} from '../../../common/constants';

export type MaintenanceRequestDocument = MaintenanceRequest & Document;

export interface MaintenanceCost {
  amount: number;
  paidBy: string; // LANDLORD | TENANT | SHARED
}

export interface StatusHistoryEntry {
  from: string;
  to: string;
  note?: string;
  changedBy: string;
  changedAt: Date;
  cost?: MaintenanceCost;
}

@Schema({ timestamps: true, collection: 'maintenance_requests' })
export class MaintenanceRequest {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ required: true, unique: true, index: true })
  requestNo: string;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  propertyId: string;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true, index: true })
  roomId: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: string;

  @Prop({ required: true, index: true })
  category: string; // e.g. PLUMBING, ELECTRICAL, APPLIANCE, FURNITURE, OTHER

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(MaintenancePriority),
    default: MaintenancePriority.NORMAL,
    index: true,
  })
  priority: MaintenancePriority;

  @Prop({
    type: String,
    enum: Object.values(MaintenanceStatus),
    default: MaintenanceStatus.NEW,
    index: true,
  })
  status: MaintenanceStatus;

  @Prop({
    type: {
      amount: { type: Number, default: 0 },
      paidBy: { type: String, default: 'LANDLORD' },
    },
    default: undefined,
  })
  cost?: MaintenanceCost;

  @Prop({
    type: [
      {
        from: { type: String, required: true },
        to: { type: String, required: true },
        note: { type: String, required: false },
        changedBy: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        cost: { type: Object, required: false },
      },
    ],
    default: [],
  })
  statusHistory: StatusHistoryEntry[];

  @Prop({ type: [String], default: [] })
  attachmentIds: string[];

  @Prop({ type: Boolean, default: false })
  unreadByOwner: boolean;

  @Prop({ type: Boolean, default: false })
  unreadByTenant: boolean;
}

export const MaintenanceRequestSchema = SchemaFactory.createForClass(MaintenanceRequest);

MaintenanceRequestSchema.index({ organizationId: 1, roomId: 1, status: 1 });
MaintenanceRequestSchema.index({ organizationId: 1, tenantId: 1, status: 1 });
MaintenanceRequestSchema.index({ organizationId: 1, createdAt: -1 });
