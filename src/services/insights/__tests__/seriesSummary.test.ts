import { summarizeSeries } from '../seriesSummary';

const week = [1720, 1980, 0, 1810, 0, 0, 0].map((value, i) => ({
  dateStr: `2026-11-0${i + 2}`,
  value,
}));

describe('summarizeSeries', () => {
  it('averages logged buckets only and counts elapsed buckets up to today', () => {
    const s = summarizeSeries(week, 1850, '2026-11-05', 'band')!;
    expect(s.avg).toBe(1837);
    expect(s.diff).toBe(-13);
    expect(s.elapsed).toBe(4);
    expect(s.max).toBe(1980);
    expect(s.min).toBe(1720);
  });

  it('counts calories within ±10% of goal as on target, and steps at or over goal', () => {
    // 1720, 1980, 1810 are all within 185 of 1850; a 300 kcal day is not
    expect(summarizeSeries(week, 1850, '2026-11-08', 'band')!.hits).toBe(3);
    expect(
      summarizeSeries([...week, { dateStr: '2026-11-09', value: 300 }], 1850, '2026-11-09', 'band')!
        .hits
    ).toBe(3);
    expect(summarizeSeries(week, 1850, '2026-11-08', 'floor')!.hits).toBe(1);
  });

  it('returns null when nothing is logged', () => {
    expect(
      summarizeSeries(
        week.map(p => ({ ...p, value: 0 })),
        1850,
        '2026-11-08',
        'band'
      )
    ).toBeNull();
  });
});
