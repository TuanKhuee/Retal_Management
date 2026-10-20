import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import { MaintenanceService } from './maintenance.service';
import {
  CreateMaintenanceRequestDto,
  QueryMaintenanceRequestsDto,
} from './dto/create-maintenance.dto';
import {
  TenantActionDto,
  TransitionMaintenanceDto,
} from './dto/transition-maintenance.dto';
import {
  CreateMaintenanceMessageDto,
  QueryMaintenanceMessagesDto,
} from './dto/maintenance-message.dto';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance-requests')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles(UserRole.TENANT)
  @ApiOperation({
    summary:
      'TENANT: Create maintenance request (auto assigns roomId/tenantId from active contract)',
  })
  async createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMaintenanceRequestDto,
  ) {
    return this.maintenanceService.createRequest(user, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List maintenance requests (OWNER: all with filters, TENANT: only own)',
  })
  async listRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMaintenanceRequestsDto,
  ) {
    return this.maintenanceService.listRequests(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get maintenance request detail (TENANT can only view own tickets; others return 404)',
  })
  async getRequestById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.maintenanceService.getRequestById(user, id);
  }

  @Post(':id/transition')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary:
      'OWNER/STAFF: Transition ticket status (ACCEPTED, IN_PROGRESS, RESOLVED, REJECTED)',
  })
  async transitionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TransitionMaintenanceDto,
  ) {
    return this.maintenanceService.transitionStatus(user, id, dto);
  }

  @Post(':id/confirm')
  @Roles(UserRole.TENANT)
  @ApiOperation({
    summary: 'TENANT: Confirm resolved maintenance request -> CONFIRMED',
  })
  async confirmRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto?: TenantActionDto,
  ) {
    return this.maintenanceService.confirmRequest(user, id, dto);
  }

  @Post(':id/reopen')
  @Roles(UserRole.TENANT)
  @ApiOperation({
    summary: 'TENANT: Reopen resolved maintenance request -> REOPENED',
  })
  async reopenRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto?: TenantActionDto,
  ) {
    return this.maintenanceService.reopenRequest(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles(UserRole.TENANT)
  @ApiOperation({
    summary: 'TENANT: Cancel NEW or ACCEPTED maintenance request -> CANCELLED',
  })
  async cancelRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto?: TenantActionDto,
  ) {
    return this.maintenanceService.cancelRequest(user, id, dto);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary:
      'List messages for ticket with cursor pagination (only ticket participants allowed)',
  })
  async listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: QueryMaintenanceMessagesDto,
  ) {
    return this.maintenanceService.listMessages(user, id, query);
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Send a message in ticket chat (only ticket participants allowed)',
  })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateMaintenanceMessageDto,
  ) {
    return this.maintenanceService.sendMessage(user, id, dto);
  }

  @Post(':id/messages/read')
  @ApiOperation({ summary: 'Mark messages as read for this ticket' })
  async markMessagesRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.maintenanceService.markMessagesRead(user, id);
  }
}
