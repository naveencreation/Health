import { UserGoals } from '@/types';
import { DayWeightTrendData, WeightSummaryData } from '@/components/report';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import { DayBucketItem } from '@/features/nutrition/services/nutritionAnalytics';

export interface WeightAnalyticsResult {
  weightTrendDays: DayWeightTrendData[];
  weightSummary: WeightSummaryData;
}

/**
 * Computes weight tracking trend points, unit conversions, and delta metrics.
 */
export function computeWeightAnalytics(
  days: DayBucketItem[],
  userWeightKg: number = BIOMETRIC_DEFAULTS.currentWeightKg,
  userGoals?: UserGoals | null,
  weightUnit: 'kg' | 'lbs' = 'kg',
  unitFactor: number = 1
): WeightAnalyticsResult {
  const tDays: DayWeightTrendData[] = [];
  let latestWeight = userWeightKg;

  days.forEach(item => {
    let w = userWeightKg;

    if ('log' in item && item.log?.weightKg) {
      w = item.log.weightKg;
      latestWeight = w;
    }

    const displayWeight = Number((w * unitFactor).toFixed(1));
    tDays.push({
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      weightKg: w,
      displayWeight,
    });
  });

  const startW = userGoals?.startWeightKg || latestWeight;
  const currentW = latestWeight;
  const targetW = userGoals?.targetWeightKg || BIOMETRIC_DEFAULTS.currentWeightKg;
  const netChange = currentW - startW;

  const summary: WeightSummaryData = {
    currentWeightKg: Number(currentW.toFixed(1)),
    startWeightKg: Number(startW.toFixed(1)),
    targetWeightKg: Number(targetW.toFixed(1)),
    netChangeKg: Number(netChange.toFixed(1)),
    avgWeightKg: Number(currentW.toFixed(1)),
    unit: weightUnit,
  };

  return {
    weightTrendDays: tDays,
    weightSummary: summary,
  };
}
