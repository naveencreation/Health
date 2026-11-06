import { MealType, DailyLog, UserGoals } from '@/types';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import { NotificationSettings } from './types';
import { NotificationStorage } from './storage/notificationStorage';
import { planNotifications } from './engine/planner';
import { NotificationReconciler, ReconcileResult } from './engine/reconciler';
import { NotificationService } from './notificationService';
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

export interface SyncSchedulesOptions {
  settings?: NotificationSettings;
  streakDays?: number;
  hasLoggedMealsToday?: boolean;
  loggedMealSlots?: MealType[];
  currentWaterMl?: number;
  targetWaterMl?: number;
  lastWaterLoggedAt?: number;
  hasLoggedWeightToday?: boolean;
  currentSteps?: number;
  stepGoal?: number;
  uid?: string;
  now?: number | Date;
  reason?: string;
}

/** Full planner context from today's log; every syncSchedules caller passes this, not a subset */
export const buildSyncOptions = (
  log: DailyLog | undefined,
  goals: Pick<UserGoals, 'streakDays' | 'waterGoalMl' | 'stepGoal'>,
  uid?: string
): SyncSchedulesOptions => ({
  streakDays: goals.streakDays || 0,
  hasLoggedMealsToday: Boolean(log?.meals?.length),
  loggedMealSlots: log?.meals?.map(m => m.mealType) || [],
  currentWaterMl: log?.waterMl || 0,
  targetWaterMl: goals.waterGoalMl || BIOMETRIC_DEFAULTS.waterGoalMl,
  lastWaterLoggedAt: log?.waterEntries?.length
    ? Math.max(...log.waterEntries.map(e => new Date(e.loggedAt).getTime()))
    : undefined,
  hasLoggedWeightToday: typeof log?.weightKg === 'number' || Boolean(log?.weightEntries?.length),
  currentSteps: log?.steps || 0,
  stepGoal: goals.stepGoal || BIOMETRIC_DEFAULTS.stepGoal,
  uid,
});

export class NotificationScheduler {
  /**
   * State-aware scheduler facade:
   * 1. Loads current user settings from NotificationStorage
   * 2. Purely plans scheduled notifications for the horizon
   * 3. Reconciles planned notifications against pending OS notifications via NotificationReconciler
   */
  public static async syncSchedules(
    options: SyncSchedulesOptions = {}
  ): Promise<{ scheduledCount: number; plannedCount: number; reconcileResult: ReconcileResult }> {
    const settings =
      options.settings || (await NotificationStorage.loadSettings(options.uid));

    // Derive logged meal slots from either explicit slots or hasLoggedMealsToday flag
    let loggedMealSlots: MealType[] = options.loggedMealSlots || [];
    if (loggedMealSlots.length === 0 && options.hasLoggedMealsToday) {
      loggedMealSlots = ['lunch'];
    }

    const planned = planNotifications({
      settings,
      now: options.now,
      loggedMealsToday: loggedMealSlots,
      waterStats:
        options.targetWaterMl !== undefined
          ? {
              currentMl: options.currentWaterMl || 0,
              targetMl: options.targetWaterMl,
              lastLoggedAt: options.lastWaterLoggedAt,
            }
          : undefined,
      streakDays: options.streakDays,
      hasLoggedWeightToday: options.hasLoggedWeightToday,
      stepStats:
        options.stepGoal !== undefined
          ? {
              currentSteps: options.currentSteps || 0,
              targetSteps: options.stepGoal,
            }
          : undefined,
    });

    const reconcileResult = await NotificationReconciler.reconcile(planned);

    return {
      scheduledCount: planned.length,
      plannedCount: planned.length,
      reconcileResult,
    };
  }

  /**
   * Cancels all scheduled notifications and resets settings.
   * Allowed ONLY on sign-out and full factory resets.
   */
  public static async cancelAllAndReset(uid?: string): Promise<void> {
    await NotificationService.cancelAllScheduledNotifications();
    await NotificationStorage.resetSettings(uid);
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
      target.setDate(target.getDate() + 1);
    }

    const diffSeconds = Math.max(1, Math.round((target.getTime() - now.getTime()) / 1000));
    return diffSeconds;
  }
}
