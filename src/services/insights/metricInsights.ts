import { parseDateString } from '@/utils/dateUtils';

/**
 * Least-squares line through the logged points (at least two), evaluated at the last index.
 * Used for the dotted weight "trend" that runs to the end of the period.
 */
export function trendProjection(values: (number | null)[]): number | null {
  const pts: { x: number; y: number }[] = [];
  values.forEach((v, x) => {
    if (v !== null && v !== undefined) pts.push({ x, y: v });
  });
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx;
  return my + slope * (values.length - 1 - mx);
}

export interface WeekendPattern {
  weekdayAvg: number;
  weekendAvg: number;
}

/** Weekend average below 70% of the weekday average (logged days only), else null. */
export function weekendPattern(
  dayValues: { dateStr: string; value: number }[]
): WeekendPattern | null {
  const weekday: number[] = [];
  const weekend: number[] = [];
  dayValues.forEach(({ dateStr, value }) => {
    if (!(value > 0)) return;
    const dow = parseDateString(dateStr).getDay();
    (dow === 0 || dow === 6 ? weekend : weekday).push(value);
  });
  if (weekday.length === 0 || weekend.length === 0) return null;
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const weekdayAvg = avg(weekday);
  const weekendAvg = avg(weekend);
  return weekendAvg < weekdayAvg * 0.7 ? { weekdayAvg, weekendAvg } : null;
}

/** Rounded percent change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Consecutive goal-meeting days ending at endIndex. When forgiveEnd is true and the end day
 * hasn't met the goal yet (today is still in progress), counting starts the day before.
 */
export function goalStreak(
  values: number[],
  goal: number,
  endIndex: number,
  forgiveEnd: boolean
): number {
  let i = Math.min(endIndex, values.length - 1);
  if (i >= 0 && forgiveEnd && values[i] < goal) i -= 1;
  let streak = 0;
  while (i >= 0 && goal > 0 && values[i] >= goal) {
    streak += 1;
    i -= 1;
  }
  return streak;
}

/** Average of the logged (positive) values, or null when none are logged. */
export function averageOfLogged(values: (number | null)[]): number | null {
  const logged = values.filter((v): v is number => v !== null && v > 0);
  return logged.length ? logged.reduce((s, v) => s + v, 0) / logged.length : null;
}
