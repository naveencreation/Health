import type { UserGoals } from '@/types';
import {
  calculateHealthPlan,
  minSafeTargetKg,
  type CalculatedHealthPlan,
  type GenderType,
  type GoalType,
} from './onboardingCalculator';

export const LBS_PER_KG = 2.20462;

export type GoalsField =
  | 'budget'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'water'
  | 'steps'
  | 'weight'
  | 'target'
  | 'height';
export type GoalsFormValues = Record<GoalsField, string>;
export type GoalsFormErrors = Partial<Record<GoalsField | 'macros', string>>;

/** Parses a typed number, accepting a comma decimal mark. NaN when empty, negative or not a number. */
export const parseDecimal = (s: string): number => {
  const t = s.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
};

export const isTeenAge = (age?: number) => typeof age === 'number' && age >= 13 && age <= 17;

/** Same floors as onboarding and the Ria card parser; 1600 for ages 13-17 */
export const calorieFloor = (gender?: string, age?: number) =>
  isTeenAge(age) ? 1600 : gender === 'female' ? 1200 : gender === 'male' ? 1500 : 1350;

export const toGoalType = (goal?: string): GoalType =>
  goal === 'lose' || goal === 'lose_weight'
    ? 'lose_weight'
    : goal === 'gain' || goal === 'gain_muscle'
      ? 'gain_muscle'
      : 'maintain';

/** The user's plan for a goal, from their stored biometrics (same formula as onboarding) */
export const planFor = (g: UserGoals, goal: GoalType = toGoalType(g.goal)): CalculatedHealthPlan =>
  calculateHealthPlan({
    age: g.age ?? 25,
    gender: (g.gender as GenderType) || 'prefer_not_to_say',
    heightCm: g.heightCm ?? 170,
    weightKg: g.currentWeightKg,
    targetWeightKg: g.targetWeightKg,
    goal,
    activityLevel: g.activityLevel,
    pace: g.pace,
  });

export const balancedCarbs = (budget: number, protein: number, fat: number) =>
  Math.max(0, Math.round((budget - protein * 4 - fat * 9) / 4));

const fmtWeight = (kg: number | undefined, unit: 'kg' | 'lbs') =>
  typeof kg === 'number' && kg > 0
    ? String(Math.round((unit === 'lbs' ? kg * LBS_PER_KG : kg) * 10) / 10)
    : '';

export const toGoalsForm = (g: UserGoals, unit: 'kg' | 'lbs'): GoalsFormValues => ({
  budget: String(g.dailyCalorieBudget || ''),
  protein: String(g.targetProtein ?? ''),
  carbs: String(g.targetCarbs ?? ''),
  fat: String(g.targetFat ?? ''),
  fiber: String(g.targetFiber ?? ''),
  water: String(g.waterGoalMl || ''),
  steps: String(g.stepGoal || ''),
  weight: fmtWeight(g.currentWeightKg, unit),
  target: fmtWeight(g.targetWeightKg, unit),
  height: g.heightCm ? String(Math.round(g.heightCm)) : '',
});

const RANGES: Record<Exclude<GoalsField, 'weight' | 'target' | 'height' | 'budget'>, [number, number]> =
  {
    protein: [0, 400],
    carbs: [0, 900],
    fat: [0, 300],
    fiber: [0, 150],
    water: [500, 8000],
    steps: [500, 50000],
  };

export interface ValidatedGoals {
  dailyCalorieBudget: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  waterGoalMl: number;
  stepGoal: number;
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm?: number;
}

/** Validates the Goals form; returns kg/cm values only when every field is valid. */
export function validateGoalsForm(
  v: GoalsFormValues,
  ctx: { unit: 'kg' | 'lbs'; gender?: string; age?: number }
): { errors: GoalsFormErrors; goals?: ValidatedGoals } {
  const errors: GoalsFormErrors = {};
  const n = {} as Record<GoalsField, number>;
  for (const key of Object.keys(v) as GoalsField[]) n[key] = parseDecimal(v[key]);

  const floor = calorieFloor(ctx.gender, ctx.age);
  if (Number.isNaN(n.budget)) errors.budget = 'Enter a number';
  else if (n.budget < floor) errors.budget = `At least ${floor} kcal for safety`;
  else if (n.budget > 6000) errors.budget = 'At most 6000 kcal';

  for (const [key, [lo, hi]] of Object.entries(RANGES) as [GoalsField, [number, number]][]) {
    if (Number.isNaN(n[key])) errors[key] = 'Enter a number';
    else if (n[key] < lo || n[key] > hi) errors[key] = `Between ${lo} and ${hi}`;
  }

  const toKg = (x: number) => (ctx.unit === 'lbs' ? x / LBS_PER_KG : x);
  const [wLo, wHi] = ctx.unit === 'lbs' ? [66, 661] : [30, 300];
  for (const key of ['weight', 'target'] as const) {
    if (Number.isNaN(n[key])) errors[key] = 'Enter a number';
    else if (n[key] < wLo || n[key] > wHi) errors[key] = `Between ${wLo} and ${wHi} ${ctx.unit}`;
  }

  // Height is optional; when given it must be in centimetres
  const hasHeight = v.height.trim() !== '';
  if (hasHeight && (Number.isNaN(n.height) || n.height < 100 || n.height > 250)) {
    errors.height = 'Enter height in cm (100-250)';
  }
  if (!errors.target && !errors.height && hasHeight) {
    const minKg = minSafeTargetKg(n.height);
    if (toKg(n.target) < minKg) {
      const shown = ctx.unit === 'lbs' ? Math.ceil(minKg * LBS_PER_KG) : Math.ceil(minKg);
      errors.target = `Below a healthy weight for your height (min ${shown} ${ctx.unit})`;
    }
  }

  if (!errors.budget && !errors.protein && !errors.carbs && !errors.fat) {
    const macroKcal = Math.round(n.protein * 4 + n.carbs * 4 + n.fat * 9);
    if (Math.abs(macroKcal - n.budget) > 50) {
      errors.macros = `Macros add up to ${macroKcal} kcal but the budget is ${Math.round(n.budget)} kcal`;
    }
  }

  if (Object.keys(errors).length > 0) return { errors };
  const round2 = (x: number) => Math.round(x * 100) / 100;
  return {
    errors,
    goals: {
      dailyCalorieBudget: Math.round(n.budget),
      targetProtein: Math.round(n.protein),
      targetCarbs: Math.round(n.carbs),
      targetFat: Math.round(n.fat),
      targetFiber: Math.round(n.fiber),
      waterGoalMl: Math.round(n.water),
      stepGoal: Math.round(n.steps),
      currentWeightKg: round2(toKg(n.weight)),
      targetWeightKg: round2(toKg(n.target)),
      ...(hasHeight ? { heightCm: Math.round(n.height) } : {}),
    },
  };
}
