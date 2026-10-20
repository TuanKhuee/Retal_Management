import { Permission, UserRole } from '../constants';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  organizationId: string;
  role: UserRole;
  tenantId?: string;
  permissions?: Permission[];
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string;
  role: UserRole;
  tenantId?: string;
  permissions: Permission[];
}
