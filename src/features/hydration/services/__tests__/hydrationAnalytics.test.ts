import { computeHydrationAnalytics } from '../hydrationAnalytics';
import { DailyLog } from '@/types';
import { DayBucketItem } from '@/features/nutrition/services/nutritionAnalytics';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('hydrationAnalytics', () => {
  it('computes water volume, completion percentage, and beverage breakdown', () => {
    const days: DayBucketItem[] = [
      {
        dateStr: '2026-03-30',
        dayNum: 30,
        dayName: 'Mon',
        log: {
          date: '2026-03-30',
          waterMl: 2000,
          waterEntries: [
            { id: '1', amountMl: 1500, beverageType: 'water', timestamp: '09:00' },
            { id: '2', amountMl: 500, beverageType: 'tea', timestamp: '14:00' },
          ],
        } as unknown as DailyLog,
      },
    ];

    const res = computeHydrationAnalytics(days, {}, 2500);
    expect(res.waterCompletionDays).toHaveLength(1);
    expect(res.waterCompletionDays[0].intakeMl).toBe(2000);
    expect(res.waterCompletionDays[0].goalMl).toBe(2500);
    expect(res.waterCompletionDays[0].completionPct).toBe(80); // (2000 / 2500) * 100

    expect(res.totalDrinkVolume).toBe(2000);
    expect(res.drinkTypesBreakdown).toHaveLength(2);
    expect(res.drinkTypesBreakdown[0].id).toBe('water');
    expect(res.drinkTypesBreakdown[0].amountMl).toBe(1500);
    expect(res.drinkTypesBreakdown[0].pct).toBe(75);
    expect(res.drinkTypesBreakdown[1].id).toBe('tea');
    expect(res.drinkTypesBreakdown[1].amountMl).toBe(500);
    expect(res.drinkTypesBreakdown[1].pct).toBe(25);
  });

  it('aggregates and averages water intake across bucket dates', () => {
    const dailyLogs: Record<string, DailyLog> = {
      '2026-03-01': { date: '2026-03-01', waterMl: 2000 } as DailyLog,
      '2026-03-02': { date: '2026-03-02', waterMl: 3000 } as DailyLog,
    };

    const days: DayBucketItem[] = [
      {
        dateStr: '2026-03-01',
        dayNum: 1,
        dayName: 'W1',
        bucketDates: ['2026-03-01', '2026-03-02'],
      },
    ];

    const res = computeHydrationAnalytics(days, dailyLogs, 2500);
    expect(res.waterCompletionDays[0].intakeMl).toBe(2500);
    expect(res.waterCompletionDays[0].completionPct).toBe(100);
  });
});
