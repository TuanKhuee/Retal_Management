import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OrganizationService } from '../organization/organization.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
  AcceptInviteDto,
  UpdateProfileDto,
  RegisterDeviceDto,
  UpdateOrgSettingsDto,
} from './dto/auth.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Public, Roles, Org } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { UserRole } from '../../common/constants';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('Auth & Identity')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly orgService: OrganizationService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register OWNER: Creates User + Organization + OWNER Membership in 1 transaction',
  })
  @ApiResponse({ status: 201, description: 'Owner registered successfully with tokens' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email/phone + password (argon2id; temporary lock after 5 failed attempts)',
  })
  @ApiHeader({
    name: 'X-Org-Id',
    required: false,
    description: 'Select active organization context if user has multiple memberships',
  })
  @ApiResponse({ status: 200, description: 'Logged in successfully with tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account temporarily locked' })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-org-id') requestedOrgId?: string,
  ) {
    return this.authService.login(dto, requestedOrgId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token with rotation & reuse detection (revokes entire family if reused)',
  })
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid, expired, or reused refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from current device or all devices' })
  @ApiQuery({ name: 'all', required: false, type: Boolean, description: 'Pass true to revoke all devices' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Query('all') all?: string,
    @Body('deviceId') deviceId?: string,
  ) {
    return this.authService.logout(user.userId, deviceId, all === 'true');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password with argon2id and revoke all sessions' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate password reset token or 6-digit OTP' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code before password reset' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using valid reset token or OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'TENANT accepts invite token, sets password, and activates TENANT membership',
  })
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }
}

@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile with all organization memberships' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update profile details (fullName, phone)' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.userId, dto);
  }

  @Post('devices')
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.authService.registerDevice(user.userId, dto, user.organizationId);
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Unregister FCM device token' })
  async removeDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deviceId') deviceId: string,
  ) {
    return this.authService.removeDevice(user.userId, deviceId);
  }
}

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organization')
export class OrgController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'Get organization details and settings' })
  async getOrg(@Org() orgId: string) {
    return this.orgService.getOrganization(orgId);
  }

  @Patch()
  @Roles(UserRole.OWNER)
  @Audit({ action: 'update_org_settings', entity: 'organization' })
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Update organization settings (OWNER only: invoiceDueDays, billingClosingDay, roundingStep, timezone)',
  })
  async updateOrg(
    @Org() orgId: string,
    @Body() dto: UpdateOrgSettingsDto,
  ) {
    return this.orgService.updateSettings(orgId, dto);
  }
}
