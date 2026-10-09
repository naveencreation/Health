import { UserGoals } from '@/types';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';

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

/**
 * Movement & step estimation coefficients grounded in exercise physiology.
 * Distance = steps * stride length (default ~0.415 * height)
 * Burn = steps * kcal/step factor adjusted for body mass
 */
export const MOVEMENT_DEFAULTS = Object.freeze({
  defaultStepGoal: 10000,
  minStepGoal: 1000,
  maxStepGoal: 50000,
  /**
   * Calculates estimated distance in km using user height (or default 175cm)
   * Average human walking stride is ~41.5% of height
   */
  calculateDistanceKm: (steps: number, heightCm: number = BIOMETRIC_DEFAULTS.heightCm!): number => {
    if (steps <= 0) return 0;
    const strideMeters = (Math.max(100, heightCm) * 0.415) / 100;
    const distanceKm = (steps * strideMeters) / 1000;
    return Math.round(distanceKm * 10) / 10;
  },
  /**
   * Calculates estimated calorie burn based on steps and body weight.
   * Standard gross energy expenditure is ~0.0005 kcal per step per kg body weight.
   */
  calculateStepBurnKcal: (
    steps: number,
    weightKg: number = BIOMETRIC_DEFAULTS.currentWeightKg
  ): number => {
    if (steps <= 0) return 0;
    const safeWeight = Math.max(30, weightKg);
    const burn = steps * 0.0005 * safeWeight;
    return Math.round(burn);
  },
  /**
   * Estimates active duration in minutes based on average cadence (100 steps/minute).
   */
  calculateActiveMinutes: (steps: number, cadenceStepsPerMin: number = 100): number => {
    if (steps <= 0) return 0;
    return Math.round(steps / Math.max(50, cadenceStepsPerMin));
  },
});

/**
 * WHO Clinical BMI Thresholds & classifications
 */
export const BMI_DEFAULTS = Object.freeze({
  underweightCeiling: 18.5,
  healthyCeiling: 25.0,
  overweightCeiling: 30.0,
  calculateBMI: (weightKg: number, heightCm: number): number => {
    const safeHeightM = Math.max(100, heightCm) / 100;
    const safeWeightKg = Math.max(30, weightKg);
    return Number((safeWeightKg / (safeHeightM * safeHeightM)).toFixed(1));
  },
});
