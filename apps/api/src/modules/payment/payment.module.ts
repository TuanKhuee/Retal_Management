import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { PaymentController, PaymentClaimController } from './payment.controller';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    InvoiceModule,
  ],
  controllers: [PaymentController, PaymentClaimController],
  providers: [PaymentRepository, PaymentService],
  exports: [PaymentRepository, PaymentService],
})
export class PaymentModule {}
