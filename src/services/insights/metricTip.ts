import { weekendPattern } from './metricInsights';
import { InsightMetric } from './metricSeries';

export interface MetricTipInput {
  metric: InsightMetric;
  /** Average of the logged buckets (kcal, steps, mL, or weight in the user's unit) */
  avg: number | null;
  goal: number | null;
  /** Daily values with dates, for the weekend pattern (week and month views only) */
  dayValues?: { dateStr: string; value: number }[];
  /** Weight only */
  weightUnit?: string;
  weightToGoal?: number | null;
}

const compact = (n: number) =>
  n >= 10000
    ? `${Math.round(n / 1000)}k`
    : n >= 1000
      ? `${+(n / 1000).toFixed(1)}k`
      : String(Math.round(n));
const litres = (ml: number) => `${+(ml / 1000).toFixed(1)}`;

/** One warm, honest sentence for the Nomzo tip card, or null when there is nothing to say. */
export function buildMetricTip(input: MetricTipInput): string | null {
  const { metric, avg, goal } = input;
  if (avg === null || avg <= 0) return null;

  if (metric === 'steps') {
    const pattern = input.dayValues ? weekendPattern(input.dayValues) : null;
    if (pattern) {
      return `Your weekends drop to ~${compact(pattern.weekendAvg)}. A 20-minute walk on Sunday would lift your average.`;
    }
  }

  if (metric === 'weight') {
    const toGoal = input.weightToGoal;
    if (toGoal === null || toGoal === undefined) return null;
    if (toGoal < 0.05) return 'You are at your goal weight. Lovely work.';
    return `You are ${toGoal.toFixed(1)} ${input.weightUnit ?? 'kg'} from your goal weight. Steady wins.`;
  }

  if (!goal) return null;
  const diff = avg - goal;
  if (metric === 'calories') {
    if (Math.abs(diff) <= goal * 0.1) {
      return `You are averaging ${Math.round(avg).toLocaleString()} kcal a day, right in your zone.`;
    }
    return `You are averaging ${Math.round(avg).toLocaleString()} kcal a day, about ${Math.round(Math.abs(diff)).toLocaleString()} ${diff > 0 ? 'above' : 'below'} your goal.`;
  }
  if (metric === 'water') {
    return diff >= 0
      ? `You are averaging ${litres(avg)} L a day, at or above your ${litres(goal)} L goal.`
      : `You are averaging ${litres(avg)} L a day. A glass more each day would reach your ${litres(goal)} L goal.`;
  }
  return diff >= 0
    ? `You are averaging ${Math.round(avg).toLocaleString()} steps a day, past your ${Math.round(goal).toLocaleString()} goal.`
    : `You are averaging ${Math.round(avg).toLocaleString()} steps a day. A short extra walk would close the gap to ${Math.round(goal).toLocaleString()}.`;
}
