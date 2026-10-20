import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';
import { Meter, MeterDocument } from '../schemas/meter.schema';
import { MeterStatus, MeterType } from '../../../common/constants';

@Injectable()
export class MeterRepository extends TenantScopedRepository<MeterDocument> {
  constructor(
    @InjectModel(Meter.name)
    meterModel: Model<MeterDocument>,
  ) {
    super(meterModel);
  }

  async findMetersByRoom(organizationId: string, roomId: string): Promise<MeterDocument[]> {
    return this.find(organizationId, { roomId });
  }

  async findActiveMeterByRoomAndType(
    organizationId: string,
    roomId: string,
    type: MeterType,
  ): Promise<MeterDocument | null> {
    return this.findOne(organizationId, { roomId, type, status: MeterStatus.ACTIVE });
  }
}
