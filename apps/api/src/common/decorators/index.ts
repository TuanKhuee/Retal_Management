import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  BadRequestException,
} from '@nestjs/common';
import { Permission, UserRole } from '../constants';
import { AuthenticatedUser } from '../types/jwt-payload.interface';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
export const Permissions = RequirePermissions; // Alias as requested

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    if (!user) {
      return null;
    }
    return data ? user[data] : user;
  },
);

export const Org = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return user ? user.organizationId : null;
  },
);

export const CurrentOrg = Org; // Alias

export const IdempotencyKey = createParamDecorator(
  (required: boolean = true, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const key = request.headers['idempotency-key'] as string;
    if (required && (!key || key.trim() === '')) {
      throw new BadRequestException('Header "Idempotency-Key" is required for this financial transaction.');
    }
    return key;
  },
);
