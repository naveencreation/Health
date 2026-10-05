import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { SavePlanScreen } from '../SavePlanScreen';
import { CalculatedHealthPlan } from '../../services/onboardingCalculator';
import { OnboardingDraft, PendingMeal } from '../../services/onboardingDraft';

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
    withDelay: (d: number, anim: any) => anim,
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

// Mock onboardingMigration
const mockMigrateOnboardingData = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../services/onboardingMigration', () => ({
  migrateOnboardingData: (...args: any[]) => mockMigrateOnboardingData(...args),
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
    currentUser: { id: 'mock_uid_123' },
  }),
}));

describe('SavePlanScreen (S14)', () => {
  const samplePlan: CalculatedHealthPlan = {
    dailyCalorieBudget: 2150,
    targetProteinG: 130,
    targetCarbsG: 240,
    targetFatG: 70,
    targetFiberG: 32,
    targetWaterMl: 3000,
    stepGoal: 10000,
    bmr: 1800,
    tdee: 2500,
    goalDate: '2026-11-20',
  };

  const sampleFirstMeal: PendingMeal = {
    foodName: 'Paneer Rice Bowl',
    calories: 420,
    proteinG: 18,
    carbsG: 55,
    fatG: 14,
    portionMultiplier: 1.0,
    mealSlot: 'lunch',
    loggedAt: Date.now(),
  };

  const sampleDraft: OnboardingDraft = {
    version: 1,
    step: 'first_meal',
    startedAt: Date.now(),
    name: 'Aarav',
    goal: 'lose_weight',
    firstMeal: sampleFirstMeal,
    targetWeightKg: 74,
  };

  const defaultProps = {
    name: 'Aarav',
    plan: samplePlan,
    draft: sampleDraft,
    firstMeal: sampleFirstMeal,
    targetWeightKg: 74,
    weightUnit: 'kg' as const,
    onBack: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRegister.mockResolvedValue({ success: true });
    mockLogin.mockResolvedValue({ success: true });
    mockLoginAnonymous.mockResolvedValue({ success: true });
  });

  it('renders title with user name, plan summary numbers, and 1 meal logged badge', async () => {
    const { getByText, getByTestId } = await render(<SavePlanScreen {...defaultProps} />);

    expect(getByText('Save your plan, Aarav.')).toBeTruthy();
    expect(getByText('So your calculated numbers and your first meal are never lost.')).toBeTruthy();
    expect(getByText('2150')).toBeTruthy(); // Calories
    expect(getByText('1 meal logged')).toBeTruthy();
    expect(getByText('420 kcal · Paneer Rice Bowl')).toBeTruthy();
    expect(getByTestId('btn-continue-google')).toBeTruthy();
  });

  it('updates password checklist chips as user types', async () => {
    const { getByTestId, getByText } = await render(<SavePlanScreen {...defaultProps} />);

    const passwordInput = getByTestId('input-user-password');

    // Type weak password
    await act(async () => {
      fireEvent.changeText(passwordInput, 'pass');
    });

    expect(getByText('8+ characters')).toBeTruthy();
    expect(getByText('At least 1 number')).toBeTruthy();

    // Type valid password
    await act(async () => {
      fireEvent.changeText(passwordInput, 'calorify2026');
    });

    expect(getByText('8+ characters')).toBeTruthy();
    expect(getByText('At least 1 number')).toBeTruthy();
  });

  it('submits registration when form is valid, migrates data, and displays founder note', async () => {
    const { getByTestId, getByText } = await render(<SavePlanScreen {...defaultProps} />);

    await act(async () => {
      fireEvent.changeText(getByTestId('input-user-email'), 'aarav@example.com');
      fireEvent.changeText(getByTestId('input-user-password'), 'calorify2026');
    });

    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-auth'));
    });

    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Aarav',
        email: 'aarav@example.com',
        password: 'calorify2026',
      })
    );

    expect(mockMigrateOnboardingData).toHaveBeenCalled();
    // Founder note appears
    expect(getByText('A QUICK NOTE FROM THE MAKER')).toBeTruthy();
    expect(getByText('— Naveen')).toBeTruthy();
  });

  it('handles account collision by offering inline switch to sign-in', async () => {
    mockRegister.mockResolvedValueOnce({
      success: false,
      error: 'This email is already registered. Please sign in.',
    });

    const { getByTestId, getByText } = await render(<SavePlanScreen {...defaultProps} />);

    await act(async () => {
      fireEvent.changeText(getByTestId('input-user-email'), 'existing@example.com');
      fireEvent.changeText(getByTestId('input-user-password'), 'calorify2026');
    });

    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-auth'));
    });

    // Collision alert appears
    expect(getByText('An account with this email already exists.')).toBeTruthy();
    expect(getByTestId('btn-switch-collision-signin')).toBeTruthy();

    // Tap switch to signin
    await act(async () => {
      fireEvent.press(getByTestId('btn-switch-collision-signin'));
    });

    // Button updates to Sign In
    expect(getByText('Sign In & Link Plan')).toBeTruthy();

    // Submit sign in
    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-auth'));
    });

    expect(mockLogin).toHaveBeenCalledWith('existing@example.com', 'calorify2026');
    expect(mockMigrateOnboardingData).toHaveBeenCalled();
  });

  it('handles guest login cleanly when user taps "Continue without an account"', async () => {
    const { getByTestId, getByText } = await render(<SavePlanScreen {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('btn-continue-guest'));
    });

    expect(mockLoginAnonymous).toHaveBeenCalledWith('Aarav');
    expect(mockMigrateOnboardingData).toHaveBeenCalled();
    expect(getByText('A QUICK NOTE FROM THE MAKER')).toBeTruthy();
  });

  it('proceeds to next step when tapping founder note backdrop', async () => {
    const onSuccessMock = jest.fn();
    const { getByTestId } = await render(
      <SavePlanScreen {...defaultProps} onSuccess={onSuccessMock} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('btn-continue-guest'));
    });

    // Tap backdrop
    await act(async () => {
      fireEvent.press(getByTestId('founder-note-backdrop'));
    });

    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });
});
