import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';
import { Property, PropertyDocument } from '../schemas/property.schema';

@Injectable()
export class PropertyRepository extends TenantScopedRepository<PropertyDocument> {
  constructor(
    @InjectModel(Property.name)
    propertyModel: Model<PropertyDocument>,
  ) {
    super(propertyModel);
  }
}
