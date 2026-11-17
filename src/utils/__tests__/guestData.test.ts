import { countGuestLoggedDays } from '../guestData';
import type { DailyLog } from '@/types';

const day = (date: string, extra: Partial<DailyLog> = {}): DailyLog => ({
  date,
  meals: [],
  waterMl: 0,
  steps: 0,
  activities: [],
  ...extra,
});

describe('countGuestLoggedDays', () => {
  it('ignores empty days', () => {
    expect(countGuestLoggedDays({ a: day('a') })).toBe(0);
    expect(countGuestLoggedDays({})).toBe(0);
  });

  it('counts days with meals, water, steps or weight', () => {
    const logs = {
      a: day('a', { meals: [{ id: 'm' } as any] }),
      b: day('b', { waterMl: 250 }),
      c: day('c', { steps: 100 }),
      d: day('d', { weightKg: 70 }),
      e: day('e', { weightEntries: [{ id: 'w' } as any] }),
      f: day('f'),
    };
    expect(countGuestLoggedDays(logs)).toBe(5);
  });
});
