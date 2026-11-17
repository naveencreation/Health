import type { DailyLog } from '@/types';

/** Days a guest has actually logged something on (meals, water, steps or weight). */
export const countGuestLoggedDays = (dailyLogs: Record<string, DailyLog>): number =>
  Object.values(dailyLogs).filter(
    l =>
      (l.meals?.length ?? 0) > 0 ||
      l.waterMl > 0 ||
      l.steps > 0 ||
      (l.weightEntries?.length ?? 0) > 0 ||
      typeof l.weightKg === 'number'
  ).length;
