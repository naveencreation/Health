import { NotificationService, NotificationSettings } from './notificationService';

export interface ReminderPlan {
  type: 'hydration' | 'meal_breakfast' | 'meal_lunch' | 'meal_dinner' | 'streak_protection';
  title: string;
  body: string;
  hour: number;
  minute: number;
}

export const STANDARD_REMINDERS: ReminderPlan[] = [
  {
    type: 'meal_breakfast',
    title: '🍳 Breakfast Time',
    body: 'Good morning! Log your breakfast to jumpstart your daily energy.',
    hour: 8,
    minute: 30,
  },
  {
    type: 'hydration',
    title: '💧 Stay Hydrated',
    body: 'Time for a fresh glass of water to keep your metabolism performing at its peak.',
    hour: 11,
    minute: 0,
  },
  {
    type: 'meal_lunch',
    title: '🥗 Fuel Your Afternoon',
    body: 'Midday meal? Snap a quick photo with Ria AI for effortless macro tracking.',
    hour: 13,
    minute: 0,
  },
  {
    type: 'hydration',
    title: '💧 Hydration Check',
    body: 'Take a quick sip! Reach your daily water goal step by step.',
    hour: 16,
    minute: 0,
  },
  {
    type: 'meal_dinner',
    title: '🍽️ Dinner Time',
    body: 'Dinner is served. Wrap up your nutrition log to see your daily progress.',
    hour: 19,
    minute: 30,
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

    // 2. Schedule standard meal & water prompts
    for (const reminder of STANDARD_REMINDERS) {
      const isWater = reminder.type === 'hydration';
      const isMeal = reminder.type.startsWith('meal_');

      if (isWater && !settings.waterReminder) continue;
      if (isMeal && !settings.mealReminder) continue;

      const triggerSeconds = this.calculateSecondsUntil(reminder.hour, reminder.minute);
      if (triggerSeconds > 0) {
        await NotificationService.scheduleNotification({
          title: reminder.title,
          body: reminder.body,
          triggerSeconds,
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
