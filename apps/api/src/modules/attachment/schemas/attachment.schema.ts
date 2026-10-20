import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AttachmentStatus } from '../../../common/constants';

export type AttachmentDocument = Attachment & Document;

@Schema({ timestamps: true, collection: 'attachments' })
export class Attachment {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uploaderId: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  extension: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, unique: true })
  fileKey: string;

  @Prop({
    type: String,
    enum: Object.values(AttachmentStatus),
    default: AttachmentStatus.PENDING,
    index: true,
  })
  status: AttachmentStatus;

  @Prop({ required: false, index: true })
  entityType?: string; // MAINTENANCE_REQUEST | INVOICE | PAYMENT | CONTRACT | METER_READING

  @Prop({ required: false, index: true })
  entityId?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

AttachmentSchema.index({ organizationId: 1, entityType: 1, entityId: 1 });
