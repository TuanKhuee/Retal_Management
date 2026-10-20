import {
  Model,
  Document,
  FilterQuery,
  UpdateQuery,
  ClientSession,
  QueryOptions,
  isValidObjectId,
} from 'mongoose';
import { OptimisticLockException, ResourceNotFoundException } from '../exceptions';
import { createPaginationMeta, PaginationMeta } from '../utils/pagination.util';

export abstract class TenantScopedRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  getModel(): Model<T> {
    return this.model;
  }

  /**
   * Helper to ensure organizationId is strictly scoped in any query filter
   */
  protected scopedFilter(
    organizationId: string,
    filter: FilterQuery<T> = {},
  ): FilterQuery<T> {
    return {
      ...filter,
      organizationId,
    };
  }

  async find(
    organizationId: string,
    filter: FilterQuery<T> = {},
    options?: QueryOptions<T>,
  ): Promise<T[]> {
    return this.model.find(this.scopedFilter(organizationId, filter), null, options).exec();
  }

  async findOne(
    organizationId: string,
    filter: FilterQuery<T>,
    options?: QueryOptions<T>,
  ): Promise<T | null> {
    return this.model.findOne(this.scopedFilter(organizationId, filter), null, options).exec();
  }

  async findById(
    organizationId: string,
    id: string,
    options?: QueryOptions<T>,
  ): Promise<T | null> {
    if (!isValidObjectId(id)) {
      try {
        return await this.model.findOne(
          this.scopedFilter(organizationId, {
            $or: [
              { code: id },
              { contractNo: id },
              { contractNumber: id },
              { roomNumber: id },
            ],
          } as FilterQuery<T>),
          null,
          options,
        ).exec();
      } catch {
        return null;
      }
    }
    return this.model.findOne(
      this.scopedFilter(organizationId, { _id: id } as FilterQuery<T>),
      null,
      options,
    ).exec();
  }

  async findByIdOrThrow(
    organizationId: string,
    id: string,
    resourceName = 'Resource',
    options?: QueryOptions<T>,
  ): Promise<T> {
    const doc = await this.findById(organizationId, id, options);
    if (!doc) {
      throw new ResourceNotFoundException(resourceName);
    }
    return doc;
  }

  async count(
    organizationId: string,
    filter: FilterQuery<T> = {},
  ): Promise<number> {
    return this.model.countDocuments(this.scopedFilter(organizationId, filter)).exec();
  }

  async create(
    organizationId: string,
    docData: Partial<T>,
    session?: ClientSession,
  ): Promise<T> {
    const payload = {
      ...docData,
      organizationId,
      version: 0,
    };
    if (session) {
      const [created] = await this.model.create([payload], { session });
      return created;
    }
    return this.model.create(payload);
  }

  async updateOne(
    organizationId: string,
    filter: FilterQuery<T>,
    updateData: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<T | null> {
    const opts: QueryOptions<T> = { new: true };
    if (session) opts.session = session;

    return this.model.findOneAndUpdate(
      this.scopedFilter(organizationId, filter),
      updateData,
      opts,
    ).exec();
  }

  /**
   * Updates a document using optimistic locking on the 'version' field.
   * Increments version by 1. Throws OptimisticLockException if version has changed.
   */
  async updateWithOptimisticLock(
    organizationId: string,
    id: string,
    currentVersion: number,
    updateData: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<T> {
    const filter = this.scopedFilter(organizationId, {
      _id: id,
      version: currentVersion,
    } as FilterQuery<T>);

    const update: UpdateQuery<T> = {
      ...updateData,
      $inc: { ...(updateData.$inc || {}), version: 1 },
    };

    const opts: QueryOptions<T> = { new: true };
    if (session) opts.session = session;

    const updated = await this.model.findOneAndUpdate(filter, update, opts).exec();
    if (!updated) {
      // Check if document exists at all
      const exists = await this.findById(organizationId, id);
      if (!exists) {
        throw new ResourceNotFoundException();
      }
      // If document exists but version didn't match -> Optimistic Lock Conflict!
      throw new OptimisticLockException(
        `Optimistic lock failure: current version is ${(exists as any).version}, expected ${currentVersion}`,
      );
    }
    return updated;
  }

  async findPaginated(
    organizationId: string,
    filter: FilterQuery<T> = {},
    page = 1,
    limit = 20,
    sort: any = { createdAt: -1 },
    populate?: any,
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    const scoped = this.scopedFilter(organizationId, filter);
    const skip = (page - 1) * limit;

    let query = this.model.find(scoped).sort(sort).skip(skip).limit(limit);
    if (populate) {
      query = query.populate(populate);
    }

    const [data, totalItems] = await Promise.all([
      query.exec(),
      this.model.countDocuments(scoped).exec(),
    ]);

    const meta = createPaginationMeta(page, limit, totalItems);
    return { data, meta };
  }
}
