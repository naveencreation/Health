import { NotificationSettings, ReminderType } from './types';
import { NOTIFICATION_CHANNELS } from '@/config/notificationChannels';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  version: 2,
  enabled: true,
  quietHours: {
    start: '22:00',
    end: '07:00',
  },
  meals: {
    enabled: true,
    breakfast: '08:30',
    lunch: '13:00',
    dinner: '19:30',
    skipsBreakfast: false,
  },
  water: {
    enabled: true,
    intervalMinutes: 120,
  },
  steps: {
    enabled: true,
  },
  streak: {
    enabled: true,
  },
  weight: {
    enabled: false,
    time: '07:30',
  },
  // Backward compatibility fields
  waterReminder: true,
  mealReminder: true,
  stepReminder: true,
  streakReminder: true,
  weightReminder: false,
  waterIntervalMinutes: 120,
};

export const NOTIFICATION_CHANNELS_MAP: Record<ReminderType, string> = {
  meal_breakfast: NOTIFICATION_CHANNELS.MEALS.id,
  meal_lunch: NOTIFICATION_CHANNELS.MEALS.id,
  meal_dinner: NOTIFICATION_CHANNELS.MEALS.id,
  water: NOTIFICATION_CHANNELS.WATER.id,
  steps: NOTIFICATION_CHANNELS.STEPS.id,
  streak: NOTIFICATION_CHANNELS.STREAK.id,
  weight: NOTIFICATION_CHANNELS.STEPS.id,
};

export const REMINDER_PRIORITY: Record<ReminderType, number> = {
  streak: 4,
  meal_breakfast: 3,
  meal_lunch: 3,
  meal_dinner: 3,
  weight: 2.5,
  steps: 2,
  water: 1,
};
