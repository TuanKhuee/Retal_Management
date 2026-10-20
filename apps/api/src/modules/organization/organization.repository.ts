import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';

@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
  ) {}

  async create(
    data: Partial<Organization>,
    session?: ClientSession,
  ): Promise<OrganizationDocument> {
    if (session) {
      const [created] = await this.orgModel.create([data], { session });
      return created;
    }
    return this.orgModel.create(data);
  }

  async findById(id: string): Promise<OrganizationDocument | null> {
    return this.orgModel.findById(id).exec();
  }

  async updateSettings(
    id: string,
    settings: Partial<Organization['settings']>,
  ): Promise<OrganizationDocument | null> {
    const updateObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(settings)) {
      if (v !== undefined) {
        updateObj[`settings.${k}`] = v;
      }
    }
    return this.orgModel
      .findByIdAndUpdate(id, { $set: updateObj }, { new: true })
      .exec();
  }
}
