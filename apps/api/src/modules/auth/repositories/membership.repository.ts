import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Membership, MembershipDocument } from '../schemas/membership.schema';

@Injectable()
export class MembershipRepository {
  constructor(
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,
  ) {}

  async findByUserAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<MembershipDocument | null> {
    return this.membershipModel
      .findOne({ userId, organizationId })
      .populate('organizationId')
      .exec();
  }

  async findFirstByUserId(userId: string): Promise<MembershipDocument | null> {
    return this.membershipModel
      .findOne({ userId })
      .populate('organizationId')
      .exec();
  }

  async findByUserId(userId: string): Promise<MembershipDocument[]> {
    return this.membershipModel
      .find({ userId })
      .populate('organizationId')
      .exec();
  }

  async create(
    data: Partial<Membership>,
    session?: ClientSession,
  ): Promise<MembershipDocument> {
    if (session) {
      const [created] = await this.membershipModel.create([data], { session });
      return created;
    }
    return this.membershipModel.create(data);
  }
}
