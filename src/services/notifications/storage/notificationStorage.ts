import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationSettings } from '../types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../defaults';

export const NOTIFICATION_SETTINGS_V1_KEY = '@calori_notification_settings_v1';
export const NOTIFICATION_SETTINGS_V2_PREFIX = '@calori_notif_settings_v2_';

export interface LegacyNotificationSettingsV1 {
  waterReminder?: boolean;
  mealReminder?: boolean;
  stepReminder?: boolean;
  streakReminder?: boolean;
  waterIntervalMinutes?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface SeedGoalsInput {
  waterReminder?: boolean;
  mealReminder?: boolean;
  stepReminder?: boolean;
  streakReminder?: boolean;
}

export class NotificationStorage {
  public static getStorageKey(uid?: string): string {
    const cleanUid = uid && uid.trim().length > 0 ? uid.trim() : 'default';
    return `${NOTIFICATION_SETTINGS_V2_PREFIX}${cleanUid}`;
  }

  /**
   * Retrieves notification settings for a specific user ID.
   * Automatically migrates legacy v1 settings or seeds initial defaults from userGoals if available.
   */
  public static async loadSettings(
    uid?: string,
    seedGoals?: SeedGoalsInput
  ): Promise<NotificationSettings> {
    const key = this.getStorageKey(uid);
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return this.mergeWithDefaults(parsed);
      }

