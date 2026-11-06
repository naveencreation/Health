import { computeMovementAnalytics } from '../movementAnalytics';
import { DailyLog } from '@/types';
import { DayBucketItem } from '@/features/nutrition/services/nutritionAnalytics';

describe('movementAnalytics', () => {
  it('computes steps, distance, calories, duration and summaries for single-day logs', () => {
    const days: DayBucketItem[] = [
      {
        dateStr: '2026-03-30',
        dayNum: 30,
        dayName: 'Mon',
        log: {
          date: '2026-03-30',
          steps: 10000,
        } as unknown as DailyLog,
      },
    ];

    const res = computeMovementAnalytics(days, {}, 10000);
    expect(res.stepDays).toHaveLength(1);
    expect(res.stepDays[0].steps).toBe(10000);
    expect(res.stepDays[0].goalSteps).toBe(10000);
    expect(res.stepDays[0].completionPct).toBe(100);

    expect(res.stepSummary.totalSteps).toBe(10000);
    expect(res.stepSummary.totalCalories).toBeGreaterThan(0);
    expect(res.stepSummary.totalDistanceKm).toBeGreaterThan(0);
    expect(res.stepSummary.totalDurationMinutes).toBe(100); // ~100 steps/min, not body weight
    expect(res.timeDays[0].durationMinutes).toBe(100);
  });

  it('aggregates step counts over bucket dates and averages them', () => {
    const dailyLogs: Record<string, DailyLog> = {
      '2026-03-01': { date: '2026-03-01', steps: 6000 } as unknown as DailyLog,
      '2026-03-02': { date: '2026-03-02', steps: 8000 } as unknown as DailyLog,
    };

    const days: DayBucketItem[] = [
      {
        dateStr: '2026-03-01',
        dayNum: 1,
        dayName: 'W1',
        bucketDates: ['2026-03-01', '2026-03-02'],
      },
    ];

    const res = computeMovementAnalytics(days, dailyLogs, 10000);
    expect(res.stepDays[0].steps).toBe(7000); // (6000 + 8000) / 2
    expect(res.stepDays[0].completionPct).toBe(70);
    expect(res.stepSummary.totalSteps).toBe(14000); // real sum, not the bucket average
  });

  it('reports zero duration for days without steps', () => {
    const days: DayBucketItem[] = [{ dateStr: '2026-03-31', dayNum: 31, dayName: 'Tue', log: undefined }];
    const res = computeMovementAnalytics(days, {}, 10000);
    expect(res.timeDays[0].durationMinutes).toBe(0);
    expect(res.stepSummary.totalDurationMinutes).toBe(0);
  });
});
