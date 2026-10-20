import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RefreshSession,
  RefreshSessionDocument,
} from '../schemas/refresh-session.schema';

@Injectable()
export class RefreshSessionRepository {
  constructor(
    @InjectModel(RefreshSession.name)
    private readonly model: Model<RefreshSessionDocument>,
  ) {}

  async create(data: Partial<RefreshSession>): Promise<RefreshSessionDocument> {
    return this.model.create(data);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshSessionDocument | null> {
    return this.model.findOne({ tokenHash }).exec();
  }

  async revokeSession(id: string, replacedBy?: string): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, {
        $set: {
          revokedAt: new Date(),
          replacedBy: replacedBy || null,
        },
      })
      .exec();
  }

  /**
   * REUSE DETECTION: If an already-revoked refresh token is replayed,
   * immediately revoke all active sessions belonging to the same familyId!
   */
  async revokeEntireFamily(familyId: string): Promise<number> {
    const res = await this.model
      .updateMany(
        { familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
    return res.modifiedCount;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const res = await this.model
      .updateMany(
        { userId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
    return res.modifiedCount;
  }
}
