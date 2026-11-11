export interface SeriesPoint {
  dateStr: string;
  value: number;
}

export interface SeriesSummary {
  avg: number;
  diff: number; // avg - goal
  hits: number; // logged buckets that met the goal
  elapsed: number; // buckets that have started (future ones can't meet a goal)
  max: number;
  min: number;
}

/**
 * Period summary for a per-bucket series. Empty buckets (value 0) don't count toward avg/min/max.
 * 'band': within ±10% of the goal counts (calories; a 300 kcal day is not "on target").
 * 'floor': at or over the goal counts (steps, water).
 */
export function summarizeSeries(
  points: SeriesPoint[],
  goal: number,
  todayStr: string,
  mode: 'band' | 'floor'
): SeriesSummary | null {
  const logged = points.filter(p => p.value > 0);
  if (logged.length === 0) return null;
  const values = logged.map(p => p.value);
  const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  return {
    avg,
    diff: avg - goal,
    hits: values.filter(v => (mode === 'band' ? Math.abs(v - goal) <= goal * 0.1 : v >= goal))
      .length,
    elapsed: points.filter(p => p.dateStr <= todayStr).length,
    max: Math.max(...values),
    min: Math.min(...values),
  };
}
