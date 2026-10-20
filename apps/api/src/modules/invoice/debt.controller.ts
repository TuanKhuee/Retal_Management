import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import { QueryDebtsDto } from './dto/create-invoice.dto';

@ApiTags('Debts & Aging Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('debts')
export class DebtController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary:
      'Get aging debt reports grouped by room/tenant with overdue aging buckets (current, 1-7, 8-30, >30 days)',
  })
  async getDebts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryDebtsDto,
  ) {
    return this.invoiceService.getDebts(user, query);
  }
}
