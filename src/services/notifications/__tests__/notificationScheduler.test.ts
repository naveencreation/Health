import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

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

  it('schedules meal and water reminders when both are enabled', async () => {
    const res = await NotificationScheduler.syncSchedules({
      streakDays: 3,
      hasLoggedMealsToday: true,
    });

    // Standard reminders has 5 items (3 meals, 2 waters)
    expect(res.scheduledCount).toBe(5);
  });

  it('adds a streak protection reminder when user has not logged today', async () => {
    const res = await NotificationScheduler.syncSchedules({
      streakDays: 5,
      hasLoggedMealsToday: false, // Streak is at risk!
    });

    // 5 standard + 1 streak protection = 6
    expect(res.scheduledCount).toBe(6);
  });

  it('skips water reminders if waterReminder is disabled in settings', async () => {
    await NotificationService.updateSettings({ waterReminder: false });

    const res = await NotificationScheduler.syncSchedules({
      streakDays: 3,
      hasLoggedMealsToday: true,
    });

    // 3 meals only (water reminders skipped)
    expect(res.scheduledCount).toBe(3);
  });
});
