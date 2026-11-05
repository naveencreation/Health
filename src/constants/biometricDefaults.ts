import { UserGoals } from '@/types';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';

/** Estimated kcal burned per step; the one copy every burn figure must use. */
export const KCAL_PER_STEP = 0.04;

/**
 * Single authoritative source of truth for all default biometric metrics,
 * baseline user targets, and fallback numbers across Calorify.
 * Eliminates conflicting hardcoded fallbacks across hooks, screens, and services.
 */
export const BIOMETRIC_DEFAULTS: Readonly<UserGoals> = Object.freeze({
  name: 'Friend',
  dailyCalorieBudget: 2213,
  targetProtein: 90,
  targetCarbs: 110,
  targetFat: 70,
  targetFiber: 30,
  waterGoalMl: 2500,
  stepGoal: 10000,
  currentWeightKg: 68.0,
  targetWeightKg: 65.0,
  startWeightKg: 68.0,
  heightCm: 175,
  age: 24,
  gender: 'male',
  goal: 'maintain',
  weightUnit: 'kg',
  streakDays: 1,
  avatarUrl: DEFAULT_AVATAR_URL,
  riaTone: 'supportive',
  waterReminder: true,
  mealReminder: true,
  stepReminder: false,
});

/**
 * Standard container and drink size constants
 */
export const HYDRATION_DEFAULTS = Object.freeze({
  defaultCupSizeMl: 250,
  minWaterGoalMl: 500,
  maxWaterGoalMl: 6000,
  standardPresetsMl: [150, 250, 330, 500] as const,
});

