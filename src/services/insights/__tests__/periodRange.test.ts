import { buildPeriodRange, defaultSelectedIndex } from '../periodRange';

describe('buildPeriodRange', () => {
  it('builds a Mon-Sun week', () => {
    const r = buildPeriodRange('weekly', 0, '2026-11-18', {}); // Wednesday
    expect(r.days.map(d => d.dateStr)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(r.days.map(d => d.axisLabel).join('')).toBe('MTWTFSS');
    expect(r.days[2].tooltipLabel).toBe('Wed');
    expect(r.days[2].dayName).toBe('Wednesday 18');
    expect(r.days[2].tooltipTitle).toBe('Wed, 18 Nov');
    expect(r.label).toBe('16–22 Nov');
    expect(r.canGoForward).toBe(false);
  });

  it('keeps Sunday in the week that started the Monday before', () => {
    const r = buildPeriodRange('weekly', 0, '2026-11-22', {});
    expect(r.days[0].dateStr).toBe('2026-11-16');
    expect(defaultSelectedIndex(r, '2026-11-22')).toBe(6);
  });

  it('steps back by whole weeks and labels a month crossing', () => {
    const r = buildPeriodRange('weekly', -2, '2026-11-18', {});
    expect(r.days[0].dateStr).toBe('2026-11-02');
    const cross = buildPeriodRange('weekly', -3, '2026-11-18', {});
    expect(cross.label).toBe('26 Oct – 1 Nov');
    expect(cross.canGoForward).toBe(true);
  });

  it('attaches the daily log to weekly buckets', () => {
    const log = { meals: [] } as any;
    const w = buildPeriodRange('weekly', 0, '2026-11-18', { '2026-11-17': log });
    expect(w.days[1].log).toBe(log);
    expect('log' in w.days[0]).toBe(true);
  });

  it.each([
    ['2026-11-18', 0, 30],
    ['2026-11-18', -9, 28], // Feb 2026
    ['2028-02-10', 0, 29], // leap year
    ['2026-12-05', 0, 31],
  ])('month of %s offset %i has %i day buckets', (today, offset, count) => {
    const r = buildPeriodRange('monthly', offset, today, {});
    expect(r.days).toHaveLength(count);
    expect(r.allDates).toHaveLength(count);
    expect(r.days[0].axisLabel).toBe('1');
    expect(r.days[count - 1].axisLabel).toBe(String(count));
    expect('log' in r.days[0]).toBe(true);
  });

  it('labels the month and its comparison month', () => {
    const r = buildPeriodRange('monthly', 0, '2026-11-18', {});
    expect(r.label).toBe('November 2026');
    expect(r.comparisonLabel).toBe('October');
    expect(r.days[17].tooltipLabel).toBe('Nov 18');
    expect(buildPeriodRange('monthly', 0, '2026-01-05', {}).comparisonLabel).toBe('December');
  });

  it('builds 12 month buckets for a year', () => {
    const r = buildPeriodRange('yearly', 0, '2026-11-18', {});
    expect(r.days).toHaveLength(12);
    expect(r.days[1].monthDates).toHaveLength(28);
    expect(r.days[11].monthDates?.[30]).toBe('2026-12-31');
    expect(r.allDates).toHaveLength(365);
    expect(r.label).toBe('2026');
    expect(r.comparisonLabel).toBe('2025');
    expect('log' in r.days[0]).toBe(false);
    expect(defaultSelectedIndex(r, '2026-11-18')).toBe(10);
  });

  it('allows going forward only from a past period', () => {
    expect(buildPeriodRange('yearly', 0, '2026-11-18', {}).canGoForward).toBe(false);
    expect(buildPeriodRange('yearly', -1, '2026-11-18', {}).canGoForward).toBe(true);
  });

  it('selects the last day of a past week', () => {
    const r = buildPeriodRange('weekly', -1, '2026-11-18', {});
    expect(defaultSelectedIndex(r, '2026-11-18')).toBe(6);
  });
});
