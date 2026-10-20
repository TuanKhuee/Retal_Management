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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { PaginationQueryDto } from '../../common/utils/pagination.util';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'List all properties with pagination' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.propertyService.listProperties(user, query.page, query.limit);
  }

  @Post()
  @Roles(UserRole.OWNER)
  @Audit({ action: 'create_property', entity: 'property' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Create a new property with bankAccount and billingConfig (OWNER only)' })
  @ApiResponse({ status: 201, description: 'Property created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertyService.createProperty(user, dto);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get property by ID' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.propertyService.getPropertyById(user, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  @Audit({ action: 'update_property', entity: 'property' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Update property details (OWNER only)' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.updateProperty(user, id, dto);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.OWNER)
  @Audit({ action: 'deactivate_property', entity: 'property' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Deactivate property (OWNER only)' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.propertyService.deactivateProperty(user, id);
  }

  @Get(':id/dashboard')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get property dashboard (tổng phòng, đang thuê, trống, công nợ, doanh thu kỳ hiện tại)',
  })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.propertyService.getPropertyDashboard(user, id);
  }
}
