import { DailyLog } from '@/types';
import { DayCompletionData, DayHydrateData, DrinkTypeBreakdown } from '@/components/report';
import { getBeverageConfig } from '@/utils/beverageUtils';
import { DayBucketItem } from '@/features/nutrition/services/nutritionAnalytics';

export interface HydrationAnalyticsResult {
  waterCompletionDays: DayCompletionData[];
  hydrateDays: DayHydrateData[];
  drinkTypesBreakdown: DrinkTypeBreakdown[];
  totalDrinkVolume: number;
}

/**
 * Computes hydration completion percentages, daily intake volumes, and beverage type breakdowns.
 */
export function computeHydrationAnalytics(
  days: DayBucketItem[],
  dailyLogs: Record<string, DailyLog>,
  dailyWaterGoal: number
): HydrationAnalyticsResult {
  const cDays: DayCompletionData[] = [];
  const hDays: DayHydrateData[] = [];
  const beverageMap: Record<string, number> = {};
  let grandVolumeMl = 0;

  const addDrinks = (log?: DailyLog) => {
    if (!log) return;
    let entriesMl = 0;
    log.waterEntries?.forEach(wl => {
      const bevId = wl.beverageType || 'water';
      beverageMap[bevId] = (beverageMap[bevId] || 0) + (wl.amountMl || 0);
      entriesMl += wl.amountMl || 0;
    });
    // waterMl not covered by entries (older logs, merged totals) counts as plain water,
    // so the donut agrees with the completion charts
    const untracked = Math.max(0, (log.waterMl || 0) - entriesMl);
    if (untracked > 0) beverageMap.water = (beverageMap.water || 0) + untracked;
    grandVolumeMl += entriesMl + untracked;
  };

  days.forEach(item => {
    let ml = 0;

    if ('log' in item) {
      ml = item.log?.waterMl || 0;
      addDrinks(item.log);
    } else {
      const dates = item.bucketDates || item.monthDates || [];
      let bucketSum = 0;
      let count = 0;
      dates.forEach(d => {
        const w = dailyLogs[d]?.waterMl;
        if (w && w > 0) {
          bucketSum += w;
          count++;
        }
        addDrinks(dailyLogs[d]);
      });
      ml = count > 0 ? Math.round(bucketSum / count) : 0;
    }

    cDays.push({
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      intakeMl: ml,
      goalMl: dailyWaterGoal,
      completionPct: dailyWaterGoal > 0 ? Math.round((ml / dailyWaterGoal) * 100) : 0,
    });

    hDays.push({
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      intakeMl: ml,
    });
  });

  const breakdown: DrinkTypeBreakdown[] = Object.keys(beverageMap).map(bevId => {
    const cfg = getBeverageConfig(bevId);
    const volumeMl = beverageMap[bevId];
    return {
      id: bevId,
      name: cfg.name,
      color: cfg.color,
      amountMl: volumeMl,
      pct: grandVolumeMl > 0 ? Math.round((volumeMl / grandVolumeMl) * 100) : 0,
    };
  });

  breakdown.sort((a, b) => b.amountMl - a.amountMl);

  return {
    waterCompletionDays: cDays,
    hydrateDays: hDays,
    drinkTypesBreakdown: breakdown,
    totalDrinkVolume: grandVolumeMl,
  };
}
