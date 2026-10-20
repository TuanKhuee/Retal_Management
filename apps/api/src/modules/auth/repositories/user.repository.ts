import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findByIdentifier(identifier: string): Promise<UserDocument | null> {
    const clean = identifier.trim().toLowerCase();
    return this.userModel
      .findOne({
        $or: [{ email: clean }, { phone: identifier.trim() }],
      })
      .exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async create(data: Partial<User>, session?: ClientSession): Promise<UserDocument> {
    const payload = {
      ...data,
      email: data.email ? data.email.toLowerCase() : undefined,
    };
    if (session) {
      const [created] = await this.userModel.create([payload], { session });
      return created;
    }
    return this.userModel.create(payload);
  }

  async incrementFailedAttempts(id: string, lockUntilDate?: Date): Promise<UserDocument | null> {
    const update: any = { $inc: { failedLoginAttempts: 1 } };
    if (lockUntilDate) {
      update.$set = { lockUntil: lockUntilDate };
    }
    return this.userModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async resetFailedAttempts(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        $set: { failedLoginAttempts: 0, lockUntil: null },
      })
      .exec();
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        $set: {
          passwordHash,
          passwordResetTokenHash: null,
          passwordResetExpires: null,
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      })
      .exec();
  }

  async setResetToken(id: string, tokenHash: string, expires: Date): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpires: expires,
        },
      })
      .exec();
  }

  async findByResetToken(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: { $gt: new Date() },
      })
      .exec();
  }

  async setInviteToken(id: string, tokenHash: string, expires: Date): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        $set: {
          inviteTokenHash: tokenHash,
          inviteTokenExpires: expires,
        },
      })
      .exec();
  }

  async findByInviteToken(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        inviteTokenHash: tokenHash,
        inviteTokenExpires: { $gt: new Date() },
      })
      .exec();
  }

  async updateProfile(id: string, updateData: { fullName?: string; phone?: string }): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }
}
