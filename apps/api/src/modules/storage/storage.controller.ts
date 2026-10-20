import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StorageService } from '../../infra/storage/storage.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { GenerateUploadUrlDto } from './dto/storage.dto';

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Generate S3 presigned URL for direct file upload' })
  async getUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateUploadUrlDto,
  ) {
    return this.storageService.generateUploadPresignedUrl(
      user.organizationId,
      dto.filename,
      dto.contentType,
    );
  }

  @Get('download-url')
  @ApiOperation({ summary: 'Generate S3 presigned URL for downloading organization file' })
  @ApiQuery({ name: 'fileKey', required: true, type: String })
  async getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fileKey') fileKey: string,
  ) {
    const downloadUrl = await this.storageService.generateDownloadPresignedUrl(
      user.organizationId,
      fileKey,
    );
    return { downloadUrl };
  }
}
