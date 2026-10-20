import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../common/repositories/tenant-scoped.repository';
import { MeterReading, MeterReadingDocument } from './schemas/meter-reading.schema';

@Injectable()
export class MeterReadingRepository extends TenantScopedRepository<MeterReadingDocument> {
  constructor(
    @InjectModel(MeterReading.name)
    meterReadingModel: Model<MeterReadingDocument>,
  ) {
    super(meterReadingModel);
  }

  async findByMeterAndPeriod(
    organizationId: string,
    meterId: string,
    period: string,
  ): Promise<MeterReadingDocument | null> {
    return this.findOne(organizationId, {
      meterId,
      $or: [{ period }, { billingPeriod: period }],
    });
  }

  async findByRoomAndPeriod(
    organizationId: string,
    roomId: string,
    period: string,
  ): Promise<MeterReadingDocument | null> {
    return this.findOne(organizationId, {
      roomId,
      $or: [{ period }, { billingPeriod: period }],
    });
  }

  async findHistoricalReadings(
    organizationId: string,
    meterId: string,
    currentPeriod: string,
    limit: number = 3,
  ): Promise<MeterReadingDocument[]> {
    return this.model
      .find(
        this.scopedFilter(organizationId, {
          meterId,
          period: { $lt: currentPeriod },
        }),
      )
      .sort({ period: -1 })
      .limit(limit)
      .exec();
  }

  async findLatestReading(
    organizationId: string,
    meterId: string,
    beforePeriod?: string,
  ): Promise<MeterReadingDocument | null> {
    const filter: any = { meterId };
    if (beforePeriod) {
      filter.period = { $lt: beforePeriod };
    }
    return this.model
      .findOne(this.scopedFilter(organizationId, filter))
      .sort({ period: -1 })
      .exec();
  }
}
