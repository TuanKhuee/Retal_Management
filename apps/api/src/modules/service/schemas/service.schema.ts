import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ServiceCalcMethod, ServiceType } from '../../../common/constants';

export type ServiceDocument = Service & Document;

@Schema({ _id: false })
export class PriceHistoryEntry {
  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ default: Date.now })
  effectiveFrom: Date;
}

export const PriceHistoryEntrySchema = SchemaFactory.createForClass(PriceHistoryEntry);

@Schema({ _id: false })
export class ServiceScope {
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Property' }], default: [] })
  propertyIds: string[];
}

export const ServiceScopeSchema = SchemaFactory.createForClass(ServiceScope);

@Schema({ timestamps: true, collection: 'services' })
export class Service {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, default: ServiceType.SERVICE })
  type: string;

  @Prop({ required: true, trim: true })
  unit: string;

  @Prop({
    required: true,
    enum: ServiceCalcMethod,
    default: ServiceCalcMethod.FIXED,
  })
  calcMethod: ServiceCalcMethod;

  @Prop({ required: true, min: 0, default: 0 })
  unitPrice: number;

  @Prop({ type: ServiceScopeSchema, default: () => ({ propertyIds: [] }) })
  scope: ServiceScope;

  @Prop({ type: [PriceHistoryEntrySchema], default: [] })
  priceHistory: PriceHistoryEntry[];

  @Prop({ default: true })
  isActive: boolean;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Unique index: Mỗi mã dịch vụ là duy nhất trong cùng 1 tổ chức
ServiceSchema.index({ organizationId: 1, code: 1 }, { unique: true });
ServiceSchema.index({ organizationId: 1, 'scope.propertyIds': 1 });
