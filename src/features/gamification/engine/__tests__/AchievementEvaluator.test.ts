import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AchievementEvaluator } from '../AchievementEvaluator';
import { GamificationEvaluationInput } from '../achievementRules';
import { UserGoals } from '@/types';

const defaultGoals: UserGoals = {
  name: 'Tester',
  dailyCalorieBudget: 2000,
  targetCarbs: 220,
  targetProtein: 140,
  targetFat: 60,
  targetFiber: 25,
  waterGoalMl: 2500,
  stepGoal: 10000,
  currentWeightKg: 70,
  targetWeightKg: 65,
  streakDays: 0,
};

describe('AchievementEvaluator', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AchievementEvaluator.clearRecords();
  });

  it('evaluates an empty logset and returns all locked achievements', async () => {
    const input: GamificationEvaluationInput = {
      dailyLogs: {},
      userGoals: defaultGoals,
      consecutiveDaysLogged: 0,
    };

    const res = await AchievementEvaluator.evaluate(input);

    expect(res.totalAchievementsCount).toBeGreaterThan(5);
    expect(res.totalUnlockedCount).toBe(0);
    expect(res.newlyUnlocked).toHaveLength(0);
  });

  it('unlocks first_meal_log when a meal is logged and reports it as newly unlocked', async () => {
    const input: GamificationEvaluationInput = {
      dailyLogs: {
        '2026-10-04': {
          date: '2026-10-04',
          waterMl: 0,
          steps: 0,
          activities: [],
          meals: [
            {
              id: 'meal_1',
              foodId: 'food_oats',
              name: 'Oatmeal',
              mealType: 'breakfast',
              servingUnit: 'bowl',
              calories: 350,
              carbs: 55,
              protein: 12,
              fat: 6,
              fiber: 4,
              loggedAt: '2026-10-04T08:00:00Z',
              quantity: 1,
            },
          ],
        },
      },
      userGoals: defaultGoals,
      consecutiveDaysLogged: 1,
    };

    const res = await AchievementEvaluator.evaluate(input);

    const firstMeal = res.allAchievements.find((a) => a.definition.id === 'first_meal_log');
    expect(firstMeal?.isUnlocked).toBe(true);
    expect(firstMeal?.progressPercent).toBe(100);

    const newlyUnlockedIds = res.newlyUnlocked.map((a) => a.definition.id);
    expect(newlyUnlockedIds).toContain('first_meal_log');

    // Subsequent evaluation does not report it as newly unlocked
    const secondRes = await AchievementEvaluator.evaluate(input);
    expect(secondRes.newlyUnlocked).toHaveLength(0);
    expect(secondRes.totalUnlockedCount).toBe(1);
  });

  it('unlocks streak badges accurately based on streak days', async () => {
    const input: GamificationEvaluationInput = {
      dailyLogs: {},
      userGoals: { ...defaultGoals, streakDays: 7 },
      consecutiveDaysLogged: 7,
    };

    const res = await AchievementEvaluator.evaluate(input);

    const streak3 = res.allAchievements.find((a) => a.definition.id === 'streak_3_days');
    const streak7 = res.allAchievements.find((a) => a.definition.id === 'streak_7_days');
    const streak30 = res.allAchievements.find((a) => a.definition.id === 'streak_30_days');

    expect(streak3?.isUnlocked).toBe(true);
    expect(streak7?.isUnlocked).toBe(true);
    expect(streak30?.isUnlocked).toBe(false);
    expect(streak30?.currentProgress).toBe(7);
  });

  it('unlocks water and step milestone badges when thresholds are met', async () => {
    const input: GamificationEvaluationInput = {
      dailyLogs: {
        '2026-10-04': {
          date: '2026-10-04',
          waterMl: 2600, // Goal is 2500
          steps: 11200, // Goal is 10000
          meals: [],
          activities: [],
        },
      },
      userGoals: defaultGoals,
      consecutiveDaysLogged: 1,
    };

    const res = await AchievementEvaluator.evaluate(input);

    const waterBadge = res.allAchievements.find((a) => a.definition.id === 'water_target_reached');
    const stepBadge = res.allAchievements.find((a) => a.definition.id === 'steps_10k_daily');

    expect(waterBadge?.isUnlocked).toBe(true);
    expect(stepBadge?.isUnlocked).toBe(true);
  });
});
