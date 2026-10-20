import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ExportReportDto, ReportFilterDto } from './dto/report.dto';
import { ReportExportJob } from '../../jobs/report-export.job';
import { NotificationService } from '../notification/notification.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import {
  InvoiceStatus,
  NotificationType,
  RoomStatus,
} from '../../common/constants';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly reportExportJob: ReportExportJob,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * GET /reports/revenue: Doanh thu theo thời gian, kỳ, cơ sở, loại dịch vụ
   */
  async getRevenueReport(organizationId: string, filter: ReportFilterDto) {
    const match: any = {
      organizationId,
      active: true,
      status: { $ne: InvoiceStatus.CANCELLED },
    };

    if (filter.propertyId) {
      match.propertyId = new Types.ObjectId(filter.propertyId);
    }
    if (filter.period) {
      match.billingPeriodId = filter.period;
    }
    if (filter.from || filter.to) {
      match.createdAt = {};
      if (filter.from) match.createdAt.$gte = new Date(filter.from);
      if (filter.to) match.createdAt.$lte = new Date(filter.to);
    }

    // 1. Tổng hợp doanh thu chung
    const summaryAgg = await this.connection
      .collection('invoices')
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$totalAmount' },
            totalCollected: { $sum: '$paidAmount' },
            totalRemaining: { $sum: '$remainingAmount' },
            invoiceCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const summary = summaryAgg[0] || {
      totalBilled: 0,
      totalCollected: 0,
      totalRemaining: 0,
      invoiceCount: 0,
    };

    // 2. Chi tiết theo loại dịch vụ / phí (items.type)
    const byTypeAgg = await this.connection
      .collection('invoices')
      .aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.type',
            totalAmount: { $sum: '$items.amount' },
            itemCount: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ])
      .toArray();

    return {
      summary: {
        totalBilled: summary.totalBilled,
        totalCollected: summary.totalCollected,
        totalRemaining: summary.totalRemaining,
        collectionRate:
          summary.totalBilled > 0
            ? Math.round((summary.totalCollected / summary.totalBilled) * 10000) / 100
            : 0,
        invoiceCount: summary.invoiceCount,
      },
      revenueByType: byTypeAgg.map((item) => ({
        type: item._id,
        amount: item.totalAmount,
        count: item.itemCount,
      })),
    };
  }

  /**
   * GET /reports/debt: Phân tích công nợ theo aging buckets (1-7, 8-30, >30 ngày)
   */
  async getDebtReport(organizationId: string, filter: ReportFilterDto) {
    const match: any = {
      organizationId,
      active: true,
      remainingAmount: { $gt: 0 },
      status: { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
    };

    if (filter.propertyId) {
      match.propertyId = new Types.ObjectId(filter.propertyId);
    }

    const invoices: any[] = await this.connection
      .collection('invoices')
      .find(match)
      .toArray();

    const now = new Date();
    const buckets = {
      current: 0, // Chưa quá hạn
      days1To7: 0,
      days8To30: 0,
      over30Days: 0,
    };

    let totalDebt = 0;
    const roomDebtsMap = new Map<string, number>();

    for (const inv of invoices) {
      const remaining = inv.remainingAmount || 0;
      totalDebt += remaining;

      const roomId = inv.roomId ? inv.roomId.toString() : 'unknown';
      roomDebtsMap.set(roomId, (roomDebtsMap.get(roomId) || 0) + remaining);

      const dueDate = new Date(inv.dueDate);
      if (dueDate >= now) {
        buckets.current += remaining;
      } else {
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
        if (daysOverdue <= 7) {
          buckets.days1To7 += remaining;
        } else if (daysOverdue <= 30) {
          buckets.days8To30 += remaining;
        } else {
          buckets.over30Days += remaining;
        }
      }
    }

    return {
      totalDebt,
      invoiceCount: invoices.length,
      agingBuckets: buckets,
      roomDebts: Array.from(roomDebtsMap.entries()).map(([roomId, amount]) => ({
        roomId,
        amount,
      })),
    };
  }

  /**
   * GET /reports/occupancy: Tỷ lệ lấp đầy phòng (Occupancy Rate)
   */
  async getOccupancyReport(organizationId: string, filter: ReportFilterDto) {
    const match: any = {
      organizationId,
      deletedAt: null,
    };

    if (filter.propertyId) {
      match.propertyId = new Types.ObjectId(filter.propertyId);
    }

    const roomsAgg = await this.connection
      .collection('rooms')
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const counts: Record<string, number> = {
      [RoomStatus.OCCUPIED]: 0,
      [RoomStatus.VACANT]: 0,
      [RoomStatus.MAINTENANCE]: 0,
      [RoomStatus.RESERVED]: 0,
    };

    let totalRooms = 0;
    for (const r of roomsAgg) {
      if (counts[r._id] !== undefined) {
        counts[r._id] = r.count;
      }
      totalRooms += r.count;
    }

    const occupied = counts[RoomStatus.OCCUPIED] || 0;
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupied / totalRooms) * 10000) / 100 : 0;

    return {
      totalRooms,
      occupiedRooms: occupied,
      vacantRooms: counts[RoomStatus.VACANT] || 0,
      maintenanceRooms: counts[RoomStatus.MAINTENANCE] || 0,
      reservedRooms: counts[RoomStatus.RESERVED] || 0,
      occupancyRate, // e.g. 85.5%
    };
  }

  /**
   * GET /reports/utilities: Báo cáo điện nước tiêu thụ và thành tiền
   */
  async getUtilitiesReport(organizationId: string, filter: ReportFilterDto) {
    const match: any = { organizationId };
    if (filter.period) match.period = filter.period;

    const readingsAgg = await this.connection
      .collection('meter_readings')
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'meters',
            localField: 'meterId',
            foreignField: '_id',
            as: 'meter',
          },
        },
        { $unwind: { path: '$meter', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$meter.type',
            totalConsumption: { $sum: '$consumption' },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const electricity = readingsAgg.find((r) => r._id === 'ELECTRIC') || {
      totalConsumption: 0,
      totalAmount: 0,
      count: 0,
    };
    const water = readingsAgg.find((r) => r._id === 'WATER') || {
      totalConsumption: 0,
      totalAmount: 0,
      count: 0,
    };

    return {
      period: filter.period || 'all',
      electricity: {
        consumption: electricity.totalConsumption,
        amount: electricity.totalAmount,
        readingCount: electricity.count,
      },
      water: {
        consumption: water.totalConsumption,
        amount: water.totalAmount,
        readingCount: water.count,
      },
    };
  }

  /**
   * GET /reports/maintenance: Báo cáo bảo trì, tỷ lệ xử lý và chi phí
   */
  async getMaintenanceReport(organizationId: string, filter: ReportFilterDto) {
    const match: any = { organizationId };
    if (filter.from || filter.to) {
      match.createdAt = {};
      if (filter.from) match.createdAt.$gte = new Date(filter.from);
      if (filter.to) match.createdAt.$lte = new Date(filter.to);
    }

    const tickets: any[] = await this.connection
      .collection('maintenance_requests')
      .find(match)
      .toArray();

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalCost = 0;
    let landlordPaidCost = 0;
    let tenantPaidCost = 0;

    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;

      if (t.cost && typeof t.cost.amount === 'number') {
        const costAmount = t.cost.amount;
        totalCost += costAmount;
        if (t.cost.paidBy === 'LANDLORD') landlordPaidCost += costAmount;
        else if (t.cost.paidBy === 'TENANT') tenantPaidCost += costAmount;
      }
    }

    return {
      totalRequests: tickets.length,
      byStatus,
      byCategory,
      byPriority,
      costs: {
        totalCost,
        landlordPaidCost,
        tenantPaidCost,
      },
    };
  }

  /**
   * POST /reports/:type/export: Khởi chạy job xuất báo cáo bất đồng bộ (Excel/PDF)
   */
  async exportReport(
    user: AuthenticatedUser,
    type: string,
    dto: ExportReportDto,
  ) {
    const jobId = uuidv4();
    const format = dto.format || 'EXCEL';

    // Đẩy job nền xử lý xuất file
    setTimeout(async () => {
      try {
        await this.reportExportJob.execute(user.organizationId, jobId, type);

        // Gửi thông báo khi xuất file hoàn tất
        await this.notificationService.dispatchNotification({
          organizationId: user.organizationId,
          userId: user.userId,
          type: NotificationType.BROADCAST,
          title: `Báo cáo ${type.toUpperCase()} đã sẵn sàng`,
          body: `File xuất ${format} cho báo cáo ${type} (Job #${jobId.slice(0, 8)}) đã hoàn tất tải lên.`,
          data: {
            jobId,
            reportType: type,
            format,
          },
        });
      } catch (err: any) {
        this.logger.error(`Failed to export report #${jobId}: ${err.message}`);
      }
    }, 50);

    return {
      jobId,
      type,
      format,
      status: 'QUEUED',
      message: 'Report export job queued. You will receive a notification when it is ready.',
    };
  }
}