      // Check for legacy v1 settings
      const legacyRaw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_V1_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw) as LegacyNotificationSettingsV1;
        const migrated = this.migrateV1Settings(legacyParsed, seedGoals);
        await this.saveSettings(migrated, uid);
        return migrated;
      }

      // If no v1 and seed goals provided, seed initial defaults
      if (seedGoals) {
        const seeded = this.seedFromGoals(seedGoals);
        await this.saveSettings(seeded, uid);
        return seeded;
      }

      const defaults = this.mergeWithDefaults(DEFAULT_NOTIFICATION_SETTINGS);
      await this.saveSettings(defaults, uid);
      return defaults;
    } catch {
      return this.mergeWithDefaults(DEFAULT_NOTIFICATION_SETTINGS);
    }
  }

  /**
   * Overwrites notification settings for a specific user ID.
   */
  public static async saveSettings(
    settings: NotificationSettings,
    uid?: string
  ): Promise<NotificationSettings> {
    const key = this.getStorageKey(uid);
    const sanitized = this.mergeWithDefaults(settings);
    await AsyncStorage.setItem(key, JSON.stringify(sanitized));
    return sanitized;
  }

  /**
   * Deeply merges partial updates into existing settings.
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
    const current = await this.loadSettings(uid);

    // Map legacy flat flags if provided
    const mealEnabled =
      typeof updates.mealReminder === 'boolean'
        ? updates.mealReminder
        : updates.meals?.enabled ?? current.meals.enabled;

    const waterEnabled =
      typeof updates.waterReminder === 'boolean'
        ? updates.waterReminder
        : updates.water?.enabled ?? current.water.enabled;

    const stepEnabled =
      typeof updates.stepReminder === 'boolean'
        ? updates.stepReminder
        : updates.steps?.enabled ?? current.steps.enabled;

    const streakEnabled =
      typeof updates.streakReminder === 'boolean'
        ? updates.streakReminder
        : updates.streak?.enabled ?? current.streak.enabled;

    const weightEnabled =
      typeof updates.weightReminder === 'boolean'
        ? updates.weightReminder
        : updates.weight?.enabled ?? current.weight.enabled;

    const weightTime = updates.weight?.time || current.weight.time || '07:30';

    const safeInterval = (val: any): 60 | 120 | 180 => {
      if (val === 60 || val === 180) return val;
      return 120;
    };

    const intervalMinutes =
      updates.waterIntervalMinutes !== undefined
        ? safeInterval(updates.waterIntervalMinutes)
        : updates.water?.intervalMinutes ?? current.water.intervalMinutes;

    const updated: NotificationSettings = {
      ...current,
      ...updates,
      version: 2,
      quietHours: {
        ...current.quietHours,
        ...(updates.quietHours || {}),
      },
      meals: {
        ...current.meals,
        ...(updates.meals || {}),
        enabled: mealEnabled,
      },
      water: {
        ...current.water,
        ...(updates.water || {}),
        enabled: waterEnabled,
        intervalMinutes,
      },
      steps: {
        ...current.steps,
        ...(updates.steps || {}),
        enabled: stepEnabled,
      },
      streak: {
        ...current.streak,
        ...(updates.streak || {}),
        enabled: streakEnabled,
      },
      weight: {
        ...current.weight,
        ...(updates.weight || {}),
        enabled: weightEnabled,
        time: weightTime,
      },
    };

    return this.saveSettings(updated, uid);
  }

  /**
   * Resets settings to default for a user.
   */
  public static async resetSettings(uid?: string): Promise<NotificationSettings> {
    const key = this.getStorageKey(uid);
    await AsyncStorage.removeItem(key);
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  private static mergeWithDefaults(partial: any): NotificationSettings {
    const safeInterval = (val: any): 60 | 120 | 180 => {
      if (val === 60 || val === 180) return val;
      return 120;
    };

    return {
      version: 2,
      enabled: typeof partial?.enabled === 'boolean' ? partial.enabled : DEFAULT_NOTIFICATION_SETTINGS.enabled,
      quietHours: {
        start: partial?.quietHours?.start || DEFAULT_NOTIFICATION_SETTINGS.quietHours.start,
        end: partial?.quietHours?.end || DEFAULT_NOTIFICATION_SETTINGS.quietHours.end,
      },
      meals: {
        enabled:
          typeof partial?.meals?.enabled === 'boolean'
            ? partial.meals.enabled
            : DEFAULT_NOTIFICATION_SETTINGS.meals.enabled,
        breakfast: partial?.meals?.breakfast || DEFAULT_NOTIFICATION_SETTINGS.meals.breakfast,
        lunch: partial?.meals?.lunch || DEFAULT_NOTIFICATION_SETTINGS.meals.lunch,
        dinner: partial?.meals?.dinner || DEFAULT_NOTIFICATION_SETTINGS.meals.dinner,
        skipsBreakfast:
          typeof partial?.meals?.skipsBreakfast === 'boolean'
            ? partial.meals.skipsBreakfast
            : DEFAULT_NOTIFICATION_SETTINGS.meals.skipsBreakfast,
      },
      water: {
        enabled:
          typeof partial?.water?.enabled === 'boolean'
            ? partial.water.enabled
            : DEFAULT_NOTIFICATION_SETTINGS.water.enabled,
        intervalMinutes: safeInterval(partial?.water?.intervalMinutes),
      },
      steps: {
        enabled:
          typeof partial?.steps?.enabled === 'boolean'
            ? partial.steps.enabled
            : DEFAULT_NOTIFICATION_SETTINGS.steps.enabled,
      },
      streak: {
        enabled:
          typeof partial?.streak?.enabled === 'boolean'
            ? partial.streak.enabled
            : DEFAULT_NOTIFICATION_SETTINGS.streak.enabled,
      },
      weight: {
        enabled:
          typeof partial?.weight?.enabled === 'boolean'
            ? partial.weight.enabled
            : typeof partial?.weightReminder === 'boolean'
              ? partial.weightReminder
              : DEFAULT_NOTIFICATION_SETTINGS.weight.enabled,
        time: partial?.weight?.time || DEFAULT_NOTIFICATION_SETTINGS.weight.time,
      },
      lastWaterLoggedAt:
        typeof partial?.lastWaterLoggedAt === 'number' ? partial.lastWaterLoggedAt : undefined,
      waterReminder:
        typeof partial?.water?.enabled === 'boolean'
          ? partial.water.enabled
          : typeof partial?.waterReminder === 'boolean'
            ? partial.waterReminder
            : DEFAULT_NOTIFICATION_SETTINGS.water.enabled,
      mealReminder:
        typeof partial?.meals?.enabled === 'boolean'
          ? partial.meals.enabled
          : typeof partial?.mealReminder === 'boolean'
            ? partial.mealReminder
            : DEFAULT_NOTIFICATION_SETTINGS.meals.enabled,
      stepReminder:
        typeof partial?.steps?.enabled === 'boolean'
          ? partial.steps.enabled
          : typeof partial?.stepReminder === 'boolean'
            ? partial.stepReminder
            : DEFAULT_NOTIFICATION_SETTINGS.steps.enabled,
      streakReminder:
        typeof partial?.streak?.enabled === 'boolean'
          ? partial.streak.enabled
          : typeof partial?.streakReminder === 'boolean'
            ? partial.streakReminder
            : DEFAULT_NOTIFICATION_SETTINGS.streak.enabled,
      weightReminder:
        typeof partial?.weight?.enabled === 'boolean'
          ? partial.weight.enabled
          : typeof partial?.weightReminder === 'boolean'
            ? partial.weightReminder
            : DEFAULT_NOTIFICATION_SETTINGS.weight.enabled,
      waterIntervalMinutes: safeInterval(
        partial?.water?.intervalMinutes ?? partial?.waterIntervalMinutes
      ),
    };
  }

  public static migrateV1Settings(
    v1: LegacyNotificationSettingsV1,
    seedGoals?: SeedGoalsInput
  ): NotificationSettings {
    const interval =
      v1.waterIntervalMinutes === 60 || v1.waterIntervalMinutes === 180
        ? v1.waterIntervalMinutes
        : 120;

    return {
      version: 2,
      enabled: true,
      quietHours: {
        start: v1.quietHoursStart || DEFAULT_NOTIFICATION_SETTINGS.quietHours.start,
        end: v1.quietHoursEnd || DEFAULT_NOTIFICATION_SETTINGS.quietHours.end,
      },
      meals: {
        enabled:
          typeof v1.mealReminder === 'boolean'
            ? v1.mealReminder
            : typeof seedGoals?.mealReminder === 'boolean'
              ? seedGoals.mealReminder
              : DEFAULT_NOTIFICATION_SETTINGS.meals.enabled,
        breakfast: DEFAULT_NOTIFICATION_SETTINGS.meals.breakfast,
        lunch: DEFAULT_NOTIFICATION_SETTINGS.meals.lunch,
        dinner: DEFAULT_NOTIFICATION_SETTINGS.meals.dinner,
        skipsBreakfast: false,
      },
      water: {
        enabled:
          typeof v1.waterReminder === 'boolean'
            ? v1.waterReminder
            : typeof seedGoals?.waterReminder === 'boolean'
              ? seedGoals.waterReminder
              : DEFAULT_NOTIFICATION_SETTINGS.water.enabled,
        intervalMinutes: interval,
      },
      steps: {
        enabled:
          typeof v1.stepReminder === 'boolean'
            ? v1.stepReminder
            : typeof seedGoals?.stepReminder === 'boolean'
              ? seedGoals.stepReminder
              : DEFAULT_NOTIFICATION_SETTINGS.steps.enabled,
      },
      streak: {
        enabled:
          typeof v1.streakReminder === 'boolean'
            ? v1.streakReminder
            : typeof seedGoals?.streakReminder === 'boolean'
              ? seedGoals.streakReminder
              : DEFAULT_NOTIFICATION_SETTINGS.streak.enabled,
      },
      weight: {
        ...DEFAULT_NOTIFICATION_SETTINGS.weight,
      },
      weightReminder: DEFAULT_NOTIFICATION_SETTINGS.weightReminder,
    };
  }

  public static seedFromGoals(seedGoals: SeedGoalsInput): NotificationSettings {
    return {
      version: 2,
      enabled: true,
      quietHours: { ...DEFAULT_NOTIFICATION_SETTINGS.quietHours },
      meals: {
        ...DEFAULT_NOTIFICATION_SETTINGS.meals,
        enabled:
          typeof seedGoals.mealReminder === 'boolean'
            ? seedGoals.mealReminder
            : DEFAULT_NOTIFICATION_SETTINGS.meals.enabled,
      },
      water: {
        ...DEFAULT_NOTIFICATION_SETTINGS.water,
        enabled:
          typeof seedGoals.waterReminder === 'boolean'
            ? seedGoals.waterReminder
            : DEFAULT_NOTIFICATION_SETTINGS.water.enabled,
      },
      steps: {
        ...DEFAULT_NOTIFICATION_SETTINGS.steps,
        enabled:
          typeof seedGoals.stepReminder === 'boolean'
            ? seedGoals.stepReminder
            : DEFAULT_NOTIFICATION_SETTINGS.steps.enabled,
      },
      streak: {
        ...DEFAULT_NOTIFICATION_SETTINGS.streak,
        enabled:
          typeof seedGoals.streakReminder === 'boolean'
            ? seedGoals.streakReminder
            : DEFAULT_NOTIFICATION_SETTINGS.streak.enabled,
      },
      weight: {
        ...DEFAULT_NOTIFICATION_SETTINGS.weight,
      },
      weightReminder: DEFAULT_NOTIFICATION_SETTINGS.weightReminder,
    };
  }
}
