import { changedLogDates } from '../changedLogDates';
import type { DailyLog } from '@/types';

const log = (date: string): DailyLog => ({ date, meals: [], waterMl: 0, steps: 0, activities: [] });

describe('changedLogDates', () => {
  const a = log('2026-01-01');
  const b = log('2026-01-02');

  it('returns nothing for the same snapshot', () => {
    expect(changedLogDates({ a, b }, { a, b })).toEqual([]);
  });

  it('returns dates with a new object, added dates, and ignores removed ones', () => {
    const b2 = { ...b };
    const c = log('2026-01-03');
    expect(changedLogDates({ a, b }, { a, b: b2, c }).sort()).toEqual(['b', 'c']);
    expect(changedLogDates({ a, b }, { a })).toEqual([]);
  });
});
