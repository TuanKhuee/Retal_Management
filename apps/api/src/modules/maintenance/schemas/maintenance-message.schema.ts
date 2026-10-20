import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaintenanceMessageDocument = MaintenanceMessage & Document;

@Schema({ timestamps: true, collection: 'maintenance_messages' })
export class MaintenanceMessage {
  @Prop({ type: Types.ObjectId, ref: 'MaintenanceRequest', required: true, index: true })
  requestId: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  senderId: string;

  @Prop({ required: true })
  senderRole: string; // OWNER | TENANT | MANAGER | STAFF

  @Prop({ required: false })
  senderName?: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  attachmentIds: string[];
}

export const MaintenanceMessageSchema = SchemaFactory.createForClass(MaintenanceMessage);

MaintenanceMessageSchema.index({ organizationId: 1, requestId: 1, createdAt: -1 });
MaintenanceMessageSchema.index({ requestId: 1, _id: -1 });
