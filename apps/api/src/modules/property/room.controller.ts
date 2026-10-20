import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import {
  CreateRoomDto,
  UpdateRoomDto,
  BulkCreateRoomsDto,
  ChangeRoomStatusDto,
  RoomQueryDto,
} from './dto/room.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  @ApiOperation({
    summary: 'List rooms with filters (propertyId, status, floor, q) & pagination (TENANT sees their room)',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RoomQueryDto,
  ) {
    return this.propertyService.listRooms(user, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'create_room', entity: 'room' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Create a single room (OWNER/MANAGER only)' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomDto,
  ) {
    return this.propertyService.createRoom(user, dto);
  }

  @Post('bulk')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'bulk_create_rooms', entity: 'room' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Bulk create rooms via pattern e.g. A101-A120 (OWNER/MANAGER only)',
  })
  @ApiResponse({ status: 201, description: 'Bulk rooms created successfully' })
  async bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkCreateRoomsDto,
  ) {
    return this.propertyService.bulkCreateRooms(user, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get room by ID (TENANT can only view their own room; cross-access returns 404)',
  })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.propertyService.getRoomById(user, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'update_room', entity: 'room' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Update room details (OWNER/MANAGER only)' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.propertyService.updateRoom(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'delete_room', entity: 'room' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Soft-delete room (CHẶN khi phòng đang OCCUPIED -> 422)',
  })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.propertyService.deleteRoom(user, id);
  }

  @Post(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'change_room_status', entity: 'room' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Change room status: VACANT <-> MAINTENANCE <-> RESERVED (CHẶN khi OCCUPIED)',
  })
  async changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChangeRoomStatusDto,
  ) {
    return this.propertyService.changeRoomStatus(user, id, dto);
  }
}
