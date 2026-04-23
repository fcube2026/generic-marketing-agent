import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly accessToken: string | null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.accessToken =
      this.configService.get<string>('EXPO_ACCESS_TOKEN') || null;
    if (!this.accessToken) {
      this.logger.warn(
        'EXPO_ACCESS_TOKEN not configured. Push notifications will work but with lower rate limits.',
      );
    }
  }

  /**
   * Register a device token for a user
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<void> {
    // Validate Expo push token format
    if (
      !token.startsWith('ExponentPushToken[') &&
      !token.startsWith('ExpoPushToken[')
    ) {
      this.logger.warn(`Invalid Expo push token format: ${token}`);
      // Still store it - might be valid in newer formats
    }

    // Upsert: if token exists, update; otherwise create
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        token,
        platform,
        isActive: true,
      },
    });

    this.logger.log(`Device token registered for user ${userId}: ${platform}`);
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
    this.logger.log(`Device token unregistered: ${token}`);
  }

  /**
   * Unregister all device tokens for a user
   */
  async unregisterAllDeviceTokens(userId: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { userId },
      data: { isActive: false },
    });
    this.logger.log(`All device tokens unregistered for user: ${userId}`);
  }

  /**
   * Get active device tokens for a user
   */
  async getActiveTokens(userId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });
    return tokens.map((t) => t.token);
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; ticketIds?: string[]; errors?: string[] }> {
    const tokens = await this.getActiveTokens(payload.userId);

    if (tokens.length === 0) {
      this.logger.debug(`No active device tokens for user ${payload.userId}`);
      return { success: true, ticketIds: [] };
    }

    return this.sendPushNotifications(tokens, {
      title: payload.title,
      body: payload.body,
      data: payload.data,
      badge: payload.badge,
    });
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    },
  ): Promise<{ success: boolean; sentCount: number; errors?: string[] }> {
    const allTokens: string[] = [];

    for (const userId of userIds) {
      const tokens = await this.getActiveTokens(userId);
      allTokens.push(...tokens);
    }

    if (allTokens.length === 0) {
      this.logger.debug('No active device tokens for any user');
      return { success: true, sentCount: 0 };
    }

    const result = await this.sendPushNotifications(allTokens, notification);
    return {
      success: result.success,
      sentCount: result.ticketIds?.length || 0,
      errors: result.errors,
    };
  }

  /**
   * Send push notifications via Expo Push API
   */
  private async sendPushNotifications(
    tokens: string[],
    notification: {
      title?: string;
      body: string;
      data?: Record<string, unknown>;
      badge?: number;
    },
  ): Promise<{ success: boolean; ticketIds?: string[]; errors?: string[] }> {
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: 'default',
      badge: notification.badge,
      priority: 'high',
    }));

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`Expo Push API error: ${JSON.stringify(result)}`);
        return { success: false, errors: [result.message || 'Expo API error'] };
      }

      const tickets: ExpoPushTicket[] = result.data || [];
      const ticketIds: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'ok' && ticket.id) {
          ticketIds.push(ticket.id);
        } else if (ticket.status === 'error') {
          errors.push(
            `Token ${tokens[i]}: ${ticket.message || ticket.details?.error || 'Unknown error'}`,
          );
          // Mark invalid tokens as inactive
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.unregisterDeviceToken(tokens[i]);
          }
        }
      }

      if (errors.length > 0) {
        this.logger.warn(
          `Some push notifications failed: ${errors.join(', ')}`,
        );
      }

      this.logger.log(
        `Push notifications sent: ${ticketIds.length} successful, ${errors.length} failed`,
      );
      return {
        success: ticketIds.length > 0 || errors.length === 0,
        ticketIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to send push notifications: ${error}`);
      return { success: false, errors: [String(error)] };
    }
  }

  /**
   * Get unread notification count for badge
   */
  async getUnreadBadgeCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
