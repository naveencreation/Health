import { computeWeightAnalytics } from '../weightAnalytics';
import { DailyLog, UserGoals } from '@/types';
import { DayBucketItem } from '@/features/nutrition/services/nutritionAnalytics';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';

describe('weightAnalytics', () => {
  it('computes trend days and weight summary in kg', () => {
    const days: DayBucketItem[] = [
      {
        dateStr: '2026-03-01',
        dayNum: 1,
        dayName: 'Sun',
        log: { date: '2026-03-01', weightKg: 72 } as unknown as DailyLog,
      },
      {
        dateStr: '2026-03-02',
        dayNum: 2,
        dayName: 'Mon',
        log: { date: '2026-03-02', weightKg: 71.5 } as unknown as DailyLog,
      },
    ];

    const goals: UserGoals = {
      ...BIOMETRIC_DEFAULTS,
      startWeightKg: 74,
      targetWeightKg: 68,
    };

    const res = computeWeightAnalytics(days, {}, 72, goals, 'kg', 1);

    expect(res.weightTrendDays).toHaveLength(2);
    expect(res.weightTrendDays[0].weightKg).toBe(72);
    expect(res.weightTrendDays[0].displayWeight).toBe(72);
    expect(res.weightTrendDays[1].weightKg).toBe(71.5);
    expect(res.weightTrendDays[1].displayWeight).toBe(71.5);

    expect(res.weightSummary.startWeightKg).toBe(74);
    expect(res.weightSummary.currentWeightKg).toBe(71.5);
    expect(res.weightSummary.targetWeightKg).toBe(68);
    expect(res.weightSummary.netChangeKg).toBe(-0.5); // last - first weigh-in this period
    expect(res.weightSummary.avgWeightKg).toBe(71.75);
    expect(res.weightSummary.unit).toBe('kg');
  });

  it('computes trend days and unit conversions for lbs', () => {
    const days: DayBucketItem[] = [
      {
        dateStr: '2026-03-01',
        dayNum: 1,
        dayName: 'Sun',
        log: { date: '2026-03-01', weightKg: 70 } as unknown as DailyLog,
      },
    ];

    const res = computeWeightAnalytics(days, {}, 70, null, 'lbs', 2.20462);

    expect(res.weightTrendDays[0].displayWeight).toBe(154.3); // 70 * 2.20462
    expect(res.weightSummary.currentWeightKg).toBe(70);
    expect(res.weightSummary.targetWeightKg).toBeUndefined(); // no invented goal
    expect(res.weightSummary.unit).toBe('lbs');
  });

  it('leaves days without a weigh-in empty and averages bucket weigh-ins from logs', () => {
    const dailyLogs: Record<string, DailyLog> = {
      '2026-02-20': { date: '2026-02-20', weightKg: 75 } as unknown as DailyLog,
      '2026-03-01': { date: '2026-03-01', weightKg: 72 } as unknown as DailyLog,
      '2026-03-03': { date: '2026-03-03', weightKg: 71 } as unknown as DailyLog,
    };
    const weekly: DayBucketItem[] = [
      { dateStr: '2026-03-05', dayNum: 5, dayName: 'Thu', log: undefined },
    ];
    const buckets: DayBucketItem[] = [
      { dateStr: '2026-03-01', dayNum: 1, dayName: 'W1', bucketDates: ['2026-03-01', '2026-03-03'] },
      { dateStr: '2026-03-08', dayNum: 2, dayName: 'W2', bucketDates: ['2026-03-08'] },
    ];

    const empty = computeWeightAnalytics(weekly, dailyLogs, 80, null);
    expect(empty.weightTrendDays[0].displayWeight).toBeNull();
    expect(empty.weightSummary.avgWeightKg).toBeNull();
    expect(empty.weightSummary.currentWeightKg).toBe(71); // latest weigh-in before the period

    const res = computeWeightAnalytics(buckets, dailyLogs, 80, null);
    expect(res.weightTrendDays[0].weightKg).toBe(71.5);
    expect(res.weightTrendDays[1].weightKg).toBeNull();
    expect(res.weightSummary.netChangeKg).toBe(-1);
  });
});
