import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import { AnalyticsScreen } from '../AnalyticsScreen';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { usePro } from '@/features/subscription/hooks/usePro';
import { haptics } from '@/utils/haptics';

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

const TODAY = '2026-11-18'; // Wednesday; the week is Mon 16 - Sun 22

const mockUserGoals = {
  dailyCalorieBudget: 2000,
  targetProtein: 90,
  targetCarbs: 230,
  targetFat: 65,
  stepGoal: 8000,
  waterGoalMl: 2500,
  currentWeightKg: 72.5,
  targetWeightKg: 68,
  heightCm: 175,
  weightUnit: 'kg',
};

const weekLogs = {
  '2026-11-16': {
    meals: [{ name: 'Dal', calories: 1900, protein: 60, carbs: 200, fat: 50 }],
    steps: 6200,
    waterMl: 2500,
    weightKg: 72.8,
  },
  '2026-11-17': {
    meals: [{ name: 'Rice', calories: 2100, protein: 70, carbs: 260, fat: 60 }],
    steps: 9400,
    waterMl: 2600,
  },
  '2026-11-18': {
    meals: [{ name: 'Roti', calories: 1800, protein: 50, carbs: 200, fat: 40 }],
    steps: 11240,
    waterMl: 2750,
    weightKg: 72.2,
  },
};

describe('AnalyticsScreen (Insights overview)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGoals as jest.Mock).mockReturnValue({ userGoals: mockUserGoals });
    (useDailyLog as jest.Mock).mockReturnValue({ todayStr: TODAY, dailyLogs: weekLogs });
    (usePro as jest.Mock).mockReturnValue({
      isPro: false,
      activePlanId: undefined,
      purchasePlan: jest.fn().mockResolvedValue({ success: true }),
      restorePurchases: jest.fn().mockResolvedValue({ restored: false }),
    });
  });

  it('renders the header, week navigator and the verdict hero', async () => {
    const screen = await render(<AnalyticsScreen />);
    expect(screen.getByText('Insights')).toBeTruthy();
    expect(screen.getByText('16–22 Nov')).toBeTruthy();
    expect(screen.getByText('THIS WEEK')).toBeTruthy();
    expect(screen.getByText(/In your zone/)).toBeTruthy();
    expect(screen.getByText('Wednesday was your best step day.')).toBeTruthy();
  });

  it('renders four metric cards with values from the logs', async () => {
    const screen = await render(<AnalyticsScreen />);

    expect(screen.getByText('Calories')).toBeTruthy();
    expect(screen.getByText('Steps')).toBeTruthy();
    expect(screen.getByText('Water')).toBeTruthy();
    expect(screen.getByText('Weight')).toBeTruthy();

    // calories avg of 1900, 2100, 1800 = 1,933; steps avg of 6200, 9400, 11240 = 8,947
    expect(screen.getByText('1,933')).toBeTruthy();
    expect(screen.getByText('3 of 3 days in your zone')).toBeTruthy();
    expect(screen.getByText('Your zone is your goal, give or take 10%')).toBeTruthy();
    expect(screen.getByText('8,947')).toBeTruthy();
    expect(screen.getByText('2 of 3 days at goal')).toBeTruthy();
    expect(screen.getByText(/km walked/)).toBeTruthy();
    // water avg 2.6 L with all three days at goal
    expect(screen.getByText('2.6')).toBeTruthy();
    expect(screen.getByText('3-day goal streak')).toBeTruthy();
    // latest weigh-in, moving toward the lower target
    expect(screen.getByText('72.2')).toBeTruthy();
    expect(screen.getByText('Down 0.6 kg this week')).toBeTruthy();
    expect(screen.getByText('kg · BMI 23.6')).toBeTruthy();
    expect(screen.getByText('2 weigh-ins · goal 68.0 kg')).toBeTruthy();
    expect(screen.getAllByText('Details')).toHaveLength(4);
  });

  it('shows the week balance radar and the macro split', async () => {
    const screen = await render(<AnalyticsScreen />);
    expect(screen.getByText('Week balance')).toBeTruthy();
    expect(screen.getByLabelText(/Week balance: Calories 100%/)).toBeTruthy();
    expect(screen.getByText(/Strongest: /)).toBeTruthy();
    expect(screen.getByText(/the most love this week/)).toBeTruthy();
    expect(screen.getByText('Macro split')).toBeTruthy();
    // protein avg of 60, 70, 50 = 60 against the 90 g target
    expect(screen.getByLabelText('Protein: 60 of 90 grams')).toBeTruthy();
  });

  it('shares one selected day across the charts and fires a haptic', async () => {
    const screen = await render(<AnalyticsScreen />);
    const mondayCal = screen.getAllByLabelText('Monday 16, 1,900 kcal');
    expect(mondayCal).toHaveLength(1);
    // The selected state defaults to today (Wednesday)
    const wed = screen.getAllByLabelText(/^Wednesday 18/);
    expect(wed.every(n => n.props.accessibilityState?.selected)).toBe(true);

    await fireEvent.press(screen.getByLabelText('Tuesday 17, 9,400 steps'));
    expect(haptics.selection).toHaveBeenCalled();
    const tue = screen.getAllByLabelText(/^Tuesday 17/);
    expect(tue).toHaveLength(4);
    expect(tue.every(n => n.props.accessibilityState?.selected)).toBe(true);
  });

  it('opens the steps details screen and gates Month behind Pro', async () => {
    const screen = await render(<AnalyticsScreen />);

    await fireEvent.press(screen.getByLabelText('Steps details'));
    expect(screen.getByLabelText('Back to Insights')).toBeTruthy();
    expect(screen.getAllByText('Steps').length).toBeGreaterThan(1);

    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: /Month timeframe \(Nomzo Pro required\)/i }));
    });
    expect(await screen.findByText("You're on the free plan")).toBeTruthy();
  });

  it('lets a Pro user switch the details screen to Month', async () => {
    (usePro as jest.Mock).mockReturnValue({ isPro: true, activePlanId: 'pro_annual' });
    const screen = await render(<AnalyticsScreen />);
    await fireEvent.press(screen.getByLabelText('Steps details'));

    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Month timeframe' }));
    });
    expect(screen.getByText('November 2026')).toBeTruthy();
    expect(screen.queryByText("You're on the free plan")).toBeNull();
  });

  it('moves between weeks and disables Next on the current week', async () => {
    const screen = await render(<AnalyticsScreen />);
    const next = screen.getByLabelText('Next week');
    expect(next.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByLabelText('Previous week'));
    expect(screen.getByText('9–15 Nov')).toBeTruthy();
    expect(screen.getByLabelText('Next week').props.accessibilityState?.disabled).toBe(false);
  });

  it('keeps each card with a calm empty state when nothing is logged', async () => {
    (useDailyLog as jest.Mock).mockReturnValue({ todayStr: TODAY, dailyLogs: {} });
    const screen = await render(<AnalyticsScreen />);

    expect(screen.getByText('Your week starts here')).toBeTruthy();
    expect(screen.getByText('No meals logged this week')).toBeTruthy();
    expect(screen.getByText('No steps this week')).toBeTruthy();
    expect(screen.getByText('No drinks logged this week')).toBeTruthy();
    expect(screen.getByText('No weigh-ins this week')).toBeTruthy();
    expect(screen.getByText('Nothing to balance yet')).toBeTruthy();
    expect(screen.getByText('No macros yet')).toBeTruthy();
    expect(screen.getByText(/sync them from Health Connect/)).toBeTruthy();
    expect(screen.getAllByText('–')).toHaveLength(4);
  });
});
