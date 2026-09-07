import { db } from '@/config/firebase';
import { doc, getDoc, collection, query, where, getDocs, documentId } from 'firebase/firestore';

export interface PushNotificationPayload {
  title: string;
  subtitle?: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  channelId?: string;
  badge?: number;
  color?: string;
  priority?: 'default' | 'normal' | 'high';
}

export class PushNotificationService {
  private static EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Sends push notifications to a list of Expo push tokens.
   */
  public static async sendToTokens(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<void> {
    if (!tokens || tokens.length === 0) return;

    // Filter valid Expo push tokens (starts with ExponentPushToken[...] or ExpoPushToken[...])
    const validTokens = tokens.filter(
      (token) =>
        typeof token === 'string' &&
        (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
    );

    if (validTokens.length === 0) return;

    // Batch messages into chunks of 100 as per Expo Push API docs
    const messages = validTokens.map((token) => ({
      to: token,
      sound: payload.sound || 'default',
      title: payload.title,
      subtitle: payload.subtitle,
      body: payload.body,
      data: payload.data || {},
      priority: payload.priority || 'high',
      channelId: payload.channelId || 'transactions',
      badge: payload.badge !== undefined ? payload.badge : 1,
      color: payload.color || '#10b981',
      _displayInForeground: true,
    }));

    try {
      // Chunk into batches of 100
      const chunkSize = 100;
      for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);
        const response = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('⚠️ Expo Push API error response:', errorText);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to send Expo push notification:', error);
    }
  }

  /**
   * Fetches push tokens for given user IDs and delivers the push notification.
   */
  public static async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<void> {
    if (!userIds || userIds.length === 0 || !db) return;

    try {
      const allTokens: string[] = [];

      // Query users in batches (Firestore 'in' supports up to 30 values)
      const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
      const batchSize = 10;

      for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const idChunk = uniqueIds.slice(i, i + batchSize);
        const userQuery = query(
          collection(db, 'users'),
          where(documentId(), 'in', idChunk)
        );
        const snapshot = await getDocs(userQuery);

        snapshot.forEach((docSnap) => {
          const userData = docSnap.data();
          if (Array.isArray(userData.pushTokens)) {
            userData.pushTokens.forEach((t: string) => {
              if (t && typeof t === 'string') allTokens.push(t);
            });
          } else if (userData.pushToken && typeof userData.pushToken === 'string') {
            allTokens.push(userData.pushToken);
          }
        });
      }

      if (allTokens.length > 0) {
        await this.sendToTokens(Array.from(new Set(allTokens)), payload);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch tokens and send push notifications:', error);
    }
  }

  /**
   * Sends a push notification to a single user by userId.
   */
  public static async sendToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<void> {
    return this.sendToUsers([userId], payload);
  }
}
