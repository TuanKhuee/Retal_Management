import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_METADATA_KEY, AuditOptions } from '../decorators/audit.decorator';
import { AuthenticatedUser } from '../types/jwt-payload.interface';
import { sanitizeObject } from './sanitize-log.interceptor';

export interface AuditLogPayload {
  organizationId: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityName: string;
  entityId?: string;
  beforeState?: any;
  afterState?: any;
  ip: string;
  userAgent: string;
  requestId: string;
  timestamp: Date;
}

export interface IAuditLogService {
  recordLog(payload: AuditLogPayload): Promise<void>;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private auditLogService?: IAuditLogService;

  constructor(private readonly reflector: Reflector) {}

  setAuditLogService(service: IAuditLogService) {
    this.auditLogService = service;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.getAllAndOverride<AuditOptions>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    const requestId =
      (request.headers['x-request-id'] as string) ||
      request.requestId ||
      'unknown';

    const beforeState = sanitizeObject(request.body);

    return next.handle().pipe(
      tap(async (response) => {
        if (!this.auditLogService || !user) return;

        const entityId =
          response?.data?._id ||
          response?.data?.id ||
          request.params?.id ||
          request.params?.roomId ||
          request.params?.contractId ||
          undefined;

        const afterState = sanitizeObject(response?.data || response);

        try {
          await this.auditLogService.recordLog({
            organizationId: user.organizationId,
            actorId: user.userId,
            actorRole: user.role,
            action: auditOptions.action,
            entityName: auditOptions.entity,
            entityId: entityId ? String(entityId) : undefined,
            beforeState,
            afterState,
            ip,
            userAgent,
            requestId,
            timestamp: new Date(),
          });
        } catch {
          // Audit log failure should not break primary operation, but is logged
        }
      }),
    );
  }
}
