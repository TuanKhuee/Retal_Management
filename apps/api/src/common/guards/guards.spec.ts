import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permission, UserRole } from '../constants';

describe('Guards', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('RolesGuard', () => {
    it('should allow access if no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const guard = new RolesGuard(reflector);

      const context = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.TENANT } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER, UserRole.MANAGER]);
      const guard = new RolesGuard(reflector);

      const context = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.OWNER } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user lacks required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER]);
      const guard = new RolesGuard(reflector);

      const context = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.TENANT } }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('PermissionsGuard', () => {
    it('should allow access if user has required permissions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.CONTRACT_READ]);
      const guard = new PermissionsGuard(reflector);

      const context = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: { permissions: [Permission.CONTRACT_READ, Permission.INVOICE_READ] },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user lacks any required permission', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Permission.CONTRACT_CREATE,
        Permission.CONTRACT_TERMINATE,
      ]);
      const guard = new PermissionsGuard(reflector);

      const context = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: { permissions: [Permission.CONTRACT_CREATE] },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
