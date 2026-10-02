import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import { StepReportScreen } from '../StepReportScreen';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedProps: (factory: () => unknown) => factory(),
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    dailyLogs: {
      '2026-10-02': { steps: 5200 },
      '2026-10-01': { steps: 4800 },
    },
  }),
  useGoals: () => ({
    userGoals: { stepGoal: 6000 },
  }),
}));

describe('StepReportScreen', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders top header, timeframe tabs, date navigator, and step chart card', async () => {
    const handleBack = jest.fn();
    const { getByText, getByLabelText, getAllByText } = await render(
      <StepReportScreen onBack={handleBack} />
    );

    // Header
    expect(getByText('Step Report')).toBeTruthy();
    expect(getByLabelText('Back to Step History')).toBeTruthy();

    // Timeframe tabs
    expect(getByText('Weekly')).toBeTruthy();
    expect(getByText('Monthly')).toBeTruthy();
    expect(getByText('Yearly')).toBeTruthy();

    // Step chart card
    expect(getByText('Step')).toBeTruthy();
    expect(getAllByText('Selected').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Step Goal')).toBeTruthy();

    // Active Calorie Burn card
    expect(getByText('Active Calorie Burn')).toBeTruthy();
  });

  test('switches timeframe to Monthly and Yearly when tabs are clicked', async () => {
    const { getByLabelText, getAllByText } = await render(
      <StepReportScreen onBack={jest.fn()} />
    );

    // Click Monthly
    await fireEvent.press(getByLabelText('Monthly timeframe'));
    await waitFor(() => {
      expect(getAllByText(/2026/).length).toBeGreaterThan(0);
    });

    // Click Yearly
    await fireEvent.press(getByLabelText('Yearly timeframe'));
    await waitFor(() => {
      expect(getAllByText(/2026/).length).toBeGreaterThan(0);
    });
  });

  test('calls onBack when back chevron is pressed', async () => {
    const handleBack = jest.fn();
    const { getByLabelText } = await render(
      <StepReportScreen onBack={handleBack} />
    );

    await fireEvent.press(getByLabelText('Back to Step History'));
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
