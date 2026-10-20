import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MeterReadingService } from './meter-reading.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import {
  UpdateMeterReadingDto,
  BatchMeterReadingsDto,
  LockMeterReadingsDto,
  ImportMeterReadingsDto,
} from './dto/meter-reading.dto';
import { RecordMeterReadingDto } from './dto/record-meter-reading.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Meter Readings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meter-readings')
export class MeterReadingController {
  constructor(private readonly meterService: MeterReadingService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Get area meter reading board by propertyId & period, or filter by roomId',
  })
  @ApiQuery({ name: 'propertyId', required: false, type: String })
  @ApiQuery({ name: 'period', required: false, type: String, example: '2026-10' })
  @ApiQuery({ name: 'roomId', required: false, type: String })
  @ApiQuery({ name: 'billingPeriod', required: false, type: String })
  async getReadings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('propertyId') propertyId?: string,
    @Query('period') period?: string,
    @Query('roomId') roomId?: string,
    @Query('billingPeriod') billingPeriod?: string,
  ) {
    if (propertyId && (period || billingPeriod)) {
      return this.meterService.getBoardReadings(
        user,
        propertyId,
        period || billingPeriod!,
      );
    }
    if (roomId) {
      return this.meterService.getReadingsByRoom(user, roomId, period || billingPeriod);
    }
    return { message: 'Please specify propertyId & period or roomId' };
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Audit({ action: 'update_meter_reading', entity: 'meter_reading' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Update reading: server retrieves previousValue, calculates consumption (Client does not send consumption)',
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMeterReadingDto,
  ) {
    return this.meterService.updateReading(user, id, dto);
  }

  @Post('batch')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'batch_record_meter_readings', entity: 'meter_reading' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Batch input multiple meter readings for a property & period' })
  async batch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BatchMeterReadingsDto,
  ) {
    return this.meterService.batchRecord(user, dto);
  }

  @Post('lock')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'lock_meter_readings', entity: 'meter_reading' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Lock meter readings for period: snapshots unitPrice/amount from service and locks records',
  })
  async lock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LockMeterReadingsDto,
  ) {
    return this.meterService.lockReadings(user, dto);
  }

  @Post('import')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'import_meter_readings', entity: 'meter_reading' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Excel/CSV Import: preview validates line-by-line errors (commit=false); commit mode writes data (commit=true)',
  })
  async import(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportMeterReadingsDto,
  ) {
    return this.meterService.importReadings(user, dto);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Audit({ action: 'record_meter', entity: 'meter_reading' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Legacy single record electricity and water meter readings' })
  async recordLegacy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordMeterReadingDto,
  ) {
    return this.meterService.recordReading(user, dto);
  }
}
