import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AttachmentRepository } from './attachment.repository';
import { StorageService } from '../../infra/storage/storage.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { AttachmentStatus, UserRole } from '../../common/constants';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { PresignAttachmentDto } from './dto/attachment.dto';

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/webm',
  // Documents
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'heic',
  'mp4',
  'mov',
  'webm',
  'pdf',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  constructor(
    private readonly attachmentRepo: AttachmentRepository,
    private readonly storageService: StorageService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async presign(user: AuthenticatedUser, dto: PresignAttachmentDto) {
    const rawExt = path.extname(dto.filename).toLowerCase().replace('.', '');
    if (!rawExt || !ALLOWED_EXTENSIONS.has(rawExt)) {
      throw new BusinessRuleViolationException(
        `Extension '.${rawExt || 'unknown'}' is not allowed. Whitelist: ${Array.from(
          ALLOWED_EXTENSIONS,
        ).join(', ')}`,
      );
    }

    const mime = dto.mimeType.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new BusinessRuleViolationException(
        `MIME type '${mime}' is not allowed. Only images, videos, and PDFs are supported.`,
      );
    }

    if (dto.size <= 0) {
      throw new BadRequestException('File size must be greater than 0');
    }

    if (dto.size > MAX_FILE_SIZE) {
      throw new BusinessRuleViolationException(
        `File size (${(dto.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of 50MB`,
      );
    }

    const sanitizedBase = path
      .basename(dto.filename, `.${rawExt}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFilename = `${Date.now()}-${uuidv4().slice(0, 8)}-${sanitizedBase}.${rawExt}`;
    const fileKey = `${user.organizationId}/attachments/${uniqueFilename}`;

    const { uploadUrl } = await this.storageService.generateUploadPresignedUrl(
      user.organizationId,
      `attachments/${uniqueFilename}`,
      dto.mimeType,
      900,
    );

    const attachment = await this.attachmentRepo.create(user.organizationId, {
      uploaderId: user.userId,
      filename: dto.filename,
      mimeType: dto.mimeType,
      extension: rawExt,
      size: dto.size,
      fileKey,
      status: AttachmentStatus.PENDING,
      entityType: dto.entityType,
      entityId: dto.entityId,
    });

    return {
      attachmentId: attachment._id.toString(),
      uploadUrl,
      fileKey,
    };
  }

  async complete(user: AuthenticatedUser, id: string) {
    const attachment = await this.attachmentRepo.findById(user.organizationId, id);
    if (!attachment) {
      throw new ResourceNotFoundException('Attachment');
    }

    attachment.status = AttachmentStatus.READY;
    await attachment.save();

    return {
      success: true,
      attachment,
    };
  }

  async getUrl(user: AuthenticatedUser, id: string) {
    const attachment = await this.attachmentRepo.findById(user.organizationId, id);
    if (!attachment) {
      throw new ResourceNotFoundException('Attachment');
    }

    // Permission check for TENANT
    if (user.role === UserRole.TENANT) {
      const isUploader = attachment.uploaderId === user.userId;
      let hasEntityAccess = false;

      if (!isUploader && attachment.entityType && attachment.entityId) {
        hasEntityAccess = await this.checkTenantEntityAccess(
          user,
          attachment.entityType,
          attachment.entityId,
        );
      }

      if (!isUploader && !hasEntityAccess) {
        throw new ResourceNotFoundException('Attachment');
      }
    }

    const downloadUrl = await this.storageService.generateDownloadPresignedUrl(
      user.organizationId,
      attachment.fileKey,
      900, // 15 mins
    );

    return {
      attachmentId: attachment._id.toString(),
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      downloadUrl,
      url: downloadUrl,
      expiresIn: 900,
    };
  }

  private async checkTenantEntityAccess(
    user: AuthenticatedUser,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    try {
      const orgId = user.organizationId;
      const idFilter: any = entityId;

      if (entityType === 'MAINTENANCE_REQUEST') {
        const doc: any = await this.connection
          .collection('maintenance_requests')
          .findOne({ _id: idFilter, organizationId: orgId });
        return !!doc && doc.tenantId === user.tenantId;
      }

      if (entityType === 'INVOICE') {
        const doc: any = await this.connection
          .collection('invoices')
          .findOne({ _id: idFilter, organizationId: orgId });
        return !!doc && doc.tenantId === user.tenantId;
      }

      if (entityType === 'PAYMENT') {
        const doc: any = await this.connection
          .collection('payments')
          .findOne({ _id: idFilter, organizationId: orgId });
        return !!doc && doc.tenantId === user.tenantId;
      }

      if (entityType === 'CONTRACT') {
        const doc: any = await this.connection
          .collection('contracts')
          .findOne({ _id: idFilter, organizationId: orgId });
        return !!doc && (doc.primaryTenantId === user.tenantId || doc.tenantId === user.tenantId);
      }

      return false;
    } catch {
      return false;
    }
  }
}
