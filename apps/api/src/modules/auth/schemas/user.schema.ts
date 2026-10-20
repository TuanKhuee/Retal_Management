import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ unique: true, sparse: true, lowercase: true, trim: true, index: true })
  email?: string;

  @Prop({ unique: true, sparse: true, trim: true, index: true })
  phone?: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true })
  passwordHash: string; // argon2id hash

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockUntil?: Date | null;

  @Prop()
  passwordResetTokenHash?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop()
  inviteTokenHash?: string;

  @Prop()
  inviteTokenExpires?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
