import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceToken, DeviceTokenDocument } from '../schemas/device-token.schema';

@Injectable()
export class DeviceTokenRepository {
  constructor(
    @InjectModel(DeviceToken.name)
    private readonly model: Model<DeviceTokenDocument>,
  ) {}

  async upsertDeviceToken(
    userId: string,
    deviceId: string,
    fcmToken: string,
    platform: string,
    organizationId?: string,
  ): Promise<DeviceTokenDocument> {
    return this.model
      .findOneAndUpdate(
        { userId, deviceId },
        {
          $set: {
            fcmToken,
            platform,
            organizationId,
            lastActiveAt: new Date(),
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async removeDeviceToken(userId: string, deviceId: string): Promise<boolean> {
    const res = await this.model.deleteOne({ userId, deviceId }).exec();
    return res.deletedCount > 0;
  }

  async findByUserId(userId: string): Promise<DeviceTokenDocument[]> {
    return this.model.find({ userId }).exec();
  }

  async removeByFcmToken(fcmToken: string): Promise<boolean> {
    const res = await this.model.deleteMany({ fcmToken }).exec();
    return res.deletedCount > 0;
  }
}
