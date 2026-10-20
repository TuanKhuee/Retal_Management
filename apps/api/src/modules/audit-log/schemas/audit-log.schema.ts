import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, index: true })
  actorId: string;

  @Prop({ required: true })
  actorRole: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true, index: true })
  entityName: string;

  @Prop({ index: true })
  entityId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  beforeState?: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  afterState?: any;

  @Prop()
  ip: string;

  @Prop()
  userAgent: string;

  @Prop({ required: true, index: true })
  requestId: string;

  @Prop({ default: Date.now, index: true })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Index for efficient chronological audit queries per organization
AuditLogSchema.index({ organizationId: 1, timestamp: -1 });
