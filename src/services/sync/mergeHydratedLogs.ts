import type { DailyLog } from '@/types';

/**
 * Merges cloud logs into local logs at hydration. Dates in `pending` have local edits the cloud
 * never received, so the local log wins entirely (it is re-uploaded by the sync effect).
 */
export function mergeHydratedLogs(
  local: Record<string, DailyLog>,
  cloud: Record<string, DailyLog>,
  pending: ReadonlySet<string>
): Record<string, DailyLog> {
  const merged: Record<string, DailyLog> = { ...local };

  for (const [dateKey, cloudLog] of Object.entries(cloud)) {
    const localLog = local[dateKey];
    if (!localLog) {
      merged[dateKey] = cloudLog;
    } else if (!pending.has(dateKey)) {
      const localEntries = localLog.waterEntries || [];
      const cloudEntries = cloudLog.waterEntries || [];

      merged[dateKey] = {
        ...cloudLog,
        meals: cloudLog.meals && cloudLog.meals.length > 0 ? cloudLog.meals : localLog.meals || [],
        waterMl: Math.max(cloudLog.waterMl || 0, localLog.waterMl || 0),
        waterEntries: cloudEntries.length >= localEntries.length ? cloudEntries : localEntries,
        steps: Math.max(cloudLog.steps || 0, localLog.steps || 0),
        activities:
          cloudLog.activities && cloudLog.activities.length > 0
            ? cloudLog.activities
            : localLog.activities || [],
      };
    }
  }
  return merged;
}
