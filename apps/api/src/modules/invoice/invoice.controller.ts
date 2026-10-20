import {
  Body,
  Controller,
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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import {
  GenerateInvoiceDto,
  CancelInvoiceDto,
  UpdateInvoiceDto,
  BatchIssueInvoicesDto,
  QueryInvoicesDto,
} from './dto/create-invoice.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('generate-draft')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'generate_draft_invoice', entity: 'invoice' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Generate draft invoice snapshot from rent + meter readings' })
  @ApiResponse({ status: 201, description: 'Draft invoice created' })
  async generateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateInvoiceDto,
  ) {
    return this.invoiceService.generateDraftInvoice(user, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.TENANT)
  @ApiOperation({
    summary:
      'List invoices with filters (status, period/billingPeriodId, propertyId, roomId, overdue)',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryInvoicesDto,
  ) {
    return this.invoiceService.listInvoices(user, query);
  }

  @Post('issue')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'batch_issue_invoices', entity: 'invoice' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Batch issue draft invoices' })
  async batchIssue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BatchIssueInvoicesDto,
  ) {
    return this.invoiceService.batchIssue(user, dto);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.TENANT)
  @ApiOperation({ summary: 'Get invoice details by ID (Tenant ownership protected)' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.invoiceService.getInvoiceById(user, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'update_draft_invoice', entity: 'invoice' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Update draft invoice items/discounts/notes (DRAFT only)' })
  async updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.updateDraftInvoice(user, id, dto);
  }

  @Post(':id/issue')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'issue_invoice', entity: 'invoice' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Issue invoice: DRAFT -> ISSUED' })
  async issuePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.invoiceService.issueInvoice(user, id);
  }

  // Compatibility alias
  @Patch(':id/issue')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'issue_invoice', entity: 'invoice' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Issue invoice: DRAFT -> ISSUED (alias)' })
  async issuePatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.invoiceService.issueInvoice(user, id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'cancel_invoice', entity: 'invoice' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Cancel/Void invoice with mandatory reason (PAID cannot be cancelled)' })
  async cancelPost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.invoiceService.cancelOrVoidInvoice(user, id, dto);
  }

  // Compatibility alias
  @Patch(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'cancel_invoice', entity: 'invoice' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Cancel/Void invoice with mandatory reason (alias)' })
  async cancelPatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.invoiceService.cancelOrVoidInvoice(user, id, dto);
  }

  @Get(':id/pdf')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.TENANT)
  @ApiOperation({ summary: 'Get invoice printable PDF/HTML document' })
  async getPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.invoiceService.getInvoicePdf(user, id);
  }

  @Get(':id/payment-qr')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.TENANT)
  @ApiOperation({
    summary:
      'Generate VietQR for invoice payment from property bankAccount (content=invoiceNo, amount=remaining)',
  })
  async getPaymentQr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.invoiceService.getPaymentQr(user, id);
  }
}
