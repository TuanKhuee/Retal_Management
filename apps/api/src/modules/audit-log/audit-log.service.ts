import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogPayload, IAuditLogService } from '../../common/interceptors/audit-log.interceptor';
import { AuditLogDocument } from './schemas/audit-log.schema';

export interface QueryAuditLogsDto {
  entity?: string;
  entityName?: string;
  actor?: string;
  actorId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class AuditLogService implements IAuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepo: AuditLogRepository) {}

  async recordLog(payload: AuditLogPayload): Promise<void> {
    try {
      await this.auditLogRepo.create(payload.organizationId, payload as any);
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
    }
  }

  async getLogs(
    organizationId: string,
    query: QueryAuditLogsDto,
  ) {
    const filter: any = {};
    const entity = query.entity || query.entityName;
    const actor = query.actor || query.actorId;

    if (entity) filter.entityName = entity;
    if (actor) filter.actorId = actor;

    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) filter.timestamp.$gte = new Date(query.from);
      if (query.to) filter.timestamp.$lte = new Date(query.to);
    }

    // Nếu có cursor hoặc không truyền page -> dùng cursor pagination
    if (query.cursor !== undefined || !query.page) {
      return this.auditLogRepo.findAuditLogsCursor(
        organizationId,
        filter,
        query.limit || 20,
        query.cursor,
      );
    }

    // Tương thích ngược với page-based pagination
    return this.auditLogRepo.findPaginated(
      organizationId,
      filter,
      query.page || 1,
      query.limit || 20,
      { timestamp: -1 },
    );
  }
}
