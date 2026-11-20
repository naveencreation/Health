import { DailyLog, UserGoals } from '@/types';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import { computeCalorieDays, computeMacroRatioDays } from '@/features/nutrition/services';
import { computeMovementAnalytics } from '@/features/movement/services';
import { computeHydrationAnalytics } from '@/features/hydration/services';
import { computeWeightAnalytics } from '@/features/weight/services';
import { PeriodDay } from './periodRange';
import { summarizeSeries, SeriesSummary } from './seriesSummary';

export type InsightMetric = 'calories' | 'steps' | 'water' | 'weight';

export interface MetricSeriesContext {
  dailyLogs: Record<string, DailyLog>;
  userGoals: UserGoals;
  todayStr: string;
}

export interface MetricSeries {
  metric: InsightMetric;
  /** Per bucket: kcal, steps, mL or weight in the user's unit. 0 (or null for weight) = empty. */
  values: (number | null)[];
  /** Calorie / step / water goal; null for weight */
  goal: number | null;
  /** Goal summary for calories (band), steps and water (floor); null when nothing is logged */
  summary: SeriesSummary | null;
  hasData: boolean;
  /** Buckets that have started (up to today) */
  elapsed: number;
  protein?: { avg: number; target: number };
  /** Per bucket macro energy in kcal (4/4/9 per gram, as computeMacroRatioDays); null = no macros logged */
  macroKcal?: ({ protein: number; carbs: number; fat: number } | null)[];
  /** Average grams per logged day and the targets, for the macro split */
  macroAvg?: {
    protein: number;
    carbs: number;
    fat: number;
    targets: { protein: number; carbs: number; fat: number };
  };
  /** Per daily bucket: plain water vs other drinks (mL); null when the log has no drink entries */
  waterSplit?: ({ waterMl: number; otherMl: number } | null)[];
  movement?: { totalSteps: number; distanceKm: number; burnedKcal: number };
  water?: { totalMl: number; topDrink: { name: string; pct: number } | null };
  weight?: {
    unit: 'kg' | 'lbs';
    unitFactor: number;
    currentKg: number | null;
    netChangeKg: number | null;
    targetKg?: number;
    loggedCount: number;
  };
}

export function buildMetricSeries(
  metric: InsightMetric,
  days: PeriodDay[],
  ctx: MetricSeriesContext
): MetricSeries {
  const { dailyLogs, userGoals, todayStr } = ctx;
  const elapsed = days.filter(d => d.dateStr <= todayStr).length;

  if (metric === 'calories') {
    const goal = userGoals.dailyCalorieBudget || BIOMETRIC_DEFAULTS.dailyCalorieBudget;
    const calDays = computeCalorieDays(days, goal, dailyLogs);
    const values = calDays.map(d => d.calories);
    const summary = summarizeSeries(
      calDays.map(d => ({ dateStr: d.dateStr, value: d.calories })),
      goal,
      todayStr,
      'band'
    );
    const macroDays = computeMacroRatioDays(days, userGoals, dailyLogs);
    const macroLogged = macroDays.filter(
      d => (d.proteinGrams ?? 0) + (d.carbsGrams ?? 0) + (d.fatGrams ?? 0) > 0
    );
    const avgG = (k: 'proteinGrams' | 'carbsGrams' | 'fatGrams') =>
      macroLogged.length
        ? Math.round(macroLogged.reduce((t, d) => t + (d[k] ?? 0), 0) / macroLogged.length)
        : 0;
    const protein = avgG('proteinGrams');
    const targets = {
      protein: userGoals.targetProtein || BIOMETRIC_DEFAULTS.targetProtein,
      carbs: userGoals.targetCarbs || BIOMETRIC_DEFAULTS.targetCarbs,
      fat: userGoals.targetFat || BIOMETRIC_DEFAULTS.targetFat,
    };
    const macroKcal = macroDays.map(d => {
      const p = (d.proteinGrams ?? 0) * 4;
      const c = (d.carbsGrams ?? 0) * 4;
      const f = (d.fatGrams ?? 0) * 9;
      return p + c + f > 0 ? { protein: p, carbs: c, fat: f } : null;
    });
    return {
      metric,
      values,
      goal,
      summary,
      hasData: summary !== null,
      elapsed,
      protein: { avg: protein, target: targets.protein },
      macroKcal,
      macroAvg: {
        protein,
        carbs: avgG('carbsGrams'),
        fat: avgG('fatGrams'),
        targets,
      },
    };
  }

  if (metric === 'steps') {
    const goal = userGoals.stepGoal || BIOMETRIC_DEFAULTS.stepGoal;
    const { stepDays, stepSummary } = computeMovementAnalytics(days, dailyLogs, goal);
    const values = stepDays.map(d => d.steps);
    const summary = summarizeSeries(
      stepDays.map(d => ({ dateStr: d.dateStr, value: d.steps })),
      goal,
      todayStr,
      'floor'
    );
    return {
      metric,
      values,
      goal,
      summary,
      hasData: summary !== null,
      elapsed,
      movement: {
        totalSteps: stepSummary.totalSteps,
        distanceKm: stepSummary.totalDistanceKm,
        burnedKcal: stepSummary.totalCalories,
      },
    };
  }

  if (metric === 'water') {
    const goal = userGoals.waterGoalMl || BIOMETRIC_DEFAULTS.waterGoalMl;
    const { waterCompletionDays, drinkTypesBreakdown, totalDrinkVolume } =
      computeHydrationAnalytics(days, dailyLogs, goal);
    const values = waterCompletionDays.map(d => d.intakeMl);
    const summary = summarizeSeries(
      waterCompletionDays.map(d => ({ dateStr: d.dateStr, value: d.intakeMl })),
      goal,
      todayStr,
      'floor'
    );
    const top = drinkTypesBreakdown.find(d => d.amountMl > 0);
    const waterSplit = days.map(d => {
      const entries = d.log?.waterEntries;
      if (!entries || entries.length === 0) return null;
      let plain = 0;
      let other = 0;
      entries.forEach(e => {
        if (!e.beverageType || e.beverageType === 'water') plain += e.amountMl || 0;
        else other += e.amountMl || 0;
      });
      plain += Math.max(0, (d.log?.waterMl || 0) - plain - other);
      return { waterMl: plain, otherMl: other };
    });
    return {
      metric,
      values,
      goal,
      summary,
      hasData: summary !== null,
      elapsed,
      waterSplit,
      water: {
        totalMl: totalDrinkVolume,
        topDrink: top ? { name: top.name, pct: top.pct } : null,
      },
    };
  }

  const unit: 'kg' | 'lbs' = userGoals.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitFactor = unit === 'lbs' ? 2.20462 : 1;
  const { weightTrendDays, weightSummary } = computeWeightAnalytics(
    days,
    dailyLogs,
    userGoals.currentWeightKg || BIOMETRIC_DEFAULTS.currentWeightKg,
    userGoals,
    unit,
    unitFactor
  );
  const values = weightTrendDays.map(d => d.displayWeight);
  const loggedCount = values.filter(v => v !== null).length;
  return {
    metric,
    values,
    goal: null,
    summary: null,
    hasData: loggedCount > 0,
    elapsed,
    weight: {
      unit,
      unitFactor,
      currentKg: weightSummary.currentWeightKg,
      netChangeKg: weightSummary.netChangeKg,
      targetKg: weightSummary.targetWeightKg,
      loggedCount,
    },
  };
}
