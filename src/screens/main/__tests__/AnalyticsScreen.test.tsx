import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import { AnalyticsScreen } from '../AnalyticsScreen';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { usePro } from '@/features/subscription/hooks/usePro';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    impactHeavy: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    warning: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: jest.fn(),
  useGoals: jest.fn(),
}));

jest.mock('@/features/subscription/hooks/usePro', () => ({
  usePro: jest.fn(),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
      createAnimatedComponent: (Comp: any) => Comp,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedScrollHandler: () => () => {},
    withTiming: (value: number) => value,
    interpolate: (_value: number, _input: number[], output: number[]) => output[1],
    Easing: {
      out: (f: any) => f,
      in: (f: any) => f,
      cubic: (t: any) => t,
    },
    runOnJS: (fn: any) => fn,
    createAnimatedComponent: (Comp: any) => Comp,
  };
});

describe('AnalyticsScreen Integration', () => {
  const mockUserGoals = {
    dailyCalorieBudget: 2200,
    targetProtein: 150,
    targetCarbs: 230,
    targetFat: 65,
    stepGoal: 8000,
    waterGoalMl: 2500,
    currentWeightKg: 74,
    heightCm: 178,
    weightUnit: 'kg',
  };

  const mockDailyLogs = {
    '2026-10-01': {
      meals: [{ name: 'Oatmeal', calories: 350, protein: 12, carbs: 60, fat: 5 }],
      waterMl: 2000,
      steps: 8500,
      weightKg: 74,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useGoals as jest.Mock).mockReturnValue({
      userGoals: mockUserGoals,
    });
    (useDailyLog as jest.Mock).mockReturnValue({
      dailyLogs: mockDailyLogs,
    });
    (usePro as jest.Mock).mockReturnValue({
      isPro: false,
      activePlanId: undefined,
      purchasePlan: jest.fn().mockResolvedValue({ success: true }),
      restorePurchases: jest.fn().mockResolvedValue({ restored: false }),
    });
  });

  it('renders Analytics header with default Weekly timeframe and active Nutrition report', async () => {
    const { getByText } = await render(<AnalyticsScreen />);

    expect(getByText('Insights')).toBeTruthy();
    expect(getByText('Weekly')).toBeTruthy();
    expect(getByText('Monthly')).toBeTruthy();
    expect(getByText('Yearly')).toBeTruthy();
  });

  it('triggers Pro paywall modal when tapping Monthly on Free tier', async () => {
    const { getByRole, findByText } = await render(<AnalyticsScreen />);

    const monthlyTab = getByRole('button', {
      name: /Monthly timeframe \(Calorify Pro required\)/i,
    });
    await act(async () => {
      fireEvent.press(monthlyTab);
    });

    const paywallNotice = await findByText(
      'Experience the full power of AI nutrition scanning, deep metabolic analytics, and streak protection.'
    );
    expect(paywallNotice).toBeTruthy();
  });

  it('switches timeframe to Monthly when user is Pro subscriber', async () => {
    (usePro as jest.Mock).mockReturnValue({
      isPro: true,
      activePlanId: 'pro_annual',
    });

    const { getByRole, queryByText } = await render(<AnalyticsScreen />);

    const monthlyTab = getByRole('button', { name: 'Monthly timeframe' });
    fireEvent.press(monthlyTab);

    // Paywall should not be open
    expect(queryByText('Unlock Calorify Pro')).toBeNull();
  });
});
