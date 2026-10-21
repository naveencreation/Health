import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavePlanScreen } from '../screens/SavePlanScreen';
import {
  migrateOnboardingData,
  buildUserProfilePayload,
} from '../services/onboardingMigration';
import {
  OnboardingDraft,
  PendingMeal,
  ONBOARDING_DRAFT_KEY,
  saveOnboardingDraft,
  loadOnboardingDraft,
} from '../services/onboardingDraft';
import {
  calculateHealthPlan,
  CalculatedHealthPlan,
} from '../services/onboardingCalculator';
import { DailyLog } from '@/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock react-native Modal
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Modal = ({ visible, children }: any) => (visible ? children : null);
  return RN;
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
      Text: ReactNative.Text,
      createAnimatedComponent: (comp: any) => comp,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedProps: (factory: () => unknown) => factory(),
    withRepeat: (anim: any) => anim,
    withSequence: (...anims: any[]) => anims[0],
    withDelay: (_d: number, anim: any) => anim,
    withTiming: (value: number) => value,
    Easing: {
      bezier: () => () => 0,
      linear: (val: number) => val,
      ease: () => 0,
    },
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    FadeInDown: { duration: () => ({ delay: () => ({}) }) },
    FadeOut: { duration: () => ({ delay: () => ({}) }) },
  };
});

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Firestore
const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockImplementation((...args: any[]) => ({ path: args.slice(1).join('/') }));

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
}));

// Mock Firebase service
const mockAuthCurrentUser = { uid: 'auth_current_uid_123', email: 'test@example.com' };
jest.mock('@/services/firebase', () => ({
  auth: {
    get currentUser() {
      return mockAuthCurrentUser;
    },
  },
  db: { _type: 'mock_db' },
}));

// Mock useAuth
const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockLoginAnonymous = jest.fn();

jest.mock('@/context/HealthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    login: mockLogin,
    loginAnonymous: mockLoginAnonymous,
    currentUser: { id: mockAuthCurrentUser.uid },
  }),
}));

