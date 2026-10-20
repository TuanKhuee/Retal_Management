import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from './organization.repository';
import { ResourceNotFoundException } from '../../common/exceptions';
import { UpdateOrganizationSettingsDto } from './dto/update-settings.dto';
import { OrganizationDocument } from './schemas/organization.schema';

@Injectable()
export class OrganizationService {
  constructor(private readonly orgRepo: OrganizationRepository) {}

  async getOrganization(id: string): Promise<OrganizationDocument> {
    const org = await this.orgRepo.findById(id);
    if (!org) {
      throw new ResourceNotFoundException('Organization');
    }
    return org;
  }

  async updateSettings(
    id: string,
    dto: UpdateOrganizationSettingsDto,
  ): Promise<OrganizationDocument> {
    const updated = await this.orgRepo.updateSettings(id, dto);
    if (!updated) {
      throw new ResourceNotFoundException('Organization');
    }
    return updated;
  }
}
