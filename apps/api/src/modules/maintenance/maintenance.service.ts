import { Injectable, Logger } from '@nestjs/common';
import { MaintenanceRequestRepository } from './maintenance-request.repository';
import { MaintenanceMessageRepository } from './maintenance-message.repository';
import { ContractRepository } from '../contract/contract.repository';
import { CounterRepository } from '../auth/repositories/counter.repository';
import { RealtimeGateway } from '../../infra/socket/socket.gateway';
import { FcmService } from '../../infra/fcm/fcm.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import {
  ContractStatus,
  MaintenancePriority,
  MaintenanceStatus,
  UserRole,
} from '../../common/constants';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import {
  CreateMaintenanceRequestDto,
  QueryMaintenanceRequestsDto,
} from './dto/create-maintenance.dto';
import {
  TenantActionDto,
  TransitionMaintenanceDto,
} from './dto/transition-maintenance.dto';
import {
  CreateMaintenanceMessageDto,
  QueryMaintenanceMessagesDto,
} from './dto/maintenance-message.dto';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly maintenanceRepo: MaintenanceRequestRepository,
    private readonly messageRepo: MaintenanceMessageRepository,
    private readonly contractRepo: ContractRepository,
    private readonly counterRepo: CounterRepository,
    private readonly realtime: RealtimeGateway,
    private readonly fcm: FcmService,
  ) {}

  /**
   * Helper sinh mã số phiếu bảo trì theo counters: MR-YYMM-000123
   */
  async generateRequestNumber(organizationId: string): Promise<string> {
    const now = new Date();
    const yymm = `${now.getFullYear().toString().slice(2)}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    const seq = await this.counterRepo.getNextSequence(
      `maintenance_${organizationId}_${yymm}`,
    );
    return `MR-${yymm}-${seq.toString().padStart(6, '0')}`;
  }

  /**
   * TENANT: Khởi tạo yêu cầu bảo trì.
   * Quy tắc cốt lõi: Tự gán roomId/tenantId/propertyId từ hợp đồng ACTIVE hiện hành,
   * TUYỆT ĐỐI không nhận roomId/tenantId từ client body.
   */
  async createRequest(
    user: AuthenticatedUser,
    dto: CreateMaintenanceRequestDto,
  ) {
    if (!user.tenantId) {
      throw new BusinessRuleViolationException(
        'User is not associated with any tenant profile.',
      );
    }

    // Tìm hợp đồng ACTIVE hiện hành của người thuê
    const contracts = await this.contractRepo.findActiveContractsByTenant(
      user.organizationId,
      user.tenantId,
    );
    const activeContract = contracts.find((c) => c.status === ContractStatus.ACTIVE);

    if (!activeContract) {
      throw new BusinessRuleViolationException(
        'Tenant does not have an active rental contract to file a maintenance request.',
      );
    }

    const requestNo = await this.generateRequestNumber(user.organizationId);

    const ticket = await this.maintenanceRepo.create(user.organizationId, {
      requestNo,
      propertyId: activeContract.propertyId.toString(),
      roomId: activeContract.roomId.toString(),
      tenantId: user.tenantId,
      createdBy: user.userId,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || MaintenancePriority.NORMAL,
      status: MaintenanceStatus.NEW,
      statusHistory: [
        {
          from: 'INITIAL',
          to: MaintenanceStatus.NEW,
          note: 'Tạo mới phiếu yêu cầu bảo trì',
          changedBy: user.userId,
          changedAt: new Date(),
        },
      ],
      attachmentIds: dto.attachmentIds || [],
      unreadByOwner: true,
      unreadByTenant: false,
    });

    // Bắn event realtime & notification
    this.realtime.emitToOrganization(user.organizationId, 'maintenance.created', {
      requestId: ticket._id.toString(),
      requestNo: ticket.requestNo,
      category: ticket.category,
      roomId: ticket.roomId,
    });

    await this.fcm.sendPushNotification({
      title: `Yêu cầu bảo trì mới: ${ticket.requestNo}`,
      body: `${ticket.title} (Phòng ${ticket.roomId})`,
      topic: `org_${user.organizationId}_owners`,
    });

    return ticket;
  }

  /**
   * Lấy danh sách phiếu bảo trì:
   * - OWNER/STAFF: xem tất cả, lọc status/priority/category/roomId
   * - TENANT: CHỈ xem các phiếu của chính mình
   */
  async listRequests(
    user: AuthenticatedUser,
    query: QueryMaintenanceRequestsDto,
  ) {
    const filter: Record<string, any> = {};

    if (user.role === UserRole.TENANT) {
      if (!user.tenantId) {
        return [];
      }
      filter.tenantId = user.tenantId;
    } else {
      if (query.roomId) filter.roomId = query.roomId;
    }

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;

    return this.maintenanceRepo.findWithFilters(user.organizationId, filter);
  }

  /**
   * Lấy chi tiết phiếu bảo trì:
   * - TENANT chỉ xem phiếu của mình (truy cập chéo trả về 404 Not Found)
   */
  async getRequestById(user: AuthenticatedUser, id: string) {
    const ticket = await this.maintenanceRepo.findById(user.organizationId, id);
    if (!ticket) {
      throw new ResourceNotFoundException('Maintenance request');
    }

    if (user.role === UserRole.TENANT && ticket.tenantId !== user.tenantId) {
      throw new ResourceNotFoundException('Maintenance request');
    }

    return ticket;
  }

  /**
   * OWNER/STAFF: Chuyển trạng thái bảo trì
   * Allowed targets: ACCEPTED, IN_PROGRESS, RESOLVED, REJECTED
   * State Machine:
   *   NEW -> ACCEPTED
   *   NEW -> REJECTED
   *   ACCEPTED -> IN_PROGRESS
   *   REOPENED -> IN_PROGRESS
   *   IN_PROGRESS -> RESOLVED
   * Chuyển trạng thái sai -> ném 422 Unprocessable Entity
   */
  async transitionStatus(
    user: AuthenticatedUser,
    id: string,
    dto: TransitionMaintenanceDto,
  ) {
    const ticket = await this.maintenanceRepo.findById(user.organizationId, id);
    if (!ticket) {
      throw new ResourceNotFoundException('Maintenance request');
    }

    const currentStatus = ticket.status;
    const targetStatus = dto.to;

    const isValidTransition =
      (currentStatus === MaintenanceStatus.NEW &&
        (targetStatus === MaintenanceStatus.ACCEPTED ||
          targetStatus === MaintenanceStatus.REJECTED)) ||
      (currentStatus === MaintenanceStatus.ACCEPTED &&
        targetStatus === MaintenanceStatus.IN_PROGRESS) ||
      (currentStatus === MaintenanceStatus.REOPENED &&
        targetStatus === MaintenanceStatus.IN_PROGRESS) ||
      (currentStatus === MaintenanceStatus.IN_PROGRESS &&
        targetStatus === MaintenanceStatus.RESOLVED);

    if (!isValidTransition) {
      throw new BusinessRuleViolationException(
        `Invalid state transition from '${currentStatus}' to '${targetStatus}'.`,
      );
    }

    ticket.status = targetStatus;
    if (dto.cost) {
      ticket.cost = dto.cost;
    }

    ticket.statusHistory.push({
      from: currentStatus,
      to: targetStatus,
      note: dto.note,
      changedBy: user.userId,
      changedAt: new Date(),
      cost: dto.cost,
    });

    ticket.unreadByTenant = true;
    await ticket.save();

    // Bắn event realtime & notification
    this.realtime.emitToOrganization(user.organizationId, 'maintenance.status_changed', {
      requestId: ticket._id.toString(),
      requestNo: ticket.requestNo,
      status: targetStatus,
    });
    this.realtime.emitToTenant(ticket.tenantId, 'maintenance.status_changed', {
      requestId: ticket._id.toString(),
      requestNo: ticket.requestNo,
      status: targetStatus,
    });

    await this.fcm.sendPushNotification({
      title: `Trạng thái bảo trì: ${ticket.requestNo}`,
      body: `Đã chuyển sang ${targetStatus}: ${dto.note || ''}`,
      topic: `tenant_${ticket.tenantId}`,
    });

    return ticket;
  }

  /**
   * TENANT: Xác nhận hoàn thành
   * State machine: RESOLVED -> CONFIRMED
   */
  async confirmRequest(
    user: AuthenticatedUser,
    id: string,
    dto?: TenantActionDto,
  ) {
    const ticket = await this.getRequestById(user, id);

    if (ticket.status !== MaintenanceStatus.RESOLVED) {
      throw new BusinessRuleViolationException(
        `Cannot confirm maintenance request in status '${ticket.status}'. Ticket must be RESOLVED first.`,
      );
    }

    const fromStatus = ticket.status;
    ticket.status = MaintenanceStatus.CONFIRMED;
    ticket.statusHistory.push({
      from: fromStatus,
      to: MaintenanceStatus.CONFIRMED,
      note: dto?.note || 'Người thuê xác nhận đã sửa chữa xong',
      changedBy: user.userId,
      changedAt: new Date(),
    });

    ticket.unreadByOwner = true;
    await ticket.save();

    this.realtime.emitToOrganization(user.organizationId, 'maintenance.status_changed', {
      requestId: ticket._id.toString(),
      requestNo: ticket.requestNo,
      status: MaintenanceStatus.CONFIRMED,
    });

    return ticket;
  }

  /**
   * TENANT: Mở lại phiếu khi xử lý chưa đạt
   * State machine: RESOLVED -> REOPENED
   */
  async reopenRequest(
    user: AuthenticatedUser,
    id: string,
    dto?: TenantActionDto,
  ) {
    const ticket = await this.getRequestById(user, id);

    if (ticket.status !== MaintenanceStatus.RESOLVED) {
      throw new BusinessRuleViolationException(
        `Cannot reopen maintenance request in status '${ticket.status}'. Ticket must be RESOLVED to reopen.`,
      );
    }

    const fromStatus = ticket.status;
    ticket.status = MaintenanceStatus.REOPENED;
    ticket.statusHistory.push({
      from: fromStatus,
      to: MaintenanceStatus.REOPENED,
      note: dto?.note || 'Người thuê yêu cầu kiểm tra/sửa lại',
      changedBy: user.userId,
      changedAt: new Date(),
    });

    ticket.unreadByOwner = true;
    await ticket.save();

    this.realtime.emitToOrganization(user.organizationId, 'maintenance.status_changed', {
      requestId: ticket._id.toString(),
      requestNo: ticket.requestNo,
      status: MaintenanceStatus.REOPENED,
    });

    return ticket;
  }

  /**
   * TENANT: Hủy phiếu bảo trì
   * State machine: NEW / ACCEPTED -> CANCELLED
   */
  async cancelRequest(
    user: AuthenticatedUser,
    id: string,
    dto?: TenantActionDto,
  ) {
    const ticket = await this.getRequestById(user, id);

    if (
      ticket.status !== MaintenanceStatus.NEW &&
      ticket.status !== MaintenanceStatus.ACCEPTED
    ) {
      throw new BusinessRuleViolationException(
        `Cannot cancel maintenance request in status '${ticket.status}'. Only NEW or ACCEPTED tickets can be cancelled.`,
      );
    }

    const fromStatus = ticket.status;
    ticket.status = MaintenanceStatus.CANCELLED;
    ticket.statusHistory.push({
      from: fromStatus,
      to: MaintenanceStatus.CANCELLED,
      note: dto?.note || 'Người thuê đã hủy yêu cầu',
      changedBy: user.userId,
      changedAt: new Date(),
    });

    ticket.unreadByOwner = true;
    await ticket.save();

    this.realtime.emitToOrganization(user.organizationId, 'maintenance.status_changed', {
      requestId: ticket._id.toString(),
      requestNo: ticket.requestNo,
      status: MaintenanceStatus.CANCELLED,
    });

    return ticket;
  }

  /**
   * Messages: Lấy danh sách tin nhắn theo cursor pagination.
   * Chỉ người tham gia ticket mới được đọc tin nhắn.
   */
  async listMessages(
    user: AuthenticatedUser,
    requestId: string,
    query: QueryMaintenanceMessagesDto,
  ) {
    // Kiểm tra quyền tham gia ticket
    await this.getRequestById(user, requestId);

    return this.messageRepo.findMessagesCursor(
      user.organizationId,
      requestId,
      query.limit || 20,
      query.cursor,
    );
  }

  /**
   * Messages: Gửi tin nhắn mới.
   * Chỉ người tham gia ticket mới được gửi tin nhắn.
   */
  async sendMessage(
    user: AuthenticatedUser,
    requestId: string,
    dto: CreateMaintenanceMessageDto,
  ) {
    // Kiểm tra quyền tham gia ticket
    const ticket = await this.getRequestById(user, requestId);

    const message = await this.messageRepo.create(user.organizationId, {
      requestId,
      senderId: user.userId,
      senderRole: user.role,
      senderName: user.email || user.role,
      content: dto.content,
      attachmentIds: dto.attachmentIds || [],
    });

    if (user.role === UserRole.TENANT) {
      ticket.unreadByOwner = true;
    } else {
      ticket.unreadByTenant = true;
    }
    await ticket.save();

    // Phát sự kiện realtime
    this.realtime.emitToOrganization(user.organizationId, 'maintenance.message_created', {
      requestId,
      message,
    });
    this.realtime.emitToTenant(ticket.tenantId, 'maintenance.message_created', {
      requestId,
      message,
    });

    return message;
  }

  /**
   * Messages: Đánh dấu đã đọc tin nhắn
   */
  async markMessagesRead(user: AuthenticatedUser, requestId: string) {
    const ticket = await this.getRequestById(user, requestId);

    if (user.role === UserRole.TENANT) {
      ticket.unreadByTenant = false;
    } else {
      ticket.unreadByOwner = false;
    }
    await ticket.save();

    return { success: true };
  }
}
