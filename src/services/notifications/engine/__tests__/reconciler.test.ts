import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();

jest.mock('../../expoNotifications', () => ({
  scheduleNotificationAsync: (...args: any[]) => mockScheduleNotificationAsync(...args),
  getAllScheduledNotificationsAsync: (...args: any[]) =>
    mockGetAllScheduledNotificationsAsync(...args),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
}));

jest.mock('expo-notifications/build/cancelScheduledNotificationAsync', () => ({
  cancelScheduledNotificationAsync: (...args: any[]) =>
    mockCancelScheduledNotificationAsync(...args),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationReconciler,
  LEGACY_MIGRATION_FLAG_KEY,
} from '../reconciler';
import { PlannedNotification } from '../../types';

describe('NotificationReconciler', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Default flag to migrated so each test focuses on diffing
    await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
    mockScheduleNotificationAsync.mockResolvedValue('mock_id');
    mockCancelScheduledNotificationAsync.mockResolvedValue(undefined);
  });

  it('schedules new notifications when OS queue is empty (add)', async () => {
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);

    const planned: PlannedNotification[] = [
      {
        id: 'calori_meal_lunch_2026-10-10',
        type: 'meal_lunch',
        fireAt: 1770000000000,
        channelId: 'reminders-meals',
        title: 'Lunch',
        body: 'Time for lunch',
        data: { route: 'food_vision', reminderType: 'meal_lunch', mealSlot: 'lunch' },
      },
    ];

    const result = await NotificationReconciler.reconcile(planned);

    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
    expect(result.updated).toBe(0);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'calori_meal_lunch_2026-10-10',
      })
    );
  });

  it('cancels scheduled notifications that are no longer in the plan (remove)', async () => {
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'calori_meal_breakfast_2026-10-10',
        content: {
          data: {
            id: 'calori_meal_breakfast_2026-10-10',
            fireAt: 1770000000000,
          },
        },
        trigger: { date: 1770000000000 },
      },
    ]);

    // Planned list is empty (e.g. breakfast was logged)
    const result = await NotificationReconciler.reconcile([]);

    expect(result.removed).toBe(1);
    expect(result.added).toBe(0);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'calori_meal_breakfast_2026-10-10'
    );
  });

  it('leaves notifications untouched when ID and fireAt match within 60s (no-op)', async () => {
    const fireAt = 1770000000000;
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'calori_meal_lunch_2026-10-10',
        content: {
          data: {
            id: 'calori_meal_lunch_2026-10-10',
            fireAt: fireAt + 10000, // 10s difference (< 60s threshold)
          },
        },
        trigger: { date: fireAt + 10000 },
      },
    ]);

    const planned: PlannedNotification[] = [
      {
        id: 'calori_meal_lunch_2026-10-10',
        type: 'meal_lunch',
        fireAt,
        channelId: 'reminders-meals',
        title: 'Lunch',
        body: 'Time for lunch',
        data: { route: 'food_vision', reminderType: 'meal_lunch', mealSlot: 'lunch' },
      },
    ];

    const result = await NotificationReconciler.reconcile(planned);

    expect(result.untouched).toBe(1);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.removed).toBe(0);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('reschedules notifications when fireAt changes by >= 60s (update-on-change)', async () => {
    const originalFireAt = 1770000000000;
    const newFireAt = originalFireAt + 120000; // 2 minutes later (>= 60s threshold)

    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'calori_meal_lunch_2026-10-10',
        content: {
          data: {
            id: 'calori_meal_lunch_2026-10-10',
            fireAt: originalFireAt,
          },
        },
        trigger: { date: originalFireAt },
      },
    ]);

    const planned: PlannedNotification[] = [
      {
        id: 'calori_meal_lunch_2026-10-10',
        type: 'meal_lunch',
        fireAt: newFireAt,
        channelId: 'reminders-meals',
        title: 'Lunch',
        body: 'Time for lunch',
        data: { route: 'food_vision', reminderType: 'meal_lunch', mealSlot: 'lunch' },
      },
    ];

    const result = await NotificationReconciler.reconcile(planned);

    expect(result.updated).toBe(1);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'calori_meal_lunch_2026-10-10'
    );
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'calori_meal_lunch_2026-10-10',
        trigger: expect.objectContaining({ date: newFireAt }),
      })
    );
  });

  it('performs one-time legacy migration by cancelling non-calori_ notifications', async () => {
    await AsyncStorage.removeItem(LEGACY_MIGRATION_FLAG_KEY);

    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'legacy_random_notif_1',
        content: { data: {} },
        trigger: { date: 1770000000000 },
      },
      {
        identifier: 'calori_meal_lunch_2026-10-10',
        content: {
          data: {
            id: 'calori_meal_lunch_2026-10-10',
            fireAt: 1770000000000,
          },
        },
        trigger: { date: 1770000000000 },
      },
    ]);

    await NotificationReconciler.reconcile([]);

    // Legacy random notification should be cancelled
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'legacy_random_notif_1'
    );

    // Flag should now be set
    const flag = await AsyncStorage.getItem(LEGACY_MIGRATION_FLAG_KEY);
    expect(flag).toBe('true');
  });
});
