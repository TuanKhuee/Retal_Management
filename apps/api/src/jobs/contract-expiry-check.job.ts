import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ContractRepository } from '../modules/contract/contract.repository';
import { NotificationService } from '../modules/notification/notification.service';
import { ContractStatus, NotificationType } from '../common/constants';

@Injectable()
export class ContractExpiryCheckJob {
  private readonly logger = new Logger(ContractExpiryCheckJob.name);

  constructor(
    private readonly contractRepo: ContractRepository,
    private readonly notificationService: NotificationService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Cron 08:00: Scans active contracts expiring in 30 days or 7 days
   * IDEMPOTENT: Skips if milestone notification was already sent.
   */
  async execute(
    organizationId?: string,
  ): Promise<{ processed: number; notified: number; skipped: number }> {
    const now = new Date();
    const d31End = new Date(now.getTime() + 31 * 86400000);

    const filter: any = {
      status: ContractStatus.ACTIVE,
      endDate: { $gte: now, $lte: d31End },
    };

    const contracts = organizationId
      ? await this.contractRepo.find(organizationId, filter)
      : await this.contractRepo.getModel().find(filter).exec();

    let notifiedCount = 0;
    let skippedCount = 0;

    for (const contract of contracts) {
      const daysDiff = Math.ceil(
        (new Date(contract.endDate).getTime() - now.getTime()) / 86400000,
      );
      let milestone = '';
      if (daysDiff >= 28 && daysDiff <= 31) {
        milestone = '30d';
      } else if (daysDiff >= 6 && daysDiff <= 8) {
        milestone = '7d';
      }

      if (!milestone) continue;

      // Idempotency check: has notification for this milestone already been sent?
      const existingNotif = await this.connection
        .collection('notifications')
        .findOne({
          organizationId: contract.organizationId,
          type: NotificationType.CONTRACT_EXPIRING_SOON,
          'data.contractId': contract._id.toString(),
          'data.milestone': milestone,
        });

      if (existingNotif) {
        skippedCount++;
        continue;
      }

      // 1. Gửi thông báo cho TENANT
      if (contract.primaryTenantId) {
        await this.notificationService.dispatchNotification({
          organizationId: contract.organizationId,
          userId: contract.primaryTenantId.toString(),
          type: NotificationType.CONTRACT_EXPIRING_SOON,
          title: `Hợp đồng sắp hết hạn: ${contract.contractNo || 'HĐ'}`,
          body: `Hợp đồng thuê phòng của bạn còn ${daysDiff} ngày nữa sẽ hết hạn (${new Date(
            contract.endDate,
          ).toLocaleDateString('vi-VN')}). Vui lòng liên hệ chủ nhà nếu muốn gia hạn.`,
          data: {
            contractId: contract._id.toString(),
            contractNo: contract.contractNo,
            milestone,
          },
        });
      }

      // 2. Gửi thông báo cho OWNER / STAFF của tổ chức
      const staffMembers = await this.connection
        .collection('memberships')
        .find({
          organizationId: contract.organizationId,
          role: { $in: ['OWNER', 'MANAGER', 'STAFF'] },
        })
        .toArray();

      for (const staff of staffMembers) {
        if (staff.userId) {
          await this.notificationService.dispatchNotification({
            organizationId: contract.organizationId,
            userId: staff.userId.toString(),
            type: NotificationType.CONTRACT_EXPIRING_SOON,
            title: `Hợp đồng sắp hết hạn: ${contract.contractNo || 'HĐ'}`,
            body: `Hợp đồng phòng ${contract.roomId} còn ${daysDiff} ngày sẽ hết hạn.`,
            data: {
              contractId: contract._id.toString(),
              contractNo: contract.contractNo,
              milestone,
            },
          });
        }
      }

      notifiedCount++;
    }

    this.logger.log(
      `[JOB contract.expiry-check] Completed. Notified: ${notifiedCount}, Skipped: ${skippedCount}`,
    );
    return { processed: contracts.length, notified: notifiedCount, skipped: skippedCount };
  }
}
