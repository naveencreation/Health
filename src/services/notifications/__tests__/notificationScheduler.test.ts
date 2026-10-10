import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('../expoNotifications', () => ({
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock_notif_id_123'),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

jest.mock('@/services/notifications/expoNotifications', () => ({
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock_notif_id_123'),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../notificationService';
import { NotificationScheduler } from '../notificationScheduler';

describe('NotificationService & NotificationScheduler', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    NotificationService.resetStorageKey();
  });

  it('retrieves default notification settings when storage is empty', async () => {
    const settings = await NotificationService.getSettings();
    expect(settings.waterReminder).toBe(true);
    expect(settings.mealReminder).toBe(true);
    expect(settings.stepReminder).toBe(true);
    expect(settings.streakReminder).toBe(true);
  });

  it('updates and persists custom notification settings', async () => {
    const updated = await NotificationService.updateSettings({
      waterReminder: false,
      waterIntervalMinutes: 60,
    });

    expect(updated.waterReminder).toBe(false);
    expect(updated.waterIntervalMinutes).toBe(60);

    const reloaded = await NotificationService.getSettings();
    expect(reloaded.waterReminder).toBe(false);
    expect(reloaded.waterIntervalMinutes).toBe(60);
  });

  it('calculates seconds until target time correctly', () => {
    // 10:00:00 local time
    const fixedNow = new Date(2026, 9, 4, 10, 0, 0);
    // Target: 11:00:00 local time (1 hour later)
    const diff = NotificationScheduler.calculateSecondsUntil(11, 0, fixedNow);
    expect(diff).toBe(3600);
  });

  it('schedules meal, water, and step reminders when all are enabled', async () => {
    const res = await NotificationScheduler.syncSchedules({
      streakDays: 3,
      hasLoggedMealsToday: true,
    });

    // Standard reminders has 6 items (3 meals, 2 waters, 1 step)
    expect(res.scheduledCount).toBe(6);
  });

  it('adds a streak protection reminder when user has not logged today', async () => {
    const res = await NotificationScheduler.syncSchedules({
      streakDays: 5,
      hasLoggedMealsToday: false, // Streak is at risk!
    });

    // 6 standard + 1 streak protection = 7
    expect(res.scheduledCount).toBe(7);
  });

  it('skips water reminders if waterReminder is disabled in settings', async () => {
    await NotificationService.updateSettings({ waterReminder: false });

    const res = await NotificationScheduler.syncSchedules({
      streakDays: 3,
      hasLoggedMealsToday: true,
    });

    // 3 meals + 1 step = 4 (water reminders skipped)
    expect(res.scheduledCount).toBe(4);
  });

  it('skips step reminders if stepReminder is disabled in settings', async () => {
    await NotificationService.updateSettings({ stepReminder: false });

    const res = await NotificationScheduler.syncSchedules({
      streakDays: 3,
      hasLoggedMealsToday: true,
    });

    // 3 meals + 2 waters = 5 (step reminders skipped)
    expect(res.scheduledCount).toBe(5);
  });
});
