import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AuditLogService, QueryAuditLogsDto } from './audit-log.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary:
      'OWNER/MANAGER: Get append-only audit logs with filters (entity, actor, time range) & cursor pagination',
  })
  @ApiQuery({ name: 'entity', required: false, type: String, example: 'Contract' })
  @ApiQuery({ name: 'actor', required: false, type: String, example: 'user-owner-1' })
  @ApiQuery({ name: 'from', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, type: String, example: '2026-12-31' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'List of audit records' })
  async getAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.auditLogService.getLogs(user.organizationId, query);
  }
}
