import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BillingPeriodService } from './billing-period.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import {
  CreateBillingPeriodDto,
  CloseBillingPeriodDto,
  GenerateInvoicesDto,
  QueryBillingPeriodsDto,
} from './dto/billing-period.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Billing Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing-periods')
export class BillingPeriodController {
  constructor(private readonly periodService: BillingPeriodService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'create_billing_period', entity: 'billing_period' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Create a new billing period for a property (OWNER/MANAGER)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBillingPeriodDto,
  ) {
    return this.periodService.create(user, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'List all billing periods for a property (OWNER/MANAGER/STAFF)' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryBillingPeriodsDto,
  ) {
    return this.periodService.list(user, query);
  }

  @Post(':id/close')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'close_billing_period', entity: 'billing_period' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Close a billing period (OWNER/MANAGER)' })
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CloseBillingPeriodDto,
  ) {
    return this.periodService.close(user, id, dto);
  }

  @Post(':id/generate-invoices')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'generate_invoices_for_period', entity: 'billing_period' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary:
      'Idempotently generate invoices in chunks for all active contracts in period. Reading must be LOCKED.',
  })
  async generateInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GenerateInvoicesDto,
  ) {
    return this.periodService.generateInvoices(user, id, dto);
  }
}
