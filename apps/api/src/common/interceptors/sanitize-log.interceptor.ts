import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'cccd',
  'cccdnumber',
  'idcard',
  'secret',
]);

export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

@Injectable()
export class SanitizeLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl, ip, headers } = request;
    const requestId = (headers['x-request-id'] as string) || (request as any).requestId;

    const safeBody = sanitizeObject(request.body);
    const safeQuery = sanitizeObject(request.query);

    this.logger.log(
      `[REQ] ${method} ${originalUrl} | ReqId: ${requestId || 'N/A'} | IP: ${ip} | Body: ${JSON.stringify(safeBody)} | Query: ${JSON.stringify(safeQuery)}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.log(
          `[RES] ${method} ${originalUrl} | ReqId: ${requestId || 'N/A'} | Duration: ${duration}ms`,
        );
      }),
    );
  }
}
