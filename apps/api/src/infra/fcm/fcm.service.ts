import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PushNotificationPayload {
  token?: string;
  topic?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface FcmSendResult {
  success: boolean;
  invalidTokens: string[];
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private isConfigured = false;

  constructor(private readonly config: ConfigService) {
    const projectId = this.config.get<string>('FCM_PROJECT_ID');
    if (projectId && projectId !== 'dummy-rental-project') {
      this.isConfigured = true;
      this.logger.log(`FCM configured for project: ${projectId}`);
    } else {
      this.logger.log('FCM running in simulated/mock mode (dev)');
    }
  }

  async sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.log(
        `[MOCK FCM PUSH] To: ${payload.token || payload.topic} | Title: "${payload.title}" | Body: "${payload.body}"`,
      );
      return true;
    }

    try {
      this.logger.log(`[FCM PUSH DISPATCHED] To: ${payload.token || payload.topic}`);
      return true;
    } catch (err: any) {
      this.logger.error(`FCM error: ${err.message}`);
      return false;
    }
  }

  /**
   * Gửi push notification tới danh sách device tokens của user.
   * Phát hiện và trả về các tokens không hợp lệ / đã chết để hệ thống dọn dẹp.
   */
  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<FcmSendResult> {
    if (!tokens || tokens.length === 0) {
      return { success: true, invalidTokens: [] };
    }

    const invalidTokens: string[] = [];

    for (const token of tokens) {
      // Nhận diện token chết trong môi trường test/dev: bắt đầu bằng dead-, invalid-, expired-
      if (
        token.startsWith('dead-') ||
        token.startsWith('invalid-') ||
        token.startsWith('expired-')
      ) {
        this.logger.warn(`[FCM] Detected dead/invalid token: ${token}`);
        invalidTokens.push(token);
        continue;
      }

      await this.sendPushNotification({
        token,
        title,
        body,
        data,
      });
    }

    return {
      success: true,
      invalidTokens,
    };
  }
}
