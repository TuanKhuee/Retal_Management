import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';
import { Room, RoomDocument } from '../schemas/room.schema';

@Injectable()
export class RoomRepository extends TenantScopedRepository<RoomDocument> {
  constructor(
    @InjectModel(Room.name)
    roomModel: Model<RoomDocument>,
  ) {
    super(roomModel);
  }

  async findByPropertyAndCode(
    organizationId: string,
    propertyId: string,
    code: string,
  ): Promise<RoomDocument | null> {
    return this.findOne(organizationId, {
      propertyId,
      code,
      deletedAt: null,
    });
  }

  // Compatibility alias
  async findByPropertyAndNumber(
    organizationId: string,
    propertyId: string,
    roomNumber: string,
  ): Promise<RoomDocument | null> {
    return this.findOne(organizationId, {
      propertyId,
      $or: [{ code: roomNumber }, { roomNumber }],
      deletedAt: null,
    });
  }

  async findRoomsByProperty(
    organizationId: string,
    propertyId: string,
  ): Promise<RoomDocument[]> {
    return this.find(organizationId, { propertyId, deletedAt: null });
  }

  async countByStatus(
    organizationId: string,
    propertyId: string,
    status?: string,
  ): Promise<number> {
    const filter: FilterQuery<RoomDocument> = { propertyId, deletedAt: null };
    if (status) filter.status = status;
    return this.count(organizationId, filter);
  }

  async softDelete(organizationId: string, id: string): Promise<RoomDocument | null> {
    return this.updateOne(
      organizationId,
      { _id: id, deletedAt: null } as any,
      { $set: { deletedAt: new Date() } },
    );
  }

  async bulkInsert(
    organizationId: string,
    docs: Partial<Room>[],
  ): Promise<RoomDocument[]> {
    const toInsert = docs.map((doc) => ({
      ...doc,
      organizationId,
      version: 0,
      deletedAt: null,
    }));
    return this.model.insertMany(toInsert) as unknown as Promise<RoomDocument[]>;
  }
}
