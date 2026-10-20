import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload, AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { ROLE_PERMISSIONS } from '../../common/constants';
import { MembershipRepository } from './repositories/membership.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly membershipRepo: MembershipRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_SECRET') ||
        'super-secret-jwt-key-for-rental-management-system-32chars',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Malformed token payload');
    }

    const requestedOrgId = (req.headers['x-org-id'] as string) || (req.headers['x-organization-id'] as string);

    let activeOrgId = payload.organizationId;
    let activeRole = payload.role;
    let activeTenantId = payload.tenantId;
    let activeCustomPermissions = payload.permissions || [];

    // If client provided X-Org-Id header to switch active organization context
    if (requestedOrgId && requestedOrgId !== payload.organizationId) {
      const membership = await this.membershipRepo.findByUserAndOrg(
        payload.sub,
        requestedOrgId,
      );

      if (!membership) {
        throw new ForbiddenException('User is not a member of the requested organization');
      }

      activeOrgId = requestedOrgId;
      activeRole = membership.role;
      activeTenantId = membership.tenantId?.toString();
      activeCustomPermissions = membership.permissions || [];
    }

    const basePermissions = ROLE_PERMISSIONS[activeRole] || [];
    const allPermissions = Array.from(
      new Set([...basePermissions, ...activeCustomPermissions]),
    );

    return {
      userId: payload.sub,
      email: payload.email,
      organizationId: activeOrgId,
      role: activeRole,
      tenantId: activeTenantId,
      permissions: allPermissions,
    };
  }
}
