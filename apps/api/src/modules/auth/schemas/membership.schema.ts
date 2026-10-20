import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Permission, UserRole } from '../../../common/constants';

export type MembershipDocument = Membership & Document;

@Schema({ timestamps: true, collection: 'memberships' })
export class Membership {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Organization', index: true })
  organizationId: string;

  @Prop({ required: true, enum: UserRole, index: true })
  role: UserRole;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: string;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Property', default: [] })
  propertyIds: string[];

  @Prop({ type: [String], enum: Permission, default: [] })
  permissions: Permission[];
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
