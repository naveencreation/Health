import type { DailyLog } from '@/types';

/**
 * Dates whose log object differs by reference between two snapshots. Mutations create new
 * objects only for the dates they touch, so this finds the dates a user edit changed.
 * Dates removed in `next` are ignored.
 */
export function changedLogDates(
  prev: Record<string, DailyLog>,
  next: Record<string, DailyLog>
): string[] {
  return Object.keys(next).filter(date => prev[date] !== next[date]);
}
