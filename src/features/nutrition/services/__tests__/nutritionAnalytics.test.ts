import {
  extractLogNutrition,
  computeCalorieDays,
  computeMacroRatioDays,
  DayBucketItem,
} from '../nutritionAnalytics';
import { DailyLog, UserGoals } from '@/types';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';

describe('nutritionAnalytics', () => {
  describe('extractLogNutrition', () => {
    it('returns zeroes when log is undefined', () => {
      const result = extractLogNutrition(undefined);
      expect(result).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        burnedCalories: 0,
      });
    });

    it('aggregates meals and activities correctly', () => {
      const mockLog = {
        date: '2026-03-30',
        meals: [
          {
            id: 'm1',
            name: 'Breakfast',
            calories: 450,
            protein: 25,
            carbs: 50,
            fat: 15,
            fiber: 5,
            timestamp: '08:00',
          },
          {
            id: 'm2',
            name: 'Lunch',
            calories: 600,
            protein: 40,
            carbs: 60,
            fat: 20,
            fiber: 8,
            timestamp: '12:30',
          },
        ],
        activities: [
          {
            id: 'a1',
            name: 'Running',
            caloriesBurned: 320,
            durationMinutes: 30,
            timestamp: '07:00',
          },
        ],
      } as unknown as DailyLog;

      const result = extractLogNutrition(mockLog);
      expect(result.calories).toBe(1050);
      expect(result.protein).toBe(65);
      expect(result.carbs).toBe(110);
      expect(result.fat).toBe(35);
      expect(result.fiber).toBe(13);
      expect(result.burnedCalories).toBe(320);
    });
  });

  describe('computeCalorieDays', () => {
    it('computes daily items with single-day logs', () => {
      const days: DayBucketItem[] = [
        {
          dateStr: '2026-03-30',
          dayNum: 30,
          dayName: 'Mon',
          log: {
            date: '2026-03-30',
            meals: [
              { id: '1', name: 'Meal', calories: 1800, protein: 100, carbs: 200, fat: 60, timestamp: '12:00' },
            ],
          } as unknown as DailyLog,
        },
      ];

      const res = computeCalorieDays(days, 2000, {});
      expect(res).toHaveLength(1);
      expect(res[0].calories).toBe(1800);
      expect(res[0].goalCalories).toBe(2000);
    });

    it('computes averages for bucketed days (monthly/yearly)', () => {
      const dailyLogs: Record<string, DailyLog> = {
        '2026-03-01': {
          date: '2026-03-01',
          meals: [{ id: '1', name: 'M1', calories: 2000, protein: 100, carbs: 200, fat: 50, timestamp: '12:00' }],
        } as unknown as DailyLog,
        '2026-03-02': {
          date: '2026-03-02',
          meals: [{ id: '2', name: 'M2', calories: 2400, protein: 120, carbs: 250, fat: 70, timestamp: '12:00' }],
        } as unknown as DailyLog,
      };

      const days: DayBucketItem[] = [
        {
          dateStr: '2026-03-01',
          dayNum: 1,
          dayName: 'W1',
          bucketDates: ['2026-03-01', '2026-03-02'],
        },
      ];

      const res = computeCalorieDays(days, 2200, dailyLogs);
      expect(res[0].calories).toBe(2200); // (2000 + 2400) / 2
      expect(res[0].goalCalories).toBe(2200);
    });
  });

  describe('computeMacroRatioDays', () => {
    const defaultGoals: UserGoals = {
      ...BIOMETRIC_DEFAULTS,
      dailyCalorieBudget: 2000,
      targetProtein: 100,
      targetCarbs: 225,
      targetFat: 78,
      waterGoalMl: 2500,
      stepGoal: 10000,
    };

    it('calculates macro percentages correctly from meals', () => {
      const days: DayBucketItem[] = [
        {
          dateStr: '2026-03-30',
          dayNum: 30,
          dayName: 'Mon',
          log: {
            date: '2026-03-30',
            meals: [
              // 50g protein = 200 kcal, 100g carbs = 400 kcal, 20g fat = 180 kcal -> total 780 kcal
              { id: '1', name: 'M', calories: 780, protein: 50, carbs: 100, fat: 20, fiber: 5, timestamp: '12:00' },
            ],
          } as unknown as DailyLog,
        },
      ];

      const res = computeMacroRatioDays(days, defaultGoals, {});
      expect(res).toHaveLength(1);
      expect(res[0].carbs).toBe(100);
      expect(res[0].protein).toBe(50);
      expect(res[0].fat).toBe(20);
      expect((res[0].carbsPct ?? 0) + (res[0].proteinPct ?? 0) + (res[0].fatPct ?? 0)).toBe(100);
    });

    it('falls back gracefully to target macro ratios when no food logged', () => {
      const days: DayBucketItem[] = [
        {
          dateStr: '2026-03-30',
          dayNum: 30,
          dayName: 'Mon',
          log: { date: '2026-03-30', meals: [] } as unknown as DailyLog,
        },
      ];

      const res = computeMacroRatioDays(days, defaultGoals, {});
      expect(res).toHaveLength(1);
      expect((res[0].carbsPct ?? 0) + (res[0].proteinPct ?? 0) + (res[0].fatPct ?? 0)).toBe(100);
      expect(res[0].carbsPct).toBeGreaterThan(0);
      expect(res[0].proteinPct).toBeGreaterThan(0);
    });
  });
});
