import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { AttachmentService } from './attachment.service';
import { AttachmentRepository } from './attachment.repository';
import { StorageService } from '../../infra/storage/storage.service';
import { AttachmentStatus, UserRole } from '../../common/constants';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

describe('AttachmentService', () => {
  let service: AttachmentService;
  let attachmentRepo: Partial<Record<keyof AttachmentRepository, jest.Mock>>;
  let storageService: Partial<Record<keyof StorageService, jest.Mock>>;
  let mockConnection: any;

  const mockUser: AuthenticatedUser = {
    userId: 'user-tenant-1',
    email: 'tenant1@test.com',
    organizationId: 'org-1',
    role: UserRole.TENANT,
    tenantId: 'tenant-1',
    permissions: [],
  };

  const mockOwner: AuthenticatedUser = {
    userId: 'user-owner-1',
    email: 'owner@test.com',
    organizationId: 'org-1',
    role: UserRole.OWNER,
    permissions: [],
  };

  beforeEach(async () => {
    attachmentRepo = {
      create: jest.fn(),
      findById: jest.fn(),
    };

    storageService = {
      generateUploadPresignedUrl: jest.fn().mockResolvedValue({
        uploadUrl: 'https://storage.local/upload/signed-put',
        fileKey: 'org-1/attachments/file.jpg',
      }),
      generateDownloadPresignedUrl: jest.fn().mockResolvedValue(
        'https://storage.local/download/signed-get',
      ),
    };

    mockConnection = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        { provide: AttachmentRepository, useValue: attachmentRepo },
        { provide: StorageService, useValue: storageService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<AttachmentService>(AttachmentService);
  });

  describe('presign', () => {
    it('tạo pre-signed URL upload thành công cho ảnh .jpg hợp lệ', async () => {
      const mockCreatedAttachment = {
        _id: 'att-123',
        filename: 'room_leak.jpg',
        fileKey: 'org-1/attachments/room_leak.jpg',
        status: AttachmentStatus.PENDING,
      };
      (attachmentRepo.create as jest.Mock).mockResolvedValue(mockCreatedAttachment);

      const result = await service.presign(mockUser, {
        filename: 'room_leak.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 500, // 500KB
      });

      expect(result.attachmentId).toBe('att-123');
      expect(result.uploadUrl).toBe('https://storage.local/upload/signed-put');
      expect(attachmentRepo.create).toHaveBeenCalled();
    });

    it('tạo pre-signed URL upload thành công cho tài liệu .pdf và video .mp4', async () => {
      (attachmentRepo.create as jest.Mock).mockResolvedValue({
        _id: 'att-pdf-1',
        filename: 'contract.pdf',
        fileKey: 'org-1/attachments/contract.pdf',
      });

      const resultPdf = await service.presign(mockUser, {
        filename: 'contract.pdf',
        mimeType: 'application/pdf',
        size: 1024 * 1024 * 2, // 2MB
      });
      expect(resultPdf.attachmentId).toBe('att-pdf-1');

      (attachmentRepo.create as jest.Mock).mockResolvedValue({
        _id: 'att-mp4-1',
        filename: 'leak_video.mp4',
        fileKey: 'org-1/attachments/leak_video.mp4',
      });

      const resultMp4 = await service.presign(mockUser, {
        filename: 'leak_video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 15, // 15MB
      });
      expect(resultMp4.attachmentId).toBe('att-mp4-1');
    });

    it('từ chối extension ngoài whitelist (ví dụ .exe, .sh) -> ném BusinessRuleViolationException', async () => {
      await expect(
        service.presign(mockUser, {
          filename: 'malware.exe',
          mimeType: 'application/octet-stream',
          size: 1000,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('từ chối MIME type ngoài whitelist -> ném BusinessRuleViolationException', async () => {
      await expect(
        service.presign(mockUser, {
          filename: 'script.js',
          mimeType: 'application/javascript',
          size: 500,
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('từ chối file có kích thước vượt quá 50MB -> ném BusinessRuleViolationException', async () => {
      await expect(
        service.presign(mockUser, {
          filename: 'huge_video.mp4',
          mimeType: 'video/mp4',
          size: 51 * 1024 * 1024, // 51MB
        }),
      ).rejects.toThrow(BusinessRuleViolationException);
    });
  });

  describe('complete', () => {
    it('chuyển trạng thái file sang READY khi upload xong', async () => {
      const mockDoc = {
        _id: 'att-123',
        status: AttachmentStatus.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(mockDoc);

      const res = await service.complete(mockUser, 'att-123');
      expect(res.success).toBe(true);
      expect(mockDoc.status).toBe(AttachmentStatus.READY);
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('báo lỗi 404 nếu không tìm thấy attachment', async () => {
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.complete(mockUser, 'att-none')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('getUrl', () => {
    it('OWNER có quyền lấy download URL của bất kỳ file nào trong tổ chức', async () => {
      const mockDoc = {
        _id: 'att-123',
        organizationId: 'org-1',
        uploaderId: 'other-user',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        fileKey: 'org-1/attachments/photo.jpg',
      };
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(mockDoc);

      const res = await service.getUrl(mockOwner, 'att-123');
      expect(res.downloadUrl).toBe('https://storage.local/download/signed-get');
      expect(res.filename).toBe('photo.jpg');
    });

    it('TENANT được tải file do chính mình upload', async () => {
      const mockDoc = {
        _id: 'att-123',
        organizationId: 'org-1',
        uploaderId: 'user-tenant-1', // chính mình
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        fileKey: 'org-1/attachments/photo.jpg',
      };
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(mockDoc);

      const res = await service.getUrl(mockUser, 'att-123');
      expect(res.downloadUrl).toBe('https://storage.local/download/signed-get');
    });

    it('TENANT không được truy cập file của tenant khác -> ném ResourceNotFoundException (404)', async () => {
      const mockDoc = {
        _id: 'att-999',
        organizationId: 'org-1',
        uploaderId: 'user-tenant-2', // người khác
        entityType: 'MAINTENANCE_REQUEST',
        entityId: 'ticket-tenant-2',
        filename: 'secret.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        fileKey: 'org-1/attachments/secret.jpg',
      };
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(mockDoc);

      // Mock database lookup trả về ticket thuộc tenant khác
      mockConnection.collection().findOne.mockResolvedValue({
        _id: 'ticket-tenant-2',
        tenantId: 'tenant-2', // khác tenant-1
      });

      await expect(service.getUrl(mockUser, 'att-999')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });
});
