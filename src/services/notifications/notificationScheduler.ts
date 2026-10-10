import { NotificationService, NotificationSettings } from './notificationService';
import { NOTIFICATION_CHANNELS } from '@/config/notificationChannels';

export type ReminderType =
  | 'hydration'
  | 'meal_breakfast'
  | 'meal_lunch'
  | 'meal_dinner'
  | 'streak_protection'
  | 'step_check';

export interface ReminderPlan {
  type: ReminderType;
  title: string;
  body: string;
  hour: number;
  minute: number;
  channelId: string;
  data: {
    route: 'food_vision' | 'water' | 'today';
    reminderType: ReminderType;
  };
}

export const STANDARD_REMINDERS: ReminderPlan[] = [
  {
    type: 'meal_breakfast',
    title: '🍳 Breakfast Time',
    body: 'Good morning! Log your breakfast to jumpstart your daily energy.',
    hour: 8,
    minute: 30,
    channelId: NOTIFICATION_CHANNELS.MEALS.id,
    data: {
      route: 'food_vision',
      reminderType: 'meal_breakfast',
    },
  },
  {
    type: 'hydration',
    title: '💧 Stay Hydrated',
    body: 'Time for a fresh glass of water to keep your metabolism performing at its peak.',
    hour: 11,
    minute: 0,
    channelId: NOTIFICATION_CHANNELS.WATER.id,
    data: {
      route: 'water',
      reminderType: 'hydration',
    },
  },
  {
    type: 'meal_lunch',
    title: '🥗 Fuel Your Afternoon',
    body: 'Midday meal? Snap a quick photo with Ria AI for effortless macro tracking.',
    hour: 13,
    minute: 0,
    channelId: NOTIFICATION_CHANNELS.MEALS.id,
    data: {
      route: 'food_vision',
      reminderType: 'meal_lunch',
    },
  },
  {
    type: 'hydration',
    title: '💧 Hydration Check',
    body: 'Take a quick sip! Reach your daily water goal step by step.',
    hour: 16,
    minute: 0,
    channelId: NOTIFICATION_CHANNELS.WATER.id,
    data: {
      route: 'water',
      reminderType: 'hydration',
    },
  },
  {
    type: 'step_check',
    title: '🚶 Afternoon Movement Check',
    body: 'Keep your momentum going! Take a quick walk to stay on pace for your daily step goal.',
    hour: 17,
    minute: 30,
    channelId: NOTIFICATION_CHANNELS.STEPS.id,
    data: {
      route: 'today',
      reminderType: 'step_check',
    },
  },
  {
    type: 'meal_dinner',
    title: '🍽️ Dinner Time',
    body: 'Dinner is served. Wrap up your nutrition log to see your daily progress.',
    hour: 19,
    minute: 30,
    channelId: NOTIFICATION_CHANNELS.MEALS.id,
    data: {
      route: 'food_vision',
      reminderType: 'meal_dinner',
    },
  },
];

export class NotificationScheduler {
  /**
   * Reschedules all wellness reminders based on current settings and user status.
   */
  public static async syncSchedules(options: {
    settings?: NotificationSettings;
    streakDays: number;
    hasLoggedMealsToday: boolean;
  }): Promise<{ scheduledCount: number }> {
    const settings = options.settings || (await NotificationService.getSettings());

    // 1. Clear existing queued notifications
    await NotificationService.cancelAllScheduledNotifications();

    let scheduledCount = 0;

    // 2. Schedule standard meal, water, and step prompts
    for (const reminder of STANDARD_REMINDERS) {
      const isWater = reminder.type === 'hydration';
      const isMeal = reminder.type.startsWith('meal_');
      const isStep = reminder.type === 'step_check';

      if (isWater && !settings.waterReminder) continue;
      if (isMeal && !settings.mealReminder) continue;
      if (isStep && !settings.stepReminder) continue;

      const triggerSeconds = this.calculateSecondsUntil(reminder.hour, reminder.minute);
      if (triggerSeconds > 0) {
        await NotificationService.scheduleNotification({
          title: reminder.title,
          body: reminder.body,
          triggerSeconds,
          channelId: reminder.channelId,
          data: reminder.data,
        });
        scheduledCount++;
      }
    }

    // 3. Schedule Streak Protection prompt
    if (settings.streakReminder && !options.hasLoggedMealsToday && options.streakDays > 0) {
      // Prompt at 21:00 (9 PM)
      const streakSeconds = this.calculateSecondsUntil(21, 0);
      if (streakSeconds > 0) {
        await NotificationService.scheduleNotification({
          title: `🔥 Protect Your ${options.streakDays}-Day Streak!`,
          body: "Don't let today slip away. Log a meal or drink before midnight to keep your flame burning!",
          triggerSeconds: streakSeconds,
          channelId: NOTIFICATION_CHANNELS.STREAK.id,
          data: {
            route: 'today',
            reminderType: 'streak_protection',
          },
        });
        scheduledCount++;
      }
    }

    return { scheduledCount };
  }

  /**
   * Calculates seconds remaining until target hour:minute today (or tomorrow if past).
   */
  public static calculateSecondsUntil(
    targetHour: number,
    targetMinute: number,
    now = new Date()
  ): number {
    const target = new Date(now);
    target.setHours(targetHour, targetMinute, 0, 0);

    if (target.getTime() <= now.getTime()) {
      // Already passed today, push to tomorrow
      target.setDate(target.getDate() + 1);
    }

    const diffSeconds = Math.max(1, Math.round((target.getTime() - now.getTime()) / 1000));
    return diffSeconds;
  }
}
