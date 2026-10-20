import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UserRole } from '../../common/constants';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/rt',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization ||
        client.handshake.query?.token;

      if (!authHeader) {
        this.logger.warn(`Socket connection rejected: No token provided (${client.id})`);
        client.emit('error', { message: 'Authentication token required' });
        client.disconnect(true);
        return;
      }

      const token = typeof authHeader === 'string'
        ? authHeader.replace(/^Bearer\s+/i, '').trim()
        : '';

      const secret =
        this.config.get<string>('JWT_SECRET') ||
        'super-secret-jwt-key-for-rental-management-system-32chars';

      const payload = await this.jwtService.verifyAsync(token, { secret });
      const user: AuthenticatedUser = {
        userId: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        role: payload.role,
        tenantId: payload.tenantId,
        permissions: payload.permissions || [],
      };

      // Lưu trữ user vào socket session
      client.data.user = user;

      // Server TỰ ĐỘNG join rooms chuẩn bảo mật
      // 1. Room cá nhân user
      client.join(`user:${user.userId}`);
      this.logger.log(`Socket ${client.id} auto-joined room: user:${user.userId}`);

      // 2. Room staff nếu là OWNER/MANAGER/STAFF
      if (
        [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF].includes(user.role)
      ) {
        client.join(`org:${user.organizationId}:staff`);
        this.logger.log(`Socket ${client.id} auto-joined room: org:${user.organizationId}:staff`);
      }

      // 3. Room tenant nếu là TENANT
      if (user.role === UserRole.TENANT && user.tenantId) {
        client.join(`tenant:${user.tenantId}`);
        this.logger.log(`Socket ${client.id} auto-joined room: tenant:${user.tenantId}`);
      }

      // Room toàn bộ tổ chức cho thông báo chung
      client.join(`org:${user.organizationId}`);
    } catch (err: any) {
      this.logger.warn(`Socket authentication failed for ${client.id}: ${err.message}`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client yêu cầu join room ticket bảo trì: maint:{requestId}
   * Server kiểm tra quyền nghiêm ngặt: Chỉ staff trong org hoặc tenant sở hữu ticket mới được join!
   */
  @SubscribeMessage('join_maintenance')
  async handleJoinMaintenance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId: string },
  ) {
    const user: AuthenticatedUser = client.data?.user;
    if (!user || !data?.requestId) {
      client.emit('error', { message: 'Unauthorized or missing requestId' });
      return { status: 'denied', reason: 'unauthorized' };
    }

    const requestId = data.requestId;

    // 1. Nếu là staff trong tổ chức -> Cho phép
    if ([UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF].includes(user.role)) {
      client.join(`maint:${requestId}`);
      this.logger.log(`Staff ${user.userId} joined room maint:${requestId}`);
      return { status: 'joined', room: `maint:${requestId}` };
    }

    // 2. Nếu là TENANT -> Kiểm tra xem ticket có thuộc về tenant này không
    try {
      const ticket: any = await this.connection
        .collection('maintenance_requests')
        .findOne({ _id: requestId as any, organizationId: user.organizationId });

      if (ticket && ticket.tenantId === user.tenantId) {
        client.join(`maint:${requestId}`);
        this.logger.log(`Tenant ${user.tenantId} joined room maint:${requestId}`);
        return { status: 'joined', room: `maint:${requestId}` };
      }
    } catch (err: any) {
      this.logger.error(`Error verifying maintenance ticket ownership: ${err.message}`);
    }

    // Từ chối nếu không có quyền
    client.emit('error', { message: 'Access denied: Cannot join ticket room of another tenant' });
    return { status: 'denied', reason: 'forbidden' };
  }

  /**
   * Chặn tuyệt đối client tự ý join room của user khác
   */
  @SubscribeMessage('join_user')
  handleJoinUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const user: AuthenticatedUser = client.data?.user;
    if (!user || user.userId !== data?.userId) {
      client.emit('error', { message: 'Access denied: Cannot join room of another user' });
      return { status: 'denied', reason: 'forbidden' };
    }
    return { status: 'already_joined', room: `user:${user.userId}` };
  }

  /**
   * Event: notification.created -> emit tới room user:{userId}
   */
  emitNotificationCreated(userId: string, notification: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification.created', notification);
    }
  }

  /**
   * Event: maintenance.statusChanged -> emit tới room maint:{requestId} & staff
   */
  emitMaintenanceStatusChanged(requestId: string, payload: any, orgId?: string, tenantId?: string) {
    if (this.server) {
      this.server.to(`maint:${requestId}`).emit('maintenance.statusChanged', payload);
      if (orgId) {
        this.server.to(`org:${orgId}:staff`).emit('maintenance.statusChanged', payload);
      }
      if (tenantId) {
        this.server.to(`tenant:${tenantId}`).emit('maintenance.statusChanged', payload);
      }
    }
  }

  /**
   * Event: message.created -> emit tới room maint:{requestId}
   */
  emitMessageCreated(requestId: string, message: any) {
    if (this.server) {
      this.server.to(`maint:${requestId}`).emit('message.created', message);
    }
  }

  /**
   * Event: payment.confirmed -> emit tới user tenant & staff
   */
  emitPaymentConfirmed(tenantUserId: string, orgId: string, payment: any) {
    if (this.server) {
      if (tenantUserId) {
        this.server.to(`user:${tenantUserId}`).emit('payment.confirmed', payment);
      }
      if (orgId) {
        this.server.to(`org:${orgId}:staff`).emit('payment.confirmed', payment);
      }
    }
  }

  /**
   * Backward-compatibility helpers
   */
  emitToOrganization(organizationId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`org:${organizationId}`).emit(event, payload);
      this.server.to(`org:${organizationId}:staff`).emit(event, payload);
    }
  }

  emitToTenant(tenantId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`tenant:${tenantId}`).emit(event, payload);
    }
  }
}
