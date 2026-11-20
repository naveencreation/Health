import { buildMetricTip } from '../metricTip';

const week = (vals: number[]) =>
  vals.map((value, i) => ({ dateStr: `2026-11-${String(16 + i).padStart(2, '0')}`, value }));

describe('buildMetricTip', () => {
  it('hides when there is no data', () => {
    expect(buildMetricTip({ metric: 'steps', avg: null, goal: 8000 })).toBeNull();
    expect(buildMetricTip({ metric: 'water', avg: 0, goal: 2500 })).toBeNull();
  });

  it('calls out a weekend drop in steps', () => {
    const tip = buildMetricTip({
      metric: 'steps',
      avg: 7000,
      goal: 8000,
      dayValues: week([8000, 8000, 8000, 8000, 8000, 4000, 4000]),
    });
    expect(tip).toContain('weekends drop to ~4k');
  });

  it('falls back to average versus goal without a pattern', () => {
    const tip = buildMetricTip({
      metric: 'steps',
      avg: 9000,
      goal: 8000,
      dayValues: week([9000, 9000, 9000, 9000, 9000, 9000, 9000]),
    });
    expect(tip).toContain('past your 8,000 goal');
  });

  it('describes calories in and out of the zone', () => {
    expect(buildMetricTip({ metric: 'calories', avg: 2100, goal: 2200 })).toContain(
      'right in your zone'
    );
    expect(buildMetricTip({ metric: 'calories', avg: 1500, goal: 2200 })).toContain('700 below');
  });

  it('describes water against the goal', () => {
    expect(buildMetricTip({ metric: 'water', avg: 2100, goal: 2500 })).toContain('2.1 L');
  });

  it('uses the distance to goal for weight, and hides without a target', () => {
    expect(
      buildMetricTip({ metric: 'weight', avg: 72, goal: null, weightUnit: 'kg', weightToGoal: 4.2 })
    ).toContain('4.2 kg from your goal');
    expect(
      buildMetricTip({ metric: 'weight', avg: 72, goal: null, weightToGoal: null })
    ).toBeNull();
  });
});
