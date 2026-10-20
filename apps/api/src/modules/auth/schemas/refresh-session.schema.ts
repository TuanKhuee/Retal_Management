import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type RefreshSessionDocument = RefreshSession & Document;

@Schema({ timestamps: true, collection: 'refresh_sessions' })
export class RefreshSession {
  @Prop({ required: true, unique: true, index: true })
  tokenHash: string; // SHA-256 hash of refresh token

  @Prop({ required: true, index: true })
  familyId: string; // UUID grouping token rotation chains for reuse detection

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Organization', index: true })
  organizationId: string;

  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt?: Date | null;

  @Prop({ default: null })
  replacedBy?: string; // Token hash that replaced this token
}

export const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSession);

// TTL index to automatically purge expired refresh tokens from MongoDB
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshSessionSchema.index({ familyId: 1, revokedAt: 1 });
RefreshSessionSchema.index({ userId: 1, deviceId: 1 });
