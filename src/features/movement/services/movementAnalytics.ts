import { DailyLog } from '@/types';
import { DayStepData, DayCalorieData, DayTimeData } from '@/components/report';
import { calculateStepMetrics } from '@/utils/stepHistoryUtils';
import { DayBucketItem } from '@/features/nutrition/services/nutritionAnalytics';

export interface StepSummaryData {
  totalSteps: number;
  totalCalories: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
}

export interface MovementAnalyticsResult {
  stepDays: DayStepData[];
  calorieBurnDays: DayCalorieData[];
  timeDays: DayTimeData[];
  stepSummary: StepSummaryData;
}

// 0 steps means 0 minutes, not the 1-minute floor calculateStepMetrics applies
const metricsFor = (steps: number) => calculateStepMetrics(steps, steps > 0 ? undefined : 0);

/**
 * Computes step metrics, completion percentages, calorie burn, and duration trends.
 * Monthly/yearly bars are averages per logged day; the summary totals are real sums.
 */
export function computeMovementAnalytics(
  days: DayBucketItem[],
  dailyLogs: Record<string, DailyLog>,
  dailyStepGoal: number
): MovementAnalyticsResult {
  let totalSteps = 0;

  const stepDays: DayStepData[] = [];
  const calorieBurnDays: DayCalorieData[] = [];
  const timeDays: DayTimeData[] = [];

  days.forEach(item => {
    let steps = 0;

    if ('log' in item) {
      steps = item.log?.steps || 0;
      totalSteps += steps;
    } else {
      const dates = item.bucketDates || item.monthDates || [];
      let bucketSum = 0;
      let count = 0;
      dates.forEach(d => {
        const s = dailyLogs[d]?.steps;
        if (s && s > 0) {
          bucketSum += s;
          count++;
        }
      });
      steps = count > 0 ? Math.round(bucketSum / count) : 0;
      totalSteps += bucketSum;
    }

    const metrics = metricsFor(steps);

    stepDays.push({
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      steps,
      goalSteps: dailyStepGoal,
      completionPct: dailyStepGoal > 0 ? Math.round((steps / dailyStepGoal) * 100) : 0,
    });

    calorieBurnDays.push({
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      calories: metrics.calories,
    });

    timeDays.push({
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      durationMinutes: metrics.durationMinutes,
    });
  });

  const totals = metricsFor(totalSteps);

  return {
    stepDays,
    calorieBurnDays,
    timeDays,
    stepSummary: {
      totalSteps,
      totalCalories: totals.calories,
      totalDistanceKm: totals.distanceKm,
      totalDurationMinutes: totals.durationMinutes,
    },
  };
}
