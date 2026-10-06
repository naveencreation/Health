import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
  waterReminder: boolean;
  mealReminder: boolean;
  stepReminder: boolean;
  streakReminder: boolean;
  waterIntervalMinutes: number; // e.g., 120 (every 2 hours)
  quietHoursStart: string; // e.g., "22:00"
  quietHoursEnd: string; // e.g., "08:00"
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  waterReminder: true,
  mealReminder: true,
  stepReminder: true,
  streakReminder: true,
  waterIntervalMinutes: 120,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export const NOTIFICATION_SETTINGS_STORAGE_KEY = '@calori_notification_settings_v1';

/**
 * Helper to safely resolve optional Expo Notifications module at runtime.
 */
function getOptionalExpoNotifications(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export class NotificationService {
  private static storageKey = NOTIFICATION_SETTINGS_STORAGE_KEY;

  public static setStorageKey(key: string) {
    this.storageKey = key;
  }

  public static resetStorageKey() {
    this.storageKey = NOTIFICATION_SETTINGS_STORAGE_KEY;
  }

  /**
   * Retrieves notification settings from local storage.
   */
  public static async getSettings(): Promise<NotificationSettings> {
    try {
      const raw = await AsyncStorage.getItem(this.storageKey);
      if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }
  }

  /**
   * Updates and saves notification settings.
   */
  public static async updateSettings(
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...updates };
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(updated));
      return updated;
    } catch {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...updates };
    }
  }

  /**
   * Safe permission request wrapper.
   */
  public static async requestPermission(): Promise<boolean> {
    try {
      const Notifications = getOptionalExpoNotifications();
      if (!Notifications || !Notifications.requestPermissionsAsync) {
        return true;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Schedules a local notification safely.
   */
  public static async scheduleNotification(options: {
    title: string;
    body: string;
    triggerSeconds?: number;
    channelId?: string;
  }): Promise<string | null> {
    try {
      const Notifications = getOptionalExpoNotifications();
      if (!Notifications || !Notifications.scheduleNotificationAsync) {
        return `simulated_notif_${Date.now()}`;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          sound: true,
        },
        trigger: options.triggerSeconds
          ? {
              type: Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL || 'timeInterval',
              seconds: options.triggerSeconds,
              repeats: false,
            }
          : null,
      });

      return id;
    } catch {
      return `fallback_notif_${Date.now()}`;
    }
  }

  /**
   * Cancels all scheduled notifications.
   */
  public static async cancelAllScheduledNotifications(): Promise<void> {
    try {
      const Notifications = getOptionalExpoNotifications();
      if (Notifications?.cancelAllScheduledNotificationsAsync) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch {}
  }
}
