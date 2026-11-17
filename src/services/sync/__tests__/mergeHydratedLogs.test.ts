import { mergeHydratedLogs } from '../mergeHydratedLogs';
import type { DailyLog } from '@/types';

const meal = (id: string) => ({ id }) as any;
const log = (date: string, p: Partial<DailyLog> = {}): DailyLog => ({
  date,
  meals: [],
  waterMl: 0,
  steps: 0,
  activities: [],
  ...p,
});

describe('mergeHydratedLogs', () => {
  const d = '2026-01-02';

  it('pending date keeps local log entirely', () => {
    const local = { [d]: log(d, { meals: [meal('offline')], waterMl: 100 }) };
    const cloud = { [d]: log(d, { meals: [meal('cloud')], waterMl: 500, steps: 9 }) };
    const out = mergeHydratedLogs(local, cloud, new Set([d]));
    expect(out[d]).toBe(local[d]);
  });

  it('non-pending date: cloud meals win, water/steps max, longer water entries', () => {
    const local = {
      [d]: log(d, {
        meals: [meal('l')],
        waterMl: 900,
        steps: 1,
        waterEntries: [{ id: 'a' }, { id: 'b' }] as any,
        activities: [{ id: 'la' }] as any,
      }),
    };
    const cloud = {
      [d]: log(d, {
        meals: [meal('c')],
        waterMl: 500,
        steps: 7,
        waterEntries: [{ id: 'a' }] as any,
      }),
    };
    const out = mergeHydratedLogs(local, cloud, new Set())[d];
    expect(out.meals).toEqual([meal('c')]);
    expect(out.waterMl).toBe(900);
    expect(out.steps).toBe(7);
    expect(out.waterEntries).toHaveLength(2);
    expect(out.activities).toEqual([{ id: 'la' }]);
  });

  it('keeps local-only and cloud-only dates', () => {
    const local = { '2026-01-01': log('2026-01-01') };
    const cloud = { '2026-01-03': log('2026-01-03') };
    const out = mergeHydratedLogs(local, cloud, new Set(['2026-01-01']));
    expect(Object.keys(out).sort()).toEqual(['2026-01-01', '2026-01-03']);
  });

  it('empty pending set matches cloud-wins behaviour; local meals kept if cloud empty', () => {
    const local = { [d]: log(d, { meals: [meal('l')] }) };
    const cloud = { [d]: log(d) };
    expect(mergeHydratedLogs(local, cloud, new Set())[d].meals).toEqual([meal('l')]);
  });
});
