import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../constants';
import { AuthenticatedUser } from '../types/jwt-payload.interface';
import { ResourceNotFoundException } from '../exceptions';

export const OWNERSHIP_PARAM_KEY = 'ownership_param_key';
export const CheckOwnership = (paramName: string = 'id') =>
  Reflector.createDecorator<string>()(paramName);

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return true; // Let JwtAuthGuard handle unauthenticated
    }

    const { params, query } = request;

    // Check organization isolation: if organizationId is in params or query, it must match user's organizationId
    const targetOrgId = params?.organizationId || query?.organizationId;
    if (targetOrgId && targetOrgId !== user.organizationId) {
      throw new ResourceNotFoundException('Organization');
    }

    // Tenant ownership check: if user is TENANT, they cannot access other tenant resources
    if (user.role === UserRole.TENANT) {
      // Check tenantId in route params
      if (params?.tenantId && params.tenantId !== user.tenantId) {
        throw new ResourceNotFoundException('Tenant');
      }

      // Check if accessing /tenants/:id directly
      if (
        request.baseUrl?.includes('/tenants') &&
        params?.id &&
        params.id !== user.tenantId
      ) {
        throw new ResourceNotFoundException('Tenant');
      }
    }

    return true;
  }
}
