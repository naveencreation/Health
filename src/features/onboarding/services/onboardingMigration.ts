import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { LoggedMealItem, DailyLog, UserGoals, MealType } from '@/types';
import { OnboardingDraft, PendingMeal, clearOnboardingDraft } from './onboardingDraft';
import { CalculatedHealthPlan } from './onboardingCalculator';

export interface MigrationResult {
  success: boolean;
  migratedMeal?: LoggedMealItem;
  error?: string;
}

export interface UserProfilePayload {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  age?: number;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  units?: { height: 'cm' | 'ft'; weight: 'kg' | 'lbs' };
  goal?: string;
  goalIntent?: string;
  struggles?: string[];
  activityLevel?: string;
  pace?: string;
  foodStyle?: string;
  mealTimes?: { breakfast: string; lunch: string; dinner: string };
  skipsBreakfast?: boolean;
  snacks?: boolean;
  goals: {
    dailyCalorieBudget: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    targetFiber: number;
    targetWaterMl: number;
    targetSteps: number;
    goalDate?: string;
    startWeightKg?: number;
    targetWeightKg?: number;
    currentWeightKg?: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Converts a PendingMeal captured in S13 into a formal LoggedMealItem
 */
export function convertPendingMealToLoggedMeal(meal: PendingMeal): LoggedMealItem {
  return {
    id: `meal_onboarding_${meal.loggedAt || Date.now()}`,
    foodId: 'onboarding_first_meal',
    name: meal.foodName,
    mealType: (meal.mealSlot || 'lunch') as MealType,
    servingUnit: `${meal.portionMultiplier}x serving`,
    quantity: 1,
    calories: Math.round(meal.calories),
    protein: Math.round(meal.proteinG),
    carbs: Math.round(meal.carbsG),
    fat: Math.round(meal.fatG),
    fiber: 0,
    loggedAt: new Date(meal.loggedAt || Date.now()).toISOString(),
    imageUrl: meal.photoUri,
  };
}

/**
 * Builds the Firestore /users/{uid} initial profile document from onboarding data
 */
export function buildUserProfilePayload(
  uid: string,
  email: string,
  draft: OnboardingDraft,
  plan: CalculatedHealthPlan,
  isGuest = false
): UserProfilePayload {
  const now = new Date().toISOString();
  return {
    id: uid,
    name: draft.name || 'Friend',
    email: email || '',
    isGuest,
    age: draft.age,
    sex: draft.sex,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
    targetWeightKg: draft.targetWeightKg,
    units: draft.units,
    goal: draft.goal,
    goalIntent: draft.goalIntent,
    struggles: draft.struggles || [],
    activityLevel: draft.activityLevel,
    pace: draft.pace,
    foodStyle: draft.foodStyle,
    mealTimes: draft.mealTimes,
    skipsBreakfast: draft.skipsBreakfast,
    snacks: draft.snacks,
    goals: {
      dailyCalorieBudget: plan.dailyCalorieBudget,
      targetProtein: plan.targetProteinG,
      targetCarbs: plan.targetCarbsG,
      targetFat: plan.targetFatG,
      targetFiber: plan.targetFiberG,
      targetWaterMl: plan.targetWaterMl,
      targetSteps: plan.stepGoal,
      goalDate: plan.goalDate,
      startWeightKg: draft.weightKg,
      targetWeightKg: draft.targetWeightKg,
      currentWeightKg: draft.weightKg,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Migrates onboarding draft data and the first logged meal to the user profile and daily log.
 * Also safely purges the local onboarding draft.
 */
export async function migrateOnboardingData(
  uid: string,
  email: string,
  draft: OnboardingDraft,
  plan: CalculatedHealthPlan,
  isGuest = false
): Promise<MigrationResult> {
  try {
    const profile = buildUserProfilePayload(uid, email, draft, plan, isGuest);

    // 1. Write user profile to Firestore
    try {
      await setDoc(doc(db, 'users', uid), profile, { merge: true });
    } catch (fsErr) {
      console.warn('[onboardingMigration] Firestore profile write error (offline?):', fsErr);
    }

    // 2. Save user goals to local AsyncStorage
    const goalsPayload: UserGoals = {
      name: draft.name || 'Friend',
      dailyCalorieBudget: plan.dailyCalorieBudget,
      targetProtein: plan.targetProteinG,
      targetCarbs: plan.targetCarbsG,
      targetFat: plan.targetFatG,
      targetFiber: plan.targetFiberG || 30,
      waterGoalMl: plan.targetWaterMl,
      stepGoal: plan.stepGoal,
      currentWeightKg: draft.weightKg || 70,
      startWeightKg: draft.weightKg || 70,
      targetWeightKg: draft.targetWeightKg || draft.weightKg || 70,
      heightCm: draft.heightCm || 170,
      age: draft.age,
      gender: draft.sex || 'male',
      goal: draft.goal || 'maintain',
      weightUnit: draft.units?.weight || 'kg',
      streakDays: 1,
    };

    await AsyncStorage.setItem(`@calori_user_goals_${uid}`, JSON.stringify(goalsPayload));
    await AsyncStorage.setItem('@calori_user_goals', JSON.stringify(goalsPayload));
    await AsyncStorage.setItem('@calori_user_goals_v1', JSON.stringify(goalsPayload));

    // 3. Migrate First Meal if logged
    let migratedMeal: LoggedMealItem | undefined;
    if (draft.firstMeal) {
      migratedMeal = convertPendingMealToLoggedMeal(draft.firstMeal);
      const todayStr = new Date().toISOString().split('T')[0];

      // Retrieve existing logs or start fresh
      let dailyLogs: Record<string, DailyLog> = {};
      try {
        const rawLogs = await AsyncStorage.getItem(`@calori_daily_logs_${uid}`);
        if (rawLogs) {
          dailyLogs = JSON.parse(rawLogs);
        }
      } catch (err) {
        // Fallback to empty logs map
      }

      const existingDayLog = dailyLogs[todayStr] || {
        date: todayStr,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      };

      const updatedMeals = [...(existingDayLog.meals || []), migratedMeal];
      const updatedDayLog: DailyLog = {
        ...existingDayLog,
        meals: updatedMeals,
      };

      dailyLogs[todayStr] = updatedDayLog;

      await AsyncStorage.setItem(`@calori_daily_logs_${uid}`, JSON.stringify(dailyLogs));
      await AsyncStorage.setItem('@calori_daily_logs', JSON.stringify(dailyLogs));
      await AsyncStorage.setItem('@calori_daily_logs_v1', JSON.stringify(dailyLogs));

      // Sync meal to Firestore
      try {
        await setDoc(doc(db, 'users', uid, 'dailyLogs', todayStr), updatedDayLog, { merge: true });
      } catch (fsErr) {
        console.warn('[onboardingMigration] Firestore daily log write error:', fsErr);
      }
    }

    // 4. Safely clear the onboarding draft
    await clearOnboardingDraft();

    return {
      success: true,
      migratedMeal,
    };
  } catch (error: any) {
    console.error('[onboardingMigration] Migration failed:', error);
    return {
      success: false,
      error: error.message || 'Data migration failed',
    };
  }
}
