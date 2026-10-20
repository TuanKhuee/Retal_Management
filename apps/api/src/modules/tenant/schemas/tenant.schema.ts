import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({ _id: false })
export class IdCard {
  @Prop({ required: true })
  numberEnc: string; // AES-256-GCM encrypted

  @Prop({ required: true, index: true })
  numberLast4: string; // Plain last 4 digits

  @Prop()
  issueDate?: Date;

  @Prop()
  issuePlace?: string;
}

export const IdCardSchema = SchemaFactory.createForClass(IdCard);

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  relationship: string;
}

export const EmergencyContactSchema =
  SchemaFactory.createForClass(EmergencyContact);

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true, index: true })
  phone: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  permanentAddress?: string;

  @Prop({ type: IdCardSchema, required: false })
  idCard?: IdCard;

  @Prop({ type: EmergencyContactSchema })
  emergencyContact?: EmergencyContact;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  userId?: string | null;

  @Prop({ default: true })
  isActive: boolean;

  // Compatibility fields
  @Prop()
  encryptedCccd?: string;

  @Prop()
  cccdLast4?: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

TenantSchema.index({ organizationId: 1, phone: 1 });
TenantSchema.index({ organizationId: 1, 'idCard.numberLast4': 1 });
TenantSchema.index({ organizationId: 1, fullName: 'text' });
