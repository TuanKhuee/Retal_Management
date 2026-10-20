import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ServiceService } from './service.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
} from './dto/service.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  @ApiOperation({
    summary: 'List services with filters (propertyId, type, calcMethod, isActive) and pagination',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ServiceQueryDto,
  ) {
    return this.serviceService.listServices(user, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'create_service', entity: 'service' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Create a new utility/service (OWNER/MANAGER only)' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
  ) {
    return this.serviceService.createService(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service details by ID' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.serviceService.getServiceById(user, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Audit({ action: 'update_service', entity: 'service' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Update service details or unitPrice (auto-appends to priceHistory without affecting past invoices)',
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.serviceService.updateService(user, id, dto);
  }
}
