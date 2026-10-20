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
import { NotificationService } from './notification.service';
import {
  BroadcastNotificationDto,
  QueryNotificationsDto,
} from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get notifications of current user with cursor pagination & unread filter',
  })
  async listNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationService.listNotifications(user, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread notifications count' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getUnreadCount(user);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(user, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.markAllRead(user);
  }

  @Post('broadcast')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'OWNER: Broadcast announcement to tenants by property, room, or all',
  })
  async broadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BroadcastNotificationDto,
  ) {
    return this.notificationService.broadcast(user, dto);
  }
}
