import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string = 'rental-storage';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const endpoint = this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    const region = this.config.get<string>('S3_REGION', 'us-east-1');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID', 'minioadmin');
    const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY', 'minioadmin');
    const forcePathStyle = this.config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true';
    this.bucketName = this.config.get<string>('S3_BUCKET_NAME', 'rental-storage');

    try {
      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle,
      });
      this.logger.log(`S3 Client initialized with endpoint ${endpoint}, bucket ${this.bucketName}`);
    } catch (err: any) {
      this.logger.warn(`S3 initialization warning: ${err.message}`);
    }
  }

  /**
   * Generates a pre-signed URL for client direct PUT upload
   */
  async generateUploadPresignedUrl(
    organizationId: string,
    filename: string,
    contentType: string,
    expiresIn = 900, // 15 minutes
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const fileKey = `${organizationId}/${Date.now()}-${filename}`;

    if (!this.s3Client) {
      return {
        uploadUrl: `http://localhost:3000/mock-storage/upload/${fileKey}`,
        fileKey,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: contentType,
      Metadata: {
        organizationId,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    return { uploadUrl, fileKey };
  }

  /**
   * Generates a pre-signed URL for secure GET download
   */
  async generateDownloadPresignedUrl(
    organizationId: string,
    fileKey: string,
    expiresIn = 3600, // 1 hour
  ): Promise<string> {
    // Prevent cross-organization access to files
    if (!fileKey.startsWith(`${organizationId}/`)) {
      throw new Error('Access denied: Cannot access files outside your organization');
    }

    if (!this.s3Client) {
      return `http://localhost:3000/mock-storage/download/${fileKey}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
