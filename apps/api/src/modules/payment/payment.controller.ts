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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles, IdempotencyKey } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import {
  CreatePaymentDto,
  CreatePaymentClaimDto,
  RejectPaymentDto,
  VoidPaymentDto,
} from './dto/create-payment.dto';
import { PaginationQueryDto } from '../../common/utils/pagination.util';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'process_payment', entity: 'payment' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary:
      'Process payment for invoice (CASH|BANK_TRANSFER, within transaction, amount<=remaining, optimistic lock)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Unique client-generated idempotency key (UUID)',
  })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDto,
    @IdempotencyKey(false) idempotencyKey?: string,
  ) {
    return this.paymentService.processPayment(user, dto, idempotencyKey);
  }

  @Post(':id/confirm')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'confirm_payment_claim', entity: 'payment' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Confirm a PENDING payment claim -> CONFIRMED, updates invoice balance' })
  async confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.paymentService.confirmPayment(user, id);
  }

  @Post(':id/reject')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'reject_payment_claim', entity: 'payment' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Reject a PENDING payment claim with mandatory reason' })
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.paymentService.rejectPayment(user, id, dto);
  }

  @Post(':id/void')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'void_payment', entity: 'payment' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Void a CONFIRMED payment with mandatory reason, reverts invoice balance' })
  async void(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VoidPaymentDto,
  ) {
    return this.paymentService.voidPayment(user, id, dto);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.TENANT)
  @ApiOperation({ summary: 'Get payment receipt by ID (tenants only see their own)' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.paymentService.getPaymentById(user, id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.TENANT)
  @ApiOperation({ summary: 'List payments' })
  @ApiQuery({ name: 'invoiceId', required: false, type: String })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('invoiceId') invoiceId?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.paymentService.listPayments(
      user,
      pagination?.page,
      pagination?.limit,
      invoiceId,
    );
  }
}

@ApiTags('Payment Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PaymentClaimController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('invoices/:id/payment-claims')
  @Roles(UserRole.TENANT, UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'submit_payment_claim', entity: 'payment_claim' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'TENANT: Report bank transfer payment with proof attachment -> PENDING claim',
  })
  async createClaim(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceId: string,
    @Body() dto: CreatePaymentClaimDto,
  ) {
    return this.paymentService.createPaymentClaim(user, invoiceId, dto);
  }
}
