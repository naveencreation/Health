import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  setNotificationHandler,
  addNotificationResponseReceivedListener,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  NotificationRequest,
  NotificationResponse,
  EventSubscription,
} from './expoNotifications';
import { setupNotificationChannels } from '@/config/notificationChannels';
import { NotificationSettings } from './types';
import { DEFAULT_NOTIFICATION_SETTINGS } from './defaults';
import { NotificationStorage } from './storage/notificationStorage';

export { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS };
export const NOTIFICATION_SETTINGS_STORAGE_KEY = '@calori_notification_settings_v1';

// Configure foreground notification behavior for Expo SDK 57
if (Platform.OS !== 'web') {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export class NotificationService {
  private static storageKey = NOTIFICATION_SETTINGS_STORAGE_KEY;
  private static isInitialized = false;

  public static setStorageKey(key: string) {
    this.storageKey = key;
  }

  public static resetStorageKey() {
    this.storageKey = NOTIFICATION_SETTINGS_STORAGE_KEY;
  }

  /**
   * Initializes native notification subsystem: registers Android notification channels
   * and ensures foreground handler is bound.
   */
  public static async initialize(): Promise<void> {
    if (this.isInitialized || Platform.OS === 'web') return;

    try {
      await setupNotificationChannels();
      this.isInitialized = true;
    } catch (error) {
      console.warn('[NotificationService] Initialization error:', error);
    }
  }

  /**
   * Retrieves notification settings from local storage.
   */
  public static async getSettings(uid?: string): Promise<NotificationSettings> {
    return NotificationStorage.loadSettings(uid);
  }

  /**
   * Updates and saves notification settings.
   */
  public static async updateSettings(
    updates: Partial<NotificationSettings> & {
      waterReminder?: boolean;
      mealReminder?: boolean;
      stepReminder?: boolean;
      streakReminder?: boolean;
      waterIntervalMinutes?: number;
    },
    uid?: string
  ): Promise<NotificationSettings> {
    return NotificationStorage.updateSettings(updates, uid);
  }

  /**
   * Checks current OS notification permission status.
   */
  public static async getPermissionStatus(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const perms = await getPermissionsAsync();
      return perms?.status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Safe permission request wrapper.
   * On Android 13+, channels are initialized first to ensure the OS prompt appears.
   */
  public static async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      // Ensure Android notification channels exist so permission dialog triggers
      if (Platform.OS === 'android') {
        await setupNotificationChannels();
      }

      const existing = await getPermissionsAsync();
      let finalStatus = existing?.status;

      if (finalStatus !== 'granted') {
        const req = await requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = req?.status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.warn('[NotificationService] Permission request error:', error);
      return false;
    }
  }

  /**
   * Schedules a local notification natively using expo-notifications.
   */
  public static async scheduleNotification(options: {
    title: string;
    body: string;
    triggerSeconds?: number;
    channelId?: string;
    data?: Record<string, any>;
  }): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const id = await scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          sound: true,
          data: options.data,
          ...(Platform.OS === 'android' && options.channelId
            ? { channelId: options.channelId }
            : {}),
        },
        trigger: options.triggerSeconds
          ? {
              type: SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.max(1, options.triggerSeconds),
              repeats: false,
              ...(Platform.OS === 'android' && options.channelId
                ? { channelId: options.channelId }
                : {}),
            }
          : null,
      });

      return id;
    } catch (error) {
      console.warn('[NotificationService] Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Cancels all scheduled notifications.
   */
  public static async cancelAllScheduledNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn('[NotificationService] Failed to cancel scheduled notifications:', error);
    }
  }

  /**
   * Returns all currently pending scheduled notifications.
   */
  public static async getAllScheduledNotifications(): Promise<NotificationRequest[]> {
    if (Platform.OS === 'web') return [];

    try {
      return await getAllScheduledNotificationsAsync();
    } catch {
      return [];
    }
  }

  /**
   * Adds a listener for user interaction with notifications (e.g. tap).
   */
  public static addResponseListener(
    listener: (response: NotificationResponse) => void
  ): EventSubscription {
    return addNotificationResponseReceivedListener(listener);
  }
}

