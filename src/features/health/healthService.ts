import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeHealthConnect,
  getTodayStepsAggregate,
  getTodayStepsRecords,
  getStepsAggregateForDate,
  getStepsRecordsForDate,
  getTodayDateIsoString,
} from './healthConnect';

import { hasStepsPermission, requestStepsPermission } from './healthPermissions';

export const BACKFILL_STORAGE_KEY = '@calori_hc_backfill_completed_v1';

export async function isBackfillCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(BACKFILL_STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markBackfillCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(BACKFILL_STORAGE_KEY, 'true');
  } catch (e) {
    console.warn('[healthService] Failed to mark backfill completed:', e);
  }
}

export async function connectHealth() {
  const initialized = await initializeHealthConnect();

  if (!initialized) {
    return {
      success: false,
      reason: 'HEALTH_CONNECT_UNAVAILABLE' as const,
    };
  }

  let hasPermission = await hasStepsPermission();

  if (!hasPermission) {
    hasPermission = await requestStepsPermission();
  }

  if (!hasPermission) {
    return {
      success: false,
      reason: 'STEPS_PERMISSION_DENIED' as const,
    };
  }

  return {
    success: true,
    reason: null,
  };
}

/**
 * Reads both aggregate and interval records for any single YYYY-MM-DD date
 */
export async function getStepsForDate(dateStr: string): Promise<{ steps: number; records: any[] }> {
  try {
    const [result, records] = await Promise.all([
      getStepsAggregateForDate(dateStr),
      getStepsRecordsForDate(dateStr),
    ]);

    const aggregateTotal = result?.COUNT_TOTAL ?? 0;
    if (aggregateTotal > 0) {
      console.log('[healthService] Got aggregate steps for:', dateStr, aggregateTotal);
      return {
        steps: Math.round(aggregateTotal),
        records: records || [],
      };
    }

    // Fallback to summing raw records if aggregate returns 0
    if (Array.isArray(records) && records.length > 0) {
      const sum = records.reduce((acc, r: any) => acc + (r.count || 0), 0);
      console.log(
        '[healthService] Got sum from raw records for:',
        dateStr,
        sum,
        'from records:',
        records.length
      );
      return {
        steps: Math.round(sum),
        records,
      };
    }

    return { steps: 0, records: [] };
  } catch (error) {
    console.error('[healthService] Error fetching steps for:', dateStr, error);
    return { steps: 0, records: [] };
  }
}

export async function getTodaySteps(): Promise<number> {
  const data = await getStepsForDate(getTodayDateIsoString());
  return data.steps;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getTodayDateIsoString(d);
}

/**
 * Tier 2: Rolling 48-Hour Sync (Today + Yesterday)
 * Catches smartwatch sync delays (steps taken late at night that sync the next morning)
 */
export async function syncRolling48Hours(): Promise<{
  today: { dateStr: string; steps: number; records: any[] };
  yesterday: { dateStr: string; steps: number; records: any[] };
}> {
  const todayStr = getTodayDateIsoString();
  const yesterdayStr = getYesterdayDateString();

  const [todayData, yesterdayData] = await Promise.all([
    getStepsForDate(todayStr),
    getStepsForDate(yesterdayStr),
  ]);

  return {
    today: { dateStr: todayStr, ...todayData },
    yesterday: { dateStr: yesterdayStr, ...yesterdayData },
  };
}

/**
 * Tier 1: Initial 7-Day Backfill (One-time on first connect)
 * Backfills past 7 days prior to today so history screen immediately has real data
 */
export async function backfillPastSevenDays(): Promise<
  Array<{ dateStr: string; steps: number; records: any[] }>
> {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(getTodayDateIsoString(d));
  }

  const results = await Promise.all(
    dates.map(async dateStr => {
      const data = await getStepsForDate(dateStr);
      return { dateStr, ...data };
    })
  );

  await markBackfillCompleted();
  return results.filter(r => r.steps > 0);
}

/**
 * Tier 3: On-Demand Single-Day Fetch (Lazy Fetch)
 */
export async function fetchSingleDaySteps(
  dateStr: string
): Promise<{ steps: number; records: any[] }> {
  return getStepsForDate(dateStr);
}
