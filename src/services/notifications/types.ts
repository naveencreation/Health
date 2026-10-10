import { MealType } from '@/types';

export type ReminderType =
  | 'meal_breakfast'
  | 'meal_lunch'
  | 'meal_dinner'
  | 'water'
  | 'steps'
  | 'streak'
  | 'weight';

export interface NotificationSettings {
  version: 2;
  enabled: boolean;
  quietHours: {
    start: string; // "22:00"
    end: string;   // "07:00"
  };
  meals: {
    enabled: boolean;
    breakfast: string; // "08:30"
    lunch: string;     // "13:00"
    dinner: string;    // "19:30"
    skipsBreakfast: boolean;
  };
  water: {
    enabled: boolean;
    intervalMinutes: 60 | 120 | 180;
  };
  steps: {
    enabled: boolean; // fixed 17:30
  };
  streak: {
    enabled: boolean; // fixed 21:00
  };
  weight: {
    enabled: boolean;
    time: string; // e.g. "07:30"
  };
  lastWaterLoggedAt?: number; // ms epoch

  // Backward compatibility fields
  waterReminder?: boolean;
  mealReminder?: boolean;
  stepReminder?: boolean;
  streakReminder?: boolean;
  weightReminder?: boolean;
  waterIntervalMinutes?: number;
}

export interface PlannedNotification {
  id: string; // `calori_${type}_${YYYY-MM-DD}` (water: `calori_water_${date}_${k}`)
  type: ReminderType;
  fireAt: number; // ms epoch
  channelId: string;
  title: string;
  body: string;
  data: {
    route: 'food_vision' | 'water' | 'today' | 'weight';
    reminderType: ReminderType;
    mealSlot?: MealType;
    [key: string]: any;
  };
}

export interface SyncNotificationsOptions {
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
}
