import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attachment, AttachmentSchema } from './schemas/attachment.schema';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentService } from './attachment.service';
import { AttachmentController } from './attachment.controller';
import { StorageService } from '../../infra/storage/storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attachment.name, schema: AttachmentSchema },
    ]),
  ],
  controllers: [AttachmentController],
  providers: [
    AttachmentRepository,
    AttachmentService,
    StorageService,
  ],
  exports: [AttachmentRepository, AttachmentService],
})
export class AttachmentModule {}
