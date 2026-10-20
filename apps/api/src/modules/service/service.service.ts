import { Injectable, ConflictException } from '@nestjs/common';
import { ServiceRepository } from './repositories/service.repository';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
} from './dto/service.dto';
import { ResourceNotFoundException } from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

@Injectable()
export class ServiceService {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async createService(user: AuthenticatedUser, dto: CreateServiceDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.serviceRepo.findByCode(user.organizationId, code);
    if (existing) {
      throw new ConflictException(`Service with code "${code}" already exists in your organization`);
    }

    const effectiveDate = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    return this.serviceRepo.create(user.organizationId, {
      code,
      name: dto.name.trim(),
      type: dto.type || 'SERVICE',
      unit: dto.unit.trim(),
      calcMethod: dto.calcMethod,
      unitPrice: Math.round(dto.unitPrice),
      scope: {
        propertyIds: dto.scope?.propertyIds || [],
      },
      priceHistory: [
        {
          unitPrice: Math.round(dto.unitPrice),
          effectiveFrom: effectiveDate,
        },
      ],
      isActive: true,
    } as any);
  }

  async listServices(user: AuthenticatedUser, query: ServiceQueryDto) {
    const filter: any = {};

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.calcMethod) {
      filter.calcMethod = query.calcMethod;
    }
    if (query.propertyId) {
      filter.$or = [
        { 'scope.propertyIds': query.propertyId },
        { 'scope.propertyIds': { $size: 0 } },
      ];
    }
    if (query.q) {
      const qRegex = { $regex: query.q.trim(), $options: 'i' };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: [{ code: qRegex }, { name: qRegex }] }];
        delete filter.$or;
      } else {
        filter.$or = [{ code: qRegex }, { name: qRegex }];
      }
    }

    return this.serviceRepo.findPaginated(
      user.organizationId,
      filter,
      query.page,
      query.limit,
    );
  }

  async getServiceById(user: AuthenticatedUser, id: string) {
    const service = await this.serviceRepo.findById(user.organizationId, id);
    if (!service) {
      throw new ResourceNotFoundException('Service');
    }
    return service;
  }

  /**
   * Update service details or change price.
   * Quy tắc: Khi đổi giá -> push vào priceHistory { unitPrice, effectiveFrom }, KHÔNG ảnh hưởng hóa đơn đã phát hành.
   */
  async updateService(user: AuthenticatedUser, id: string, dto: UpdateServiceDto) {
    const service = await this.serviceRepo.findById(user.organizationId, id);
    if (!service) {
      throw new ResourceNotFoundException('Service');
    }

    const updateOps: any = { $set: {} };

    if (dto.name !== undefined) updateOps.$set.name = dto.name.trim();
    if (dto.type !== undefined) updateOps.$set.type = dto.type;
    if (dto.unit !== undefined) updateOps.$set.unit = dto.unit.trim();
    if (dto.calcMethod !== undefined) updateOps.$set.calcMethod = dto.calcMethod;
    if (dto.scope !== undefined) updateOps.$set.scope = { propertyIds: dto.scope.propertyIds || [] };
    if (dto.isActive !== undefined) updateOps.$set.isActive = dto.isActive;

    // Detect unitPrice change -> push to priceHistory
    if (dto.unitPrice !== undefined && dto.unitPrice !== service.unitPrice) {
      const newPrice = Math.round(dto.unitPrice);
      const effectiveDate = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

      updateOps.$set.unitPrice = newPrice;
      updateOps.$push = {
        priceHistory: {
          unitPrice: newPrice,
          effectiveFrom: effectiveDate,
        },
      };
    }

    const updated = await this.serviceRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      updateOps,
    );

    if (!updated) {
      throw new ResourceNotFoundException('Service');
    }

    return updated;
  }
}
