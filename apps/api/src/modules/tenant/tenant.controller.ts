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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantQueryDto,
  CreateTenantAccountDto,
} from './dto/create-tenant.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'List tenants (search by name or phone, paginated)' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TenantQueryDto,
  ) {
    return this.tenantService.listTenants(user, query);
  }

  @Post('account')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'create_tenant_account', entity: 'tenant' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Directly create login account for tenant with phone and password',
  })
  @ApiResponse({ status: 201, description: 'Tenant account created successfully' })
  async createAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantAccountDto,
  ) {
    return this.tenantService.createTenantAccount(user, dto);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'create_tenant', entity: 'tenant' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Create a new tenant profile (auto-encrypts CCCD with AES-256-GCM)',
  })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantDto,
  ) {
    return this.tenantService.createTenant(user, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get tenant profile (TENANT can only view their own profile; cross-access returns 404)',
  })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tenantService.getTenantById(user, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.TENANT)
  @Audit({ action: 'update_tenant', entity: 'tenant' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Update tenant profile details' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantService.updateTenant(user, id, dto);
  }

  @Get(':id/history')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.TENANT)
  @ApiOperation({
    summary: 'Get rental history of tenant: contracts, past rooms, invoices, and payments',
  })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tenantService.getTenantHistory(user, id);
  }

  @Post(':id/invite')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'invite_tenant', entity: 'tenant' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Generate account invitation link/token for tenant (OWNER/MANAGER only)',
  })
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tenantService.inviteTenant(user, id);
  }
}
