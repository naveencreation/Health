import { DailyLog, UserGoals } from '@/types';
import { DayWeightTrendData, WeightSummaryData } from '@/components/report';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import { DayBucketItem } from '@/features/nutrition/services/nutritionAnalytics';

export interface WeightAnalyticsResult {
  weightTrendDays: DayWeightTrendData[];
  weightSummary: WeightSummaryData;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Computes weight trend points and period metrics from real weigh-ins only.
 * Days/buckets without a weigh-in are null (the chart shows "No entry").
 */
export function computeWeightAnalytics(
  days: DayBucketItem[],
  dailyLogs: Record<string, DailyLog>,
  userWeightKg: number = BIOMETRIC_DEFAULTS.currentWeightKg,
  userGoals?: UserGoals | null,
  weightUnit: 'kg' | 'lbs' = 'kg',
  unitFactor: number = 1
): WeightAnalyticsResult {
  const weighIns: number[] = []; // every weigh-in in the period, oldest first
  let periodEnd = '';

  const tDays: DayWeightTrendData[] = days.map(item => {
    const dates = 'log' in item ? [item.dateStr] : item.bucketDates || item.monthDates || [];
    const ws: number[] = [];
    dates.forEach(d => {
      const w = (item.log && d === item.dateStr ? item.log : dailyLogs[d])?.weightKg;
      if (typeof w === 'number' && w > 0) ws.push(w);
      if (d > periodEnd) periodEnd = d;
    });
    weighIns.push(...ws);
    const w = ws.length > 0 ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
    return {
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      weightKg: w,
      displayWeight: w === null ? null : Number((w * unitFactor).toFixed(1)),
    };
  });

  // Current = latest weigh-in on or before the period end, else the profile weight
  let currentW = weighIns.length > 0 ? weighIns[weighIns.length - 1] : null;
  if (currentW === null) {
    const prior = Object.keys(dailyLogs)
      .filter(d => d <= periodEnd && (dailyLogs[d]?.weightKg ?? 0) > 0)
      .sort()
      .pop();
    currentW = prior ? dailyLogs[prior].weightKg! : userWeightKg;
  }

  const summary: WeightSummaryData = {
    currentWeightKg: round2(currentW),
    startWeightKg: userGoals?.startWeightKg ? round2(userGoals.startWeightKg) : undefined,
    targetWeightKg: userGoals?.targetWeightKg ? round2(userGoals.targetWeightKg) : undefined,
    // Change within this period: last weigh-in minus first
    netChangeKg: weighIns.length >= 2 ? round2(weighIns[weighIns.length - 1] - weighIns[0]) : null,
    avgWeightKg:
      weighIns.length > 0 ? round2(weighIns.reduce((a, b) => a + b, 0) / weighIns.length) : null,
    unit: weightUnit,
  };

  return {
    weightTrendDays: tDays,
    weightSummary: summary,
  };
}
