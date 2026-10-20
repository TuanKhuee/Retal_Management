import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DeviceTokenDocument = DeviceToken & Document;

@Schema({ timestamps: true, collection: 'device_tokens' })
export class DeviceToken {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', index: true })
  organizationId?: string;

  @Prop({ required: true, trim: true })
  fcmToken: string;

  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ required: true, enum: ['ios', 'android', 'web'] })
  platform: string;

  @Prop({ default: Date.now })
  lastActiveAt: Date;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);

DeviceTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
DeviceTokenSchema.index({ fcmToken: 1 });
