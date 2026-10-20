import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from '../schemas/counter.schema';

@Injectable()
export class CounterRepository {
  constructor(
    @InjectModel(Counter.name)
    private readonly model: Model<CounterDocument>,
  ) {}

  async getNextSequence(sequenceName: string): Promise<number> {
    const counter = await this.model.findByIdAndUpdate(
      sequenceName,
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return counter.seq;
  }
}
