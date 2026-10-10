import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationStorage,
  NOTIFICATION_SETTINGS_V1_KEY,
  NOTIFICATION_SETTINGS_V2_PREFIX,
} from '../notificationStorage';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../../defaults';

describe('NotificationStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads defaults when storage is completely empty', async () => {
    const settings = await NotificationStorage.loadSettings('user_123');
    expect(settings.version).toBe(2);
    expect(settings.enabled).toBe(true);
    expect(settings.quietHours).toEqual({ start: '22:00', end: '07:00' });
    expect(settings.meals.breakfast).toBe('08:30');
    expect(settings.meals.skipsBreakfast).toBe(false);
    expect(settings.water.intervalMinutes).toBe(120);
  });

  it('saves and loads settings scoped per uid', async () => {
    await NotificationStorage.saveSettings(
      {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        meals: {
          ...DEFAULT_NOTIFICATION_SETTINGS.meals,
          breakfast: '07:00',
        },
      },
      'user_A'
    );

    const userASettings = await NotificationStorage.loadSettings('user_A');
    const userBSettings = await NotificationStorage.loadSettings('user_B');

    expect(userASettings.meals.breakfast).toBe('07:00');
    expect(userBSettings.meals.breakfast).toBe('08:30');
  });

  it('deep merges partial updates without wiping other nested values', async () => {
    await NotificationStorage.updateSettings(
      {
        meals: {
          ...DEFAULT_NOTIFICATION_SETTINGS.meals,
          lunch: '12:15',
          skipsBreakfast: true,
        },
      },
      'user_123'
    );

    const updated = await NotificationStorage.loadSettings('user_123');
    expect(updated.meals.lunch).toBe('12:15');
    expect(updated.meals.skipsBreakfast).toBe(true);
    expect(updated.meals.breakfast).toBe('08:30'); // preserved
    expect(updated.water.intervalMinutes).toBe(120); // preserved
  });

  it('migrates legacy v1 settings on first load', async () => {
    const legacyV1 = {
      waterReminder: false,
      mealReminder: true,
      stepReminder: false,
      streakReminder: true,
      waterIntervalMinutes: 60,
      quietHoursStart: '23:00',
      quietHoursEnd: '06:00',
    };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_V1_KEY, JSON.stringify(legacyV1));

    const migrated = await NotificationStorage.loadSettings('migrated_user');
    expect(migrated.version).toBe(2);
    expect(migrated.water.enabled).toBe(false);
    expect(migrated.water.intervalMinutes).toBe(60);
    expect(migrated.meals.enabled).toBe(true);
    expect(migrated.steps.enabled).toBe(false);
    expect(migrated.streak.enabled).toBe(true);
    expect(migrated.quietHours.start).toBe('23:00');
    expect(migrated.quietHours.end).toBe('06:00');

    // Verify it was persisted to V2 key
    const rawV2 = await AsyncStorage.getItem(
      `${NOTIFICATION_SETTINGS_V2_PREFIX}migrated_user`
    );
    expect(rawV2).not.toBeNull();
  });

  it('seeds initial settings from userGoals flags when no v1 or v2 exists', async () => {
    const seeded = await NotificationStorage.loadSettings('seeded_user', {
      waterReminder: false,
      mealReminder: true,
      stepReminder: false,
      streakReminder: false,
    });

    expect(seeded.version).toBe(2);
    expect(seeded.water.enabled).toBe(false);
    expect(seeded.meals.enabled).toBe(true);
    expect(seeded.steps.enabled).toBe(false);
    expect(seeded.streak.enabled).toBe(false);
  });

  it('resets settings to default on resetSettings', async () => {
    await NotificationStorage.updateSettings(
      {
        meals: {
          ...DEFAULT_NOTIFICATION_SETTINGS.meals,
          dinner: '21:00',
        },
      },
      'reset_user'
    );

    await NotificationStorage.resetSettings('reset_user');
    const fresh = await NotificationStorage.loadSettings('reset_user');
    expect(fresh.meals.dinner).toBe('19:30');
    expect(fresh.weight.enabled).toBe(false);
  });

  it('updates and persists weight reminder settings', async () => {
    await NotificationStorage.updateSettings(
      {
        weight: {
          enabled: true,
          time: '07:15',
        },
      },
      'weight_user'
    );

    const loaded = await NotificationStorage.loadSettings('weight_user');
    expect(loaded.weight.enabled).toBe(true);
    expect(loaded.weight.time).toBe('07:15');
  });
});
