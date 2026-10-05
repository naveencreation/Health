import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({});

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
}));

jest.mock('@/services/firebase', () => ({
  auth: { currentUser: { uid: 'user_test_123' } },
  db: {},
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  convertPendingMealToLoggedMeal,
  buildUserProfilePayload,
  migrateOnboardingData,
} from '../onboardingMigration';
import { OnboardingDraft, PendingMeal, ONBOARDING_DRAFT_KEY } from '../onboardingDraft';
import { CalculatedHealthPlan } from '../onboardingCalculator';

describe('onboardingMigration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  const samplePendingMeal: PendingMeal = {
    foodName: '2 Rotis with Dal & Sabzi',
    calories: 340,
    proteinG: 13,
    carbsG: 52,
    fatG: 8,
    portionMultiplier: 1.0,
    mealSlot: 'lunch',
    photoUri: 'file:///photo.jpg',
    loggedAt: 1700000000000,
  };

  const sampleDraft: OnboardingDraft = {
    version: 1,
    step: 'first_meal',
    startedAt: 1700000000000,
    name: 'Aarav',
    goal: 'lose_weight',
    goalIntent: 'lose',
    struggles: ['portions', 'late_snacking'],
    sex: 'male',
    age: 28,
    heightCm: 175,
    weightKg: 82,
    targetWeightKg: 75,
    units: { height: 'cm', weight: 'kg' },
    activityLevel: 'moderately_active',
    pace: 'steady',
    foodStyle: 'vegetarian',
    firstMeal: samplePendingMeal,
  };

  const samplePlan: CalculatedHealthPlan = {
    dailyCalorieBudget: 1950,
    targetProteinG: 120,
    targetCarbsG: 220,
    targetFatG: 65,
    targetFiberG: 30,
    targetWaterMl: 2800,
    stepGoal: 8000,
    bmr: 1780,
    tdee: 2450,
    estimatedWeeksToGoal: 10,
    goalDate: '2026-12-15',
    pace: 'steady',
  };

  describe('convertPendingMealToLoggedMeal', () => {
    it('accurately converts a PendingMeal into a LoggedMealItem', () => {
      const logged = convertPendingMealToLoggedMeal(samplePendingMeal);

      expect(logged.name).toBe('2 Rotis with Dal & Sabzi');
      expect(logged.calories).toBe(340);
      expect(logged.protein).toBe(13);
      expect(logged.carbs).toBe(52);
      expect(logged.fat).toBe(8);
      expect(logged.mealType).toBe('lunch');
      expect(logged.imageUrl).toBe('file:///photo.jpg');
      expect(logged.servingUnit).toBe('1x serving');
      expect(logged.quantity).toBe(1);
    });
  });

  describe('buildUserProfilePayload', () => {
    it('constructs complete user profile payload from draft and plan', () => {
      const payload = buildUserProfilePayload(
        'user_123',
        'aarav@example.com',
        sampleDraft,
        samplePlan,
        false
      );

      expect(payload.id).toBe('user_123');
      expect(payload.name).toBe('Aarav');
      expect(payload.email).toBe('aarav@example.com');
      expect(payload.isGuest).toBe(false);
      expect(payload.goals.dailyCalorieBudget).toBe(1950);
      expect(payload.goals.targetProtein).toBe(120);
      expect(payload.goals.goalDate).toBe('2026-12-15');
      expect(payload.struggles).toEqual(['portions', 'late_snacking']);
    });
  });

  describe('migrateOnboardingData', () => {
    it('writes profile, saves user goals, adds first meal to daily logs, and clears draft', async () => {
      // Set an active draft in AsyncStorage first
      await AsyncStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(sampleDraft));

      const result = await migrateOnboardingData(
        'user_123',
        'aarav@example.com',
        sampleDraft,
        samplePlan,
        false
      );

      expect(result.success).toBe(true);
      expect(result.migratedMeal?.name).toBe('2 Rotis with Dal & Sabzi');

      // Check Firestore doc writes
      expect(mockDoc).toHaveBeenCalled();
      expect(mockSetDoc).toHaveBeenCalled();

      // Check user goals stored in AsyncStorage
      const storedGoals = await AsyncStorage.getItem('@calori_user_goals_user_123');
      expect(storedGoals).toBeTruthy();
      const parsedGoals = JSON.parse(storedGoals!);
      expect(parsedGoals.dailyCalorieBudget).toBe(1950);

      // Check first meal stored in daily logs
      const storedLogs = await AsyncStorage.getItem('@calori_daily_logs_user_123');
      expect(storedLogs).toBeTruthy();
      const parsedLogs = JSON.parse(storedLogs!);
      const todayStr = new Date().toISOString().split('T')[0];
      expect(parsedLogs[todayStr].meals).toHaveLength(1);
      expect(parsedLogs[todayStr].meals[0].name).toBe('2 Rotis with Dal & Sabzi');

      // Check onboarding draft is purged
      const remainingDraft = await AsyncStorage.getItem(ONBOARDING_DRAFT_KEY);
      expect(remainingDraft).toBeNull();
    });

    it('works cleanly when firstMeal is undefined (user skipped meal logging)', async () => {
      const draftWithoutMeal: OnboardingDraft = {
        ...sampleDraft,
        firstMeal: undefined,
      };

      const result = await migrateOnboardingData(
        'user_456',
        'guest@example.com',
        draftWithoutMeal,
        samplePlan,
        true
      );

      expect(result.success).toBe(true);
      expect(result.migratedMeal).toBeUndefined();

      // Check draft was cleared
      const remainingDraft = await AsyncStorage.getItem(ONBOARDING_DRAFT_KEY);
      expect(remainingDraft).toBeNull();
    });
  });
});
