import { mapHealthConnectRecordsToStepEntries } from '../stepHistoryUtils';

const rec = (h: number, m: number, count: number) => ({
  count,
  startTime: new Date(2026, 0, 5, h, m).toISOString(),
  endTime: new Date(2026, 0, 5, h, m + 5).toISOString(),
});

describe('mapHealthConnectRecordsToStepEntries', () => {
  it('returns [] for empty input and skips non-positive counts', () => {
    expect(mapHealthConnectRecordsToStepEntries([])).toEqual([]);
    expect(mapHealthConnectRecordsToStepEntries([rec(8, 0, 0)])).toEqual([]);
  });

  it('buckets records into one entry per local hour, newest first', () => {
    const out = mapHealthConnectRecordsToStepEntries([rec(8, 5, 100), rec(8, 40, 50), rec(9, 10, 70)]);
    expect(out.map(e => e.steps)).toEqual([70, 150]);
    expect(out[1].id).toBe('hc_2026-01-05_08');
    expect(out[1].source).toBe('health_connect');
    expect(new Date(out[1].startTime!).getHours()).toBe(8);
    expect(new Date(out[1].startTime!).getMinutes()).toBe(0);
  });

  it('caps hundreds of raw records at 24 entries and keeps the total', () => {
    const records = Array.from({ length: 500 }, (_, i) => rec(i % 24, (i * 7) % 50, 3));
    const out = mapHealthConnectRecordsToStepEntries(records);
    expect(out.length).toBeLessThanOrEqual(24);
    expect(out.reduce((s, e) => s + e.steps, 0)).toBe(1500);
  });

  it('is deterministic', () => {
    const r = [rec(7, 0, 10), rec(12, 0, 20)];
    expect(mapHealthConnectRecordsToStepEntries(r)).toEqual(mapHealthConnectRecordsToStepEntries(r));
  });
});
