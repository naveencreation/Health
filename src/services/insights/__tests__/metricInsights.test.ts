import { trendProjection, weekendPattern, percentChange, goalStreak } from '../metricInsights';
import { smoothPath } from '../chartPaths';

describe('trendProjection', () => {
  it('needs two logged points', () => {
    expect(trendProjection([null, 72, null])).toBeNull();
    expect(trendProjection([])).toBeNull();
  });

  it('projects a perfect line to the last index', () => {
    expect(trendProjection([72.8, null, 72.4, null, 72.0, null, null])).toBeCloseTo(71.6, 5);
  });

  it('is flat for constant values', () => {
    expect(trendProjection([70, 70, null, 70])).toBeCloseTo(70, 5);
  });
});

describe('weekendPattern', () => {
  const week = (vals: number[]) =>
    vals.map((value, i) => ({ dateStr: `2026-11-${String(16 + i).padStart(2, '0')}`, value }));

  it('flags weekends under 70% of weekdays', () => {
    const p = weekendPattern(week([8000, 8000, 8000, 8000, 8000, 4000, 4000]));
    expect(p).toEqual({ weekdayAvg: 8000, weekendAvg: 4000 });
  });

  it('returns null when weekends hold up', () => {
    expect(weekendPattern(week([8000, 8000, 8000, 8000, 8000, 7000, 7000]))).toBeNull();
  });

  it('returns null without both weekday and weekend data', () => {
    expect(weekendPattern(week([8000, 8000, 8000, 0, 0, 0, 0]))).toBeNull();
    expect(weekendPattern(week([0, 0, 0, 0, 0, 3000, 3000]))).toBeNull();
  });
});

describe('percentChange', () => {
  it('rounds the change', () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange(7214, 6440)).toBe(12);
  });
  it('is null with nothing to compare', () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
    expect(percentChange(10, undefined)).toBeNull();
  });
});

describe('goalStreak', () => {
  it('counts back from the end index', () => {
    expect(goalStreak([1, 3, 3, 3, 0], 3, 3, false)).toBe(3);
  });
  it('forgives an unfinished end day', () => {
    expect(goalStreak([3, 3, 1], 3, 2, true)).toBe(2);
    expect(goalStreak([3, 3, 1], 3, 2, false)).toBe(0);
  });
  it('stops at the first miss', () => {
    expect(goalStreak([3, 1, 3, 3], 3, 3, false)).toBe(2);
  });
});

describe('smoothPath', () => {
  it('starts at the first point and ends at the last', () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 5 },
    ]);
    expect(d.startsWith('M0,10')).toBe(true);
    expect(d.endsWith('20,5')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
    expect(smoothPath([])).toBe('');
  });
});
