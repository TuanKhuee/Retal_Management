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
import { ReportService } from './report.service';
import { ExportReportDto, ReportFilterDto } from './dto/report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('revenue')
  @ApiOperation({
    summary: 'OWNER: Aggregated revenue report (by period, property, fee breakdown)',
  })
  async getRevenueReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportService.getRevenueReport(user.organizationId, filter);
  }

  @Get('debt')
  @ApiOperation({
    summary: 'OWNER: Aggregated debt report with aging buckets (1-7, 8-30, >30 days)',
  })
  async getDebtReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportService.getDebtReport(user.organizationId, filter);
  }

  @Get('occupancy')
  @ApiOperation({
    summary: 'OWNER: Room occupancy rate and vacant/occupied rooms report',
  })
  async getOccupancyReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportService.getOccupancyReport(user.organizationId, filter);
  }

  @Get('utilities')
  @ApiOperation({
    summary: 'OWNER: Utilities electricity and water consumption and costs report',
  })
  async getUtilitiesReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportService.getUtilitiesReport(user.organizationId, filter);
  }

  @Get('maintenance')
  @ApiOperation({
    summary: 'OWNER: Maintenance ticket volume, status breakdown, and costs report',
  })
  async getMaintenanceReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportService.getMaintenanceReport(user.organizationId, filter);
  }

  @Post(':type/export')
  @ApiOperation({
    summary:
      'OWNER: Trigger async report export (Excel/PDF), returns jobId and notifies when ready',
  })
  async exportReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: string,
    @Body() dto: ExportReportDto,
  ) {
    return this.reportService.exportReport(user, type, dto);
  }
}
