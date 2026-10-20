import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { Permission } from '../../common/constants';
import { UpdateOrganizationSettingsDto } from './dto/update-settings.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'Get current organization profile and billing settings' })
  @ApiResponse({ status: 200, description: 'Organization profile returned' })
  async getMyOrganization(@CurrentUser() user: AuthenticatedUser) {
    return this.orgService.getOrganization(user.organizationId);
  }

  @Put('settings')
  @RequirePermissions(Permission.ORG_SETTINGS_UPDATE)
  @Audit({ action: 'update_settings', entity: 'organization' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Update organization settings (rounding step, invoice terms)' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.orgService.updateSettings(user.organizationId, dto);
  }
}