describe('SavePlan Migration Integration Tests', () => {
  const sampleFirstMeal: PendingMeal = {
    foodName: 'Paneer Rice Bowl',
    calories: 420,
    proteinG: 18,
    carbsG: 55,
    fatG: 14,
    portionMultiplier: 1.0,
    mealSlot: 'lunch',
    photoUri: 'file:///data/user/0/cache/meal.jpg',
    loggedAt: 1761000000000,
  };

  const sampleDraft: OnboardingDraft = {
    version: 1,
    step: 'first_meal',
    startedAt: 1761000000000,
    name: 'Priya Sharma',
    goal: 'lose_weight',
    goalIntent: 'lose',
    struggles: ['portions', 'late_snacking'],
    sex: 'female',
    age: 26,
    heightCm: 162,
    weightKg: 68,
    targetWeightKg: 58,
    units: { height: 'cm', weight: 'kg' },
    activityLevel: 'lightly_active',
    pace: 'steady',
    foodStyle: 'vegetarian',
    firstMeal: sampleFirstMeal,
  };

  const samplePlan: CalculatedHealthPlan = {
    dailyCalorieBudget: 1550,
    targetProteinG: 95,
    targetCarbsG: 180,
    targetFatG: 48,
    targetFiberG: 28,
    targetWaterMl: 2400,
    stepGoal: 8500,
    bmr: 1420,
    tdee: 1950,
    estimatedWeeksToGoal: 20,
    goalDate: '2027-03-10',
    pace: 'steady',
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockAuthCurrentUser.uid = 'user_new_priya_101';
    mockAuthCurrentUser.email = 'priya@example.com';
    mockRegister.mockResolvedValue({ success: true });
    mockLogin.mockResolvedValue({ success: true });
    mockLoginAnonymous.mockResolvedValue({ success: true });
    mockSetDoc.mockResolvedValue(undefined);
  });

  describe('1. Full New User Registration & Migration Chain', () => {
    it('persists draft to AsyncStorage, executes registration, and verifies Firestore and local storage writes', async () => {
      // 1. Pre-condition: User has draft saved in storage during wizard
      await saveOnboardingDraft(sampleDraft);
      const loadedDraft = await loadOnboardingDraft();
      expect(loadedDraft).not.toBeNull();
      expect(loadedDraft?.name).toBe('Priya Sharma');

      const onSuccessMock = jest.fn();

      // 2. Render SavePlanScreen
      const { getByTestId } = await render(
        <SavePlanScreen
          name="Priya Sharma"
          plan={samplePlan}
          draft={sampleDraft}
          firstMeal={sampleFirstMeal}
          targetWeightKg={58}
          weightUnit="kg"
          onBack={jest.fn()}
          onSuccess={onSuccessMock}
        />
      );

      // 3. User enters credentials
      await act(async () => {
        fireEvent.changeText(getByTestId('input-user-email'), 'priya@example.com');
        fireEvent.changeText(getByTestId('input-user-password'), 'SecurePass123');
      });

      // 4. Submit Registration
      await act(async () => {
        fireEvent.press(getByTestId('btn-submit-auth'));
      });

      // Verify register was called with exact biometrics from draft
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: 'SecurePass123',
        age: 26,
        weight: 68,
        weightUnit: 'kg',
        goal: 'lose_weight',
        gender: 'female',
        heightCm: 162,
      });

      // 5. Verify Firestore writes
      // Should write to /users/user_new_priya_101 with merge: true
      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user_new_priya_101');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user_new_priya_101' }),
        expect.objectContaining({
          id: 'user_new_priya_101',
          name: 'Priya Sharma',
          email: 'priya@example.com',
          isGuest: false,
          goals: expect.objectContaining({
            dailyCalorieBudget: 1550,
            targetProtein: 95,
            targetWaterMl: 2400,
          }),
        }),
        { merge: true }
      );

      // 6. Verify Local Storage Goals
      const rawStoredGoals = await AsyncStorage.getItem('@calori_user_goals_user_new_priya_101');
      expect(rawStoredGoals).toBeTruthy();
      const parsedGoals = JSON.parse(rawStoredGoals!);
      expect(parsedGoals.dailyCalorieBudget).toBe(1550);
      expect(parsedGoals.gender).toBe('female');
      expect(parsedGoals.currentWeightKg).toBe(68);

      // 7. Verify First Meal injected into today's daily log
      const rawStoredLogs = await AsyncStorage.getItem('@calori_daily_logs_user_new_priya_101');
      expect(rawStoredLogs).toBeTruthy();
      const parsedLogs = JSON.parse(rawStoredLogs!);
      const todayStr = new Date().toISOString().split('T')[0];
      const todayMeals = parsedLogs[todayStr].meals;
      expect(todayMeals).toHaveLength(1);
      expect(todayMeals[0].name).toBe('Paneer Rice Bowl');
      expect(todayMeals[0].calories).toBe(420);
      expect(todayMeals[0].mealType).toBe('lunch');

      // 8. Verify Onboarding Draft is completely purged
      const remainingDraft = await AsyncStorage.getItem(ONBOARDING_DRAFT_KEY);
      expect(remainingDraft).toBeNull();
    });
  });

  describe('2. Account Collision & Sign-In Switching Integration', () => {
    it('detects existing account, switches to sign-in, updates UID, and migrates without losing existing daily logs', async () => {
      const existingUid = 'user_existing_arjun_999';

      // 1. Existing user already has a morning snack logged today in local storage
      const todayStr = new Date().toISOString().split('T')[0];
      const existingDailyLog: Record<string, DailyLog> = {
        [todayStr]: {
          date: todayStr,
          meals: [
            {
              id: 'morning_snack_1',
              foodId: 'apple_1',
              name: 'Green Apple & Almonds',
              mealType: 'snacks',
              servingUnit: '1 apple',
              quantity: 1,
              calories: 180,
              protein: 4,
              carbs: 25,
              fat: 9,
              fiber: 4,
              loggedAt: new Date().toISOString(),
            },
          ],
          waterMl: 500,
          steps: 2500,
          activities: [],
        },
      };
      await AsyncStorage.setItem(
        `@calori_daily_logs_${existingUid}`,
        JSON.stringify(existingDailyLog)
      );

      // 2. Mock register failure due to collision
      mockRegister.mockResolvedValueOnce({
        success: false,
        error: 'The email address is already in use by another account.',
      });

      const { getByTestId, getByText } = await render(
        <SavePlanScreen
          name="Arjun"
          plan={samplePlan}
          draft={sampleDraft}
          firstMeal={sampleFirstMeal}
          targetWeightKg={65}
          weightUnit="kg"
          onBack={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      // 3. User attempts registration with existing email
      await act(async () => {
        fireEvent.changeText(getByTestId('input-user-email'), 'arjun@example.com');
        fireEvent.changeText(getByTestId('input-user-password'), 'MySecretPass2026');
      });

      await act(async () => {
        fireEvent.press(getByTestId('btn-submit-auth'));
      });

      // Verify collision alert
      expect(getByText('An account with this email already exists.')).toBeTruthy();
      expect(getByTestId('btn-switch-collision-signin')).toBeTruthy();

      // 4. User switches to sign-in
      await act(async () => {
        fireEvent.press(getByTestId('btn-switch-collision-signin'));
      });

      // Button updates to Sign In
      expect(getByText('Sign In & Link Plan')).toBeTruthy();

      // 5. Update auth state for successful login of existing user
      mockAuthCurrentUser.uid = existingUid;
      mockAuthCurrentUser.email = 'arjun@example.com';
      mockLogin.mockResolvedValueOnce({ success: true });

      await act(async () => {
        fireEvent.press(getByTestId('btn-submit-auth'));
      });

      expect(mockLogin).toHaveBeenCalledWith('arjun@example.com', 'MySecretPass2026');

      // 6. Verify Daily Logs: Both the existing morning snack AND the onboarding lunch must exist!
      const rawLogs = await AsyncStorage.getItem(`@calori_daily_logs_${existingUid}`);
      expect(rawLogs).toBeTruthy();
      const parsedLogs = JSON.parse(rawLogs!);
      const todayMeals = parsedLogs[todayStr].meals;

      expect(todayMeals).toHaveLength(2);
      expect(todayMeals[0].name).toBe('Green Apple & Almonds'); // Preserved!
      expect(todayMeals[1].name).toBe('Paneer Rice Bowl'); // Appended!
    });
  });

  describe('3. Offline Resilience & Fault Tolerance', () => {
    it('succeeds locally when Firestore network fails, preserving goals and daily log', async () => {
      // Mock Firestore network rejection
      mockSetDoc.mockRejectedValue(new Error('FirebaseError: [unavailable] Network connection failed.'));

      const result = await migrateOnboardingData(
        'user_offline_555',
        'offline@example.com',
        sampleDraft,
        samplePlan,
        false
      );

      // Migration must succeed without throwing an uncaught exception
      expect(result.success).toBe(true);
      expect(result.migratedMeal?.name).toBe('Paneer Rice Bowl');

      // Local storage must still have goals and meal
      const localGoals = await AsyncStorage.getItem('@calori_user_goals_user_offline_555');
      expect(localGoals).toBeTruthy();
      expect(JSON.parse(localGoals!).dailyCalorieBudget).toBe(1550);

      const localLogs = await AsyncStorage.getItem('@calori_daily_logs_user_offline_555');
      expect(localLogs).toBeTruthy();
      const todayStr = new Date().toISOString().split('T')[0];
      expect(JSON.parse(localLogs!)[todayStr].meals).toHaveLength(1);

      // Draft must still be cleared
      const draft = await AsyncStorage.getItem(ONBOARDING_DRAFT_KEY);
      expect(draft).toBeNull();
    });
  });

  describe('4. Teen Safety Guardrail Plan Migration', () => {
    it('preserves maintenance guardrail for teenagers during plan generation and profile payload creation', () => {
      // Calculate health plan for a 15-year-old teen who selected 'lose_weight'
      const teenPlan = calculateHealthPlan({
        gender: 'female',
        sex: 'female',
        age: 15,
        heightCm: 160,
        weightKg: 62,
        targetWeightKg: 54,
        activityLevel: 'moderately_active',
        goal: 'lose_weight', // Teen attempted deficit
        pace: 'steady',
      });

      // Clinically enforced: teen must not receive deficit
      expect(teenPlan.dailyCalorieBudget).toBe(teenPlan.tdee); // Exactly maintenance!

      const teenDraft: OnboardingDraft = {
        ...sampleDraft,
        age: 15,
        goal: 'maintain',
      };

      const payload = buildUserProfilePayload(
        'teen_user_123',
        'teen@example.com',
        teenDraft,
        teenPlan,
        false
      );

      expect(payload.goals.dailyCalorieBudget).toBe(teenPlan.tdee);
      expect(payload.age).toBe(15);
      expect(payload.isGuest).toBe(false);
    });
  });

  describe('5. Anonymous Guest Mode Migration', () => {
    it('correctly flags profile as guest and stores local goals under guest UID', async () => {
      mockAuthCurrentUser.uid = 'guest_user_999';
      mockAuthCurrentUser.email = '';

      const onSuccessMock = jest.fn();

      const { getByTestId } = await render(
        <SavePlanScreen
          name="Guest Traveler"
          plan={samplePlan}
          draft={{ ...sampleDraft, name: 'Guest Traveler' }}
          firstMeal={sampleFirstMeal}
          targetWeightKg={58}
          weightUnit="kg"
          onBack={jest.fn()}
          onSuccess={onSuccessMock}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('btn-continue-guest'));
      });

      expect(mockLoginAnonymous).toHaveBeenCalledWith('Guest Traveler');

      // Verify Firestore payload was marked with isGuest: true
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/guest_user_999' }),
        expect.objectContaining({
          id: 'guest_user_999',
          name: 'Guest Traveler',
          isGuest: true,
        }),
        { merge: true }
      );

      // Verify guest local goals exist
      const guestGoals = await AsyncStorage.getItem('@calori_user_goals_guest_user_999');
      expect(guestGoals).toBeTruthy();
      expect(JSON.parse(guestGoals!).name).toBe('Guest Traveler');
    });
  });
});
