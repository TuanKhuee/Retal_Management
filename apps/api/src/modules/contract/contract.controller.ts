import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
  ApiResponse,
} from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import {
  CreateContractDto,
  UpdateContractDto,
  CreateContractRevisionDto,
  TerminateContractDto,
  RenewContractDto,
  RecordDepositDto,
  MoveInDto,
  MoveOutPreviewDto,
  MoveOutDto,
  ContractQueryDto,
} from './dto/create-contract.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Get()
  @ApiOperation({
    summary: 'List contracts with filters & pagination (TENANT only sees their own contracts)',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ContractQueryDto,
  ) {
    return this.contractService.listContracts(user, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'create_contract', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Create a new rental contract in PENDING status' })
  @ApiResponse({ status: 201, description: 'Contract created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractService.createContract(user, dto);
  }

  /**
   * POST /contracts/move-in
   * 1 TRANSACTION = tạo/chọn tenant + contract ACTIVE + ghi cọc + meter reading (LOCKED)
   * + room OCCUPIED + currentContractId + audit + notification mời tenant
   */
  @Post('move-in')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'move_in', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Move-in workflow: 1 atomic transaction (tenant, contract, deposit, locked meter, room occupied, invite)',
  })
  async moveIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MoveInDto,
  ) {
    return this.contractService.moveIn(user, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get contract by ID (TENANT only reads their own contract; cross-access returns 404)',
  })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.contractService.getContractById(user, id);
  }

  /**
   * PATCH /contracts/:id
   * Chỉ sửa các trường phi tài chính. Chặn sửa rent / deposit.
   */
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'update_contract_non_financial', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Update non-financial contract terms (occupants, dueDay, terms, notes)' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractService.updateContract(user, id, dto);
  }

  /**
   * POST /contracts/:id/revisions
   * Đổi giá/điều khoản kèm effectiveFrom, reason -> thêm revision, tăng version, ghi audit
   */
  @Post(':id/revisions')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'create_contract_revision', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Adjust contract rent or terms: appends revision, bumps version, logs audit',
  })
  async createRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateContractRevisionDto,
  ) {
    return this.contractService.createRevision(user, id, dto);
  }

  @Post(':id/activate')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'activate_contract', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Activate contract: PENDING -> ACTIVE (locks room to OCCUPIED)' })
  async activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.contractService.activateContract(user, id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Compatibility alias for activate contract' })
  async activatePatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.contractService.activateContract(user, id);
  }

  @Post(':id/terminate')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'terminate_contract', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Terminate contract: ACTIVE -> TERMINATED (frees room to VACANT)' })
  async terminate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TerminateContractDto,
  ) {
    return this.contractService.terminateContract(user, id, dto);
  }

  @Patch(':id/terminate')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Compatibility alias for terminate contract' })
  async terminatePatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TerminateContractDto,
  ) {
    return this.contractService.terminateContract(user, id, dto);
  }

  @Post(':id/renew')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'renew_contract', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Renew contract: extends endDate and optionally adjusts rent' })
  async renew(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RenewContractDto,
  ) {
    return this.contractService.renewContract(user, id, dto);
  }

  /**
   * POST /contracts/:id/deposit
   * Ghi nhận biến động cọc: COLLECTED | DEDUCTED | REFUNDED
   */
  @Post(':id/deposit')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'record_deposit', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Record deposit transaction: COLLECTED | DEDUCTED | REFUNDED' })
  async recordDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RecordDepositDto,
  ) {
    return this.contractService.recordDeposit(user, id, dto);
  }

  /**
   * POST /contracts/:id/move-out/preview
   * Tính toán hóa đơn cuối prorate + đối trừ công nợ/chi phí + cọc hoàn (KHÔNG GHI DATABASE)
   */
  @Post(':id/move-out/preview')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview move-out settlement: prorated rent, utilities, debt deduction, deposit refund (No DB writes)',
  })
  async moveOutPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveOutPreviewDto,
  ) {
    return this.contractService.moveOutPreview(user, id, dto);
  }

  /**
   * POST /contracts/:id/move-out
   * Chốt theo preview: hóa đơn cuối, contract TERMINATED, room VACANT, isCurrent=false
   */
  @Post(':id/move-out')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'move_out_finalize', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Finalize move-out: settlement invoice, contract TERMINATED, room VACANT, isCurrent=false',
  })
  async moveOut(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveOutDto,
  ) {
    return this.contractService.moveOut(user, id, dto);
  }
}

/**
 * Top-level /move-in route alias for convenience: POST /move-in
 */
@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('move-in')
export class MoveInController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'move_in', entity: 'contract' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Move-in workflow top-level alias (POST /move-in)' })
  async moveIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MoveInDto,
  ) {
    return this.contractService.moveIn(user, dto);
  }
}
