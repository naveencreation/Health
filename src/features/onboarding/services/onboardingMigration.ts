import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { LoggedMealItem, UserGoals, MealType } from '@/types';
import { OnboardingDraft, PendingMeal, clearOnboardingDraft } from './onboardingDraft';
import { CalculatedHealthPlan } from './onboardingCalculator';

export interface MigrationResult {
  success: boolean;
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
  const rawSlot = (meal.mealSlot || 'lunch') as string;
  const normalizedSlot: MealType =
    rawSlot === 'snack' || rawSlot === 'snacks'
      ? 'snacks'
      : rawSlot === 'breakfast' || rawSlot === 'dinner'
        ? (rawSlot as MealType)
        : 'lunch';
  const calories = Math.round(meal.calories);
  const protein = Math.round(meal.proteinG);
  const carbs = Math.round(meal.carbsG);
  const fat = Math.round(meal.fatG);
  return {
    id: `meal_onboarding_${meal.loggedAt || Date.now()}`,
    foodId: 'onboarding_first_meal',
    name: meal.foodName,
    mealType: normalizedSlot,
    servingUnit: `${meal.portionMultiplier}x serving`,
    quantity: 1,
    calories,
    protein,
    carbs,
    fat,
    fiber: 0,
    baseNutrition: { calories, protein, carbs, fat, fiber: 0 },
    loggedAt: new Date(meal.loggedAt || Date.now()).toISOString(),
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
 * Migrates onboarding draft data to the user profile and goals. The first meal is written
 * once, with the local date, by HealthContext applyOnboardingPlan.
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

    // 3. Safely clear the onboarding draft
    await clearOnboardingDraft();

    return { success: true };
  } catch (error: any) {
    console.error('[onboardingMigration] Migration failed:', error);
    return {
      success: false,
      error: error.message || 'Data migration failed',
    };
  }
}
