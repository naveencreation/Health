import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityLevel, GoalType as Goal, Pace, Sex } from './onboardingCalculator';

export const ONBOARDING_DRAFT_KEY = 'onboarding_draft_v1';

export type GoalIntent = 'lose' | 'maintain' | 'build' | 'understand';
export type FoodStyle = 'vegetarian' | 'eggetarian' | 'non_veg' | 'vegan' | 'no_preference';
export type Struggle =
  | 'home_cooked'
  | 'portions'
  | 'eating_out'
  | 'consistency'
  | 'protein'
  | 'late_snacking'
  | 'not_sure';

export interface PendingMeal {
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  portionMultiplier: number;
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  photoUri?: string;
  loggedAt: number;
}

export interface OnboardingDraft {
  version: 1;
  step: string; // last completed step ID (e.g., 's2', 's3')
  startedAt: number;
  name?: string;
  goal?: Goal;
  goalIntent?: GoalIntent;
  struggles?: Struggle[]; // max 3
  sex?: Sex;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  units?: { height: 'cm' | 'ft'; weight: 'kg' | 'lbs' };
  targetWeightKg?: number;
  activityLevel?: ActivityLevel;
  pace?: Pace;
  foodStyle?: FoodStyle;
  mealTimes?: { breakfast: string; lunch: string; dinner: string }; // 'HH:mm'
  skipsBreakfast?: boolean;
  snacks?: boolean;
  firstMeal?: PendingMeal; // logged before signup, migrated after
}

/**
 * Loads the stored onboarding draft from AsyncStorage.
 * Returns null if no draft exists or if the version does not match.
 */
export async function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1) {
      return parsed as OnboardingDraft;
    }
    return null;
  } catch (error) {
    console.warn('[onboardingDraft] Failed to load draft:', error);
    return null;
  }
}

/**
 * Persists changes to the local onboarding draft.
 * Automatically initializes version: 1 and startedAt if creating for the first time.
 */
export async function saveOnboardingDraft(
  update: Partial<OnboardingDraft>
): Promise<OnboardingDraft> {
  try {
    const existing = await loadOnboardingDraft();
    const updatedDraft: OnboardingDraft = {
      version: 1,
      startedAt: existing?.startedAt || Date.now(),
      step: update.step || existing?.step || 's1',
      ...existing,
      ...update,
    };
    await AsyncStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(updatedDraft));
    return updatedDraft;
  } catch (error) {
    console.warn('[onboardingDraft] Failed to save draft:', error);
    // Return optimistic fallback object so app doesn't crash on storage failure
    return {
      version: 1,
      startedAt: Date.now(),
      step: update.step || 's1',
      ...update,
    };
  }
}

/**
 * Clears the stored onboarding draft from AsyncStorage.
 * Called immediately after the profile is saved to Firestore.
 */
export async function clearOnboardingDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch (error) {
    console.warn('[onboardingDraft] Failed to clear draft:', error);
  }
}
