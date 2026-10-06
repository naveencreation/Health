import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HeroStepCard } from '../HeroStepCard';

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
    withSequence: (...args: any[]) => args[0],
    withTiming: (value: number) => value,
    withSpring: (value: number) => value,
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: '2026-10-02',
    dailyLogs: {
      '2026-10-02': { steps: 6000 },
    },
  }),
  useGoals: () => ({
    userGoals: { stepGoal: 10000 },
  }),
}));

describe('HeroStepCard', () => {
  test('renders step count, progress percentage, and 4 micro-metrics', async () => {
    const { getByText, getAllByText } = await render(
      <HeroStepCard currentSteps={6000} goalSteps={10000} />
    );

    expect(getByText('DAILY STEP GOAL')).toBeTruthy();
    expect(getByText('60% of goal')).toBeTruthy();
    expect(getByText('/10,000 steps')).toBeTruthy();

    // 4 Micro-metric columns
    expect(getByText('STEPS')).toBeTruthy();
    expect(getAllByText('6,000').length).toBe(2); // In Gauge + in Micro-metrics
    expect(getByText('TIME')).toBeTruthy();
    expect(getByText('60 min')).toBeTruthy();
    expect(getByText('CALORIES')).toBeTruthy();
    expect(getByText('240 kcal')).toBeTruthy();
    expect(getByText('DISTANCE')).toBeTruthy();
    expect(getByText('4.6 km')).toBeTruthy();
  });

  test('renders goal celebration badge when goal is reached or exceeded', async () => {
    const { getByText } = await render(<HeroStepCard currentSteps={11500} goalSteps={10000} />);

    expect(getByText('Goal Smashed! (115%)')).toBeTruthy();
  });

  test('calls onOpenGoalModal when goal subtitle is tapped', async () => {
    const mockGoalModal = jest.fn();
    const { getByLabelText } = await render(
      <HeroStepCard currentSteps={4000} goalSteps={10000} onOpenGoalModal={mockGoalModal} />
    );

    fireEvent.press(getByLabelText('Daily step goal 10,000 steps, tap to edit'));
    expect(mockGoalModal).toHaveBeenCalledTimes(1);
  });

  test('tapping the athletic shoe triggers interactive feedback', async () => {
    const { getByLabelText } = await render(<HeroStepCard currentSteps={5000} goalSteps={10000} />);

    const shoeButton = getByLabelText('Athletic shoe. Tap for motion feedback');
    expect(shoeButton).toBeTruthy();
    fireEvent.press(shoeButton);
  });
});
