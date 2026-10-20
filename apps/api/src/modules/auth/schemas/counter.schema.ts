import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CounterDocument = Counter & Document;

@Schema({ timestamps: true, collection: 'counters' })
export class Counter {
  @Prop({ required: true })
  _id: string; // Key name e.g. "invoice_seq_org1"

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
