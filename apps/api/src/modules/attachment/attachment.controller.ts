import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { AttachmentService } from './attachment.service';
import {
  PresignAttachmentDto,
  PresignAttachmentResponseDto,
  AttachmentUrlResponseDto,
} from './dto/attachment.dto';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attachments')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('presign')
  @ApiOperation({
    summary:
      'Generate S3 pre-signed upload URL after validating whitelist MIME, extension, and file size',
  })
  @ApiResponse({ status: 201, type: PresignAttachmentResponseDto })
  async presign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PresignAttachmentDto,
  ) {
    return this.attachmentService.presign(user, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark attachment upload as READY' })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.attachmentService.complete(user, id);
  }

  @Get(':id/url')
  @ApiOperation({
    summary:
      'Get short-lived pre-signed download URL, verifying entity-level access permissions',
  })
  @ApiResponse({ status: 200, type: AttachmentUrlResponseDto })
  async getUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.attachmentService.getUrl(user, id);
  }
}
