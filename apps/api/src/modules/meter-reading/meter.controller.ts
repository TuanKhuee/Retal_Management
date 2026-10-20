import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MeterReadingService } from './meter-reading.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import { CreateMeterDto, UpdateMeterDto } from './dto/meter-reading.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Meters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MeterController {
  constructor(private readonly meterService: MeterReadingService) {}

  @Get('rooms/:id/meters')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all electric and water meters installed in a room' })
  async getMetersByRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') roomId: string,
  ) {
    return this.meterService.getMetersByRoom(user, roomId);
  }

  @Post('rooms/:id/meters')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'create_meter', entity: 'meter' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Add a new electric or water meter to a room' })
  @ApiResponse({ status: 201, description: 'Meter created successfully' })
  async createMeter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') roomId: string,
    @Body() dto: CreateMeterDto,
  ) {
    return this.meterService.createMeter(user, roomId, dto);
  }

  @Patch('meters/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'update_meter', entity: 'meter' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Update meter details (serialNo, multiplier, status: ACTIVE|INACTIVE|REPLACED)' })
  async updateMeter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMeterDto,
  ) {
    return this.meterService.updateMeter(user, id, dto);
  }
}
