import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationType } from '../../../common/constants';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true,
  })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object, default: {} })
  data?: Record<string, any>;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ organizationId: 1, userId: 1, isRead: 1, _id: -1 });
NotificationSchema.index({ organizationId: 1, userId: 1, _id: -1 });
