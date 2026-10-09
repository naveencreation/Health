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

    const res = computeWeightAnalytics(days, 72, goals, 'kg', 1);

    expect(res.weightTrendDays).toHaveLength(2);
    expect(res.weightTrendDays[0].weightKg).toBe(72);
    expect(res.weightTrendDays[0].displayWeight).toBe(72);
    expect(res.weightTrendDays[1].weightKg).toBe(71.5);
    expect(res.weightTrendDays[1].displayWeight).toBe(71.5);

    expect(res.weightSummary.startWeightKg).toBe(74);
    expect(res.weightSummary.currentWeightKg).toBe(71.5);
    expect(res.weightSummary.targetWeightKg).toBe(68);
    expect(res.weightSummary.netChangeKg).toBe(-2.5); // 71.5 - 74
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

    const res = computeWeightAnalytics(days, 70, null, 'lbs', 2.20462);

    expect(res.weightTrendDays[0].displayWeight).toBe(154.3); // 70 * 2.20462
    expect(res.weightSummary.currentWeightKg).toBe(70);
    expect(res.weightSummary.targetWeightKg).toBe(BIOMETRIC_DEFAULTS.currentWeightKg);
    expect(res.weightSummary.unit).toBe('lbs');
  });
});
