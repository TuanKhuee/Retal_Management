import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from './repositories/user.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { RefreshSessionRepository } from './repositories/refresh-session.repository';
import { DeviceTokenRepository } from './repositories/device-token.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { withTransaction } from '../../infra/mongo/transaction.helper';
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
} from './dto/auth.dto';
import { UserRole, ROLE_PERMISSIONS } from '../../common/constants';
import { JwtPayload } from '../../common/types/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly userRepo: UserRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly sessionRepo: RefreshSessionRepository,
    private readonly deviceRepo: DeviceTokenRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Hashes string using SHA-256 for token indexing
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Register OWNER: creates User + Organization + Membership OWNER in 1 transaction
   */
  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.phone) {
      const existingPhone = await this.userRepo.findByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Hash password with argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    return withTransaction(this.connection, async (session) => {
      // 1. Create User
      const user = await this.userRepo.create(
        {
          email: dto.email,
          phone: dto.phone,
          fullName: dto.fullName,
          passwordHash,
          isActive: true,
        },
        session || undefined,
      );

      // 2. Create Organization
      const org = await this.orgRepo.create(
        {
          name: dto.organizationName,
          ownerId: user._id.toString(),
          phone: dto.phone,
          settings: {
            invoiceDueDays: 5,
            billingClosingDay: 30,
            roundingStep: 1000,
            timezone: 'Asia/Ho_Chi_Minh',
            currency: 'VND',
            lateFeePercentage: 0,
          },
        },
        session || undefined,
      );

      // 3. Create OWNER Membership
      await this.membershipRepo.create(
        {
          userId: user._id.toString(),
          organizationId: org._id.toString(),
          role: UserRole.OWNER,
          propertyIds: [],
          permissions: ROLE_PERMISSIONS[UserRole.OWNER],
        },
        session || undefined,
      );

      // 4. Issue Tokens with initial familyId
      const familyId = uuidv4();
      const deviceId = dto.deviceId || uuidv4();

      const tokens = await this.issueTokens(
        user._id.toString(),
        user.email!,
        org._id.toString(),
        UserRole.OWNER,
        familyId,
        deviceId,
      );

      return {
        ...tokens,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          organizationId: org._id,
          role: UserRole.OWNER,
        },
      };
    });
  }

  /**
   * Login with email or phone + password (argon2id) + lockout after 5 consecutive failures
   */
  async login(dto: LoginDto, requestedOrgId?: string) {
    const user = await this.userRepo.findByIdentifier(dto.identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    // Check temporary lockout
    const now = new Date();
    if (
      user.failedLoginAttempts >= 5 &&
      user.lockUntil &&
      user.lockUntil > now
    ) {
      const remainingMinutes = Math.ceil(
        (user.lockUntil.getTime() - now.getTime()) / 60000,
      );
      throw new UnauthorizedException(
        `Account temporarily locked due to 5 failed attempts. Please retry in ${remainingMinutes} minute(s).`,
      );
    }

    // Verify password with argon2
    let isValidPassword = false;
    try {
      isValidPassword = await argon2.verify(user.passwordHash, dto.password);
    } catch {
      isValidPassword = false;
    }

    if (!isValidPassword) {
      const lockUntil =
        user.failedLoginAttempts + 1 >= 5
          ? new Date(Date.now() + 15 * 60 * 1000) // 15 mins lock
          : undefined;

      await this.userRepo.incrementFailedAttempts(user._id.toString(), lockUntil);

      if (lockUntil) {
        throw new UnauthorizedException(
          'Account temporarily locked for 15 minutes due to 5 failed attempts.',
        );
      }
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    // Reset failed login counter on success
    await this.userRepo.resetFailedAttempts(user._id.toString());

    // Resolve active membership & organization
    let membership = requestedOrgId
      ? await this.membershipRepo.findByUserAndOrg(user._id.toString(), requestedOrgId)
      : await this.membershipRepo.findFirstByUserId(user._id.toString());

    if (!membership) {
      throw new ForbiddenException('User is not associated with any organization');
    }

    const rawOrg = membership.organizationId as any;
    const orgIdStr = rawOrg?._id ? rawOrg._id.toString() : String(membership.organizationId);

    const familyId = uuidv4();
    const deviceId = dto.deviceId || uuidv4();

    const tokens = await this.issueTokens(
      user._id.toString(),
      user.email || '',
      orgIdStr,
      membership.role,
      familyId,
      deviceId,
      membership.tenantId?.toString(),
      membership.permissions,
    );

    return {
      ...tokens,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        organizationId: orgIdStr,
        role: membership.role,
        tenantId: membership.tenantId,
      },
      organization: rawOrg?._id
        ? {
            _id: orgIdStr,
            name: rawOrg.name,
            code: rawOrg.code,
          }
        : undefined,
    };
  }

  /**
   * Token Refresh Rotation with REUSE DETECTION (revokes entire familyId if reused)
   */
  async refresh(dto: RefreshTokenDto) {
    const incomingTokenHash = this.hashToken(dto.refreshToken);
    const session = await this.sessionRepo.findByTokenHash(incomingTokenHash);

    // 1. REUSE DETECTION: If token has already been revoked or replaced
    if (session && (session.revokedAt || session.replacedBy)) {
      this.logger.warn(
        `[SECURITY ALERT] Refresh token reuse detected for familyId: ${session.familyId}! Revoking entire session chain.`,
      );
      await this.sessionRepo.revokeEntireFamily(session.familyId);
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions in this chain have been revoked.',
      );
    }

    // 2. Validate token JWT signature
    let decoded: JwtPayload;
    try {
      const refreshSecret =
        this.config.get<string>('JWT_REFRESH_SECRET') ||
        'super-secret-refresh-key-for-rental-management-system-32';
      decoded = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 3. If session does not exist in DB (e.g. wiped or invalid)
    if (!session) {
      throw new UnauthorizedException('Session not found or already terminated');
    }

    // 4. Verify user & membership are still active
    const membership = await this.membershipRepo.findByUserAndOrg(
      session.userId,
      session.organizationId,
    );
    if (!membership) {
      throw new UnauthorizedException('Organization membership revoked');
    }

    // 5. Generate NEW token pair within same familyId (ROTATION)
    const deviceId = dto.deviceId || session.deviceId;
    const tokens = await this.issueTokens(
      session.userId,
      decoded.email,
      session.organizationId,
      membership.role,
      session.familyId, // Retain familyId chain
      deviceId,
      membership.tenantId?.toString(),
      membership.permissions,
    );

    // 6. Invalidate old session and link to new token hash
    const newHash = this.hashToken(tokens.refreshToken);
    await this.sessionRepo.revokeSession(session._id.toString(), newHash);

    return tokens;
  }

  /**
   * Logout (?all=true)
   */
  async logout(userId: string, deviceId?: string, all = false) {
    if (all) {
      const count = await this.sessionRepo.revokeAllForUser(userId);
      return { message: `Logged out from all devices (${count} sessions revoked)` };
    }
    if (deviceId) {
      await this.deviceRepo.removeDeviceToken(userId, deviceId);
    }
    await this.sessionRepo.revokeAllForUser(userId);
    return { message: 'Logged out successfully' };
  }

  /**
   * Change password (argon2id) + revoke all sessions
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    const isValid = await argon2.verify(user.passwordHash, dto.oldPassword);
    if (!isValid) {
      throw new UnauthorizedException('Current password does not match');
    }

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.userRepo.updatePassword(userId, newHash);
    await this.sessionRepo.revokeAllForUser(userId); // Revoke all active sessions

    return { message: 'Password changed successfully. Please re-login on your devices.' };
  }

  /**
   * Forgot password: generates 6-digit OTP (15 mins TTL)
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findByIdentifier(dto.identifier);
    if (!user) {
      return {
        message: 'Nếu số điện thoại/email tồn tại, mã xác thực OTP đã được tạo.',
        resetToken: '842910',
        otp: '842910',
      };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = this.hashToken(otp);
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.userRepo.setResetToken(user._id.toString(), tokenHash, expires);

    return {
      message: 'Mã xác thực OTP đã được gửi đến số điện thoại của bạn.',
      resetToken: otp,
      otp,
      phone: user.phone,
    };
  }

  /**
   * Verify OTP code before password reset step
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findByIdentifier(dto.identifier);
    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại trên hệ thống.');
    }

    const tokenHash = this.hashToken(dto.otp);
    if (
      !user.passwordResetTokenHash ||
      user.passwordResetTokenHash !== tokenHash ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Mã xác thực OTP không chính xác hoặc đã hết hạn.');
    }

    return {
      valid: true,
      message: 'Xác thực mã OTP thành công.',
    };
  }

  /**
   * Reset password with reset token or OTP
   */
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const user = await this.userRepo.findByResetToken(tokenHash);

    if (!user) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn.');
    }

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.userRepo.updatePassword(user._id.toString(), newHash);
    await this.sessionRepo.revokeAllForUser(user._id.toString());

    return { message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.' };
  }

  /**
   * Accept invite for TENANT: sets password, creates/links user, activates TENANT membership
   */
  async acceptInvite(dto: AcceptInviteDto) {
    const tokenHash = this.hashToken(dto.token);
    const user = await this.userRepo.findByInviteToken(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    await this.userRepo.updatePassword(user._id.toString(), passwordHash);
    if (dto.fullName) {
      await this.userRepo.updateProfile(user._id.toString(), { fullName: dto.fullName });
    }

    const membership = await this.membershipRepo.findFirstByUserId(user._id.toString());
    if (!membership) {
      throw new BadRequestException('Tenant membership not found');
    }

    const familyId = uuidv4();
    const deviceId = uuidv4();

    return this.issueTokens(
      user._id.toString(),
      user.email || '',
      membership.organizationId.toString(),
      membership.role,
      familyId,
      deviceId,
      membership.tenantId?.toString(),
      membership.permissions,
    );
  }

  /**
   * Helper for owner/system to generate an invitation for a tenant
   */
  async createTenantInvitation(email: string, phone: string, fullName: string, organizationId: string, tenantId: string) {
    let user = await this.userRepo.findByIdentifier(email || phone);
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(inviteToken);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (!user) {
      // Create stub user with unusable temp password
      const tempHash = await argon2.hash(uuidv4(), { type: argon2.argon2id });
      user = await this.userRepo.create({
        email,
        phone,
        fullName,
        passwordHash: tempHash,
        inviteTokenHash: tokenHash,
        inviteTokenExpires: expires,
      });
    } else {
      await this.userRepo.setInviteToken(user._id.toString(), tokenHash, expires);
    }

    // Attach TENANT membership
    let membership = await this.membershipRepo.findByUserAndOrg(user._id.toString(), organizationId);
    if (!membership) {
      await this.membershipRepo.create({
        userId: user._id.toString(),
        organizationId,
        role: UserRole.TENANT,
        tenantId,
        propertyIds: [],
        permissions: ROLE_PERMISSIONS[UserRole.TENANT],
      });
    }

    return { inviteToken };
  }

  /**
   * GET /me with list of all memberships
   */
  async getMe(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    const memberships = await this.membershipRepo.findByUserId(userId);

    return {
      id: user._id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      memberships: memberships.map((m) => ({
        organizationId: (m.organizationId as any)?._id || m.organizationId,
        organizationName: (m.organizationId as any)?.name || 'Rental Org',
        role: m.role,
        tenantId: m.tenantId,
        propertyIds: m.propertyIds,
        permissions: m.permissions,
      })),
    };
  }

  /**
   * PATCH /me
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.userRepo.updateProfile(userId, dto);
    if (!updated) throw new BadRequestException('User not found');
    return {
      id: updated._id,
      email: updated.email,
      phone: updated.phone,
      fullName: updated.fullName,
    };
  }

  /**
   * Devices: register FCM token
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto, organizationId?: string) {
    return this.deviceRepo.upsertDeviceToken(
      userId,
      dto.deviceId,
      dto.fcmToken,
      dto.platform,
      organizationId,
    );
  }

  /**
   * Devices: remove FCM token
   */
  async removeDevice(userId: string, deviceId: string) {
    const removed = await this.deviceRepo.removeDeviceToken(userId, deviceId);
    return { success: removed };
  }

  /**
   * Issues Access Token (15 min) + Refresh Token (30 days) and saves RefreshSession
   */
  private async issueTokens(
    userId: string,
    email: string,
    organizationId: string,
    role: UserRole,
    familyId: string,
    deviceId: string,
    tenantId?: string,
    permissions?: any[],
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      organizationId,
      role,
      tenantId,
      permissions,
    };

    const jwtSecret =
      this.config.get<string>('JWT_SECRET') ||
      'super-secret-jwt-key-for-rental-management-system-32chars';
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      'super-secret-refresh-key-for-rental-management-system-32';

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId, email, familyId, deviceId },
      {
        secret: refreshSecret,
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      },
    );

    // Save refresh session in DB (30 days TTL)
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.sessionRepo.create({
      tokenHash,
      familyId,
      userId,
      organizationId,
      deviceId,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins (seconds)
    };
  }
}
