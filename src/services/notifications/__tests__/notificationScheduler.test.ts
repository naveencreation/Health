import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockScheduleNotificationAsync = jest.fn().mockResolvedValue('mock_notif_id_123');
const mockCancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
const mockGetAllScheduledNotificationsAsync = jest.fn().mockResolvedValue([]);
const mockCancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('../expoNotifications', () => ({
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
    DATE: 'date',
  },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: (...args: any[]) => mockScheduleNotificationAsync(...args),
  cancelAllScheduledNotificationsAsync: (...args: any[]) =>
    mockCancelAllScheduledNotificationsAsync(...args),
  getAllScheduledNotificationsAsync: (...args: any[]) =>
    mockGetAllScheduledNotificationsAsync(...args),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

jest.mock('@/services/notifications/expoNotifications', () => ({
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
    DATE: 'date',
  },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: (...args: any[]) => mockScheduleNotificationAsync(...args),
  cancelAllScheduledNotificationsAsync: (...args: any[]) =>
    mockCancelAllScheduledNotificationsAsync(...args),
  getAllScheduledNotificationsAsync: (...args: any[]) =>
    mockGetAllScheduledNotificationsAsync(...args),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

jest.mock('expo-notifications/build/cancelScheduledNotificationAsync', () => ({
  cancelScheduledNotificationAsync: (...args: any[]) =>
    mockCancelScheduledNotificationAsync(...args),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../notificationService';
import { NotificationScheduler } from '../notificationScheduler';

describe('NotificationService & NotificationScheduler Facade', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    NotificationService.resetStorageKey();
    mockScheduleNotificationAsync.mockResolvedValue('mock_notif_id_123');
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);
    mockCancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockCancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
  });

  it('retrieves default notification settings when storage is empty', async () => {
    const settings = await NotificationService.getSettings();
    expect(settings.waterReminder).toBe(true);
    expect(settings.mealReminder).toBe(true);
    expect(settings.stepReminder).toBe(true);
    expect(settings.streakReminder).toBe(true);
    expect(settings.meals.enabled).toBe(true);
  });

  it('updates and persists custom notification settings', async () => {
    const updated = await NotificationService.updateSettings({
      waterReminder: false,
      waterIntervalMinutes: 60,
    });

    expect(updated.waterReminder).toBe(false);
    expect(updated.water.enabled).toBe(false);
    expect(updated.waterIntervalMinutes).toBe(60);

    const reloaded = await NotificationService.getSettings();
    expect(reloaded.waterReminder).toBe(false);
    expect(reloaded.water.enabled).toBe(false);
    expect(reloaded.waterIntervalMinutes).toBe(60);
  });

  it('calculates seconds until target time correctly', () => {
    // 10:00:00 local time
    const fixedNow = new Date(2026, 9, 4, 10, 0, 0);
    // Target: 11:00:00 local time (1 hour later)
    const diff = NotificationScheduler.calculateSecondsUntil(11, 0, fixedNow);
    expect(diff).toBe(3600);
  });

  it('schedules notifications state-aware across horizon via reconciler', async () => {
    const fixedNow = new Date('2026-10-10T06:00:00');
    const res = await NotificationScheduler.syncSchedules({
      streakDays: 3,
      hasLoggedMealsToday: true,
      now: fixedNow,
    });

    expect(res.scheduledCount).toBeGreaterThan(0);
    expect(mockScheduleNotificationAsync).toHaveBeenCalled();
    // Does NOT call blanket cancelAll
    expect(mockCancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('skips water notifications when water reminders are disabled in settings', async () => {
    const fixedNow = new Date('2026-10-10T06:00:00');
    await NotificationService.updateSettings({ waterReminder: false });

    const res = await NotificationScheduler.syncSchedules({
      streakDays: 3,
      hasLoggedMealsToday: true,
      now: fixedNow,
    });

    expect(res.scheduledCount).toBeGreaterThan(0);
    // Verify none of the scheduled calls have channelId reminders-water
    const scheduledCalls = mockScheduleNotificationAsync.mock.calls;
    const waterCalls = scheduledCalls.filter(call =>
      call[0]?.content?.data?.reminderType === 'water'
    );
    expect(waterCalls.length).toBe(0);
  });

  it('allows cancelAll only via explicit cancelAllAndReset on sign-out', async () => {
    await NotificationScheduler.cancelAllAndReset();
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});
