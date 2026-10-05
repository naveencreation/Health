import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PlanRevealScreen } from '../PlanRevealScreen';
import { CalculatedHealthPlan } from '../../services/onboardingCalculator';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
    impactMedium: jest.fn(),
  },
}));

const mockPlan: CalculatedHealthPlan = {
  dailyCalorieBudget: 1850,
  bmr: 1650,
  tdee: 2200,
  targetProteinG: 140,
  targetCarbsG: 180,
  targetFatG: 60,
  targetFiberG: 30,
  targetWaterMl: 2800,
  stepGoal: 10000,
  goalDate: '28 Nov 2026',
  pace: 'steady',
};

describe('PlanRevealScreen (S12)', () => {
  it('renders title, hero calorie budget, macro tiles, and insight card', async () => {
    const onLogFirstMeal = jest.fn();
    const { getByText, getByTestId } = await render(
      <PlanRevealScreen
        plan={mockPlan}
        name="Naveen"
        firstStruggle="portions"
        targetWeightKg={72}
        onLogFirstMeal={onLogFirstMeal}
      />
    );

    expect(getByText('Naveen, your plan is ready.')).toBeTruthy();
    expect(getByText('On track for 72 kg by 28 Nov 2026.')).toBeTruthy();
    expect(getByText('140g')).toBeTruthy();
    expect(getByText('180g')).toBeTruthy();
    expect(getByText('60g')).toBeTruthy();
    expect(getByTestId('personal-insight-card')).toBeTruthy();
    expect(
      getByText(
        'You said portion sizes are hard. Scan estimates them from a photo so you don’t have to weigh your food.'
      )
    ).toBeTruthy();
  });

  it('triggers onLogFirstMeal on primary CTA click', async () => {
    const onLogFirstMeal = jest.fn();
    const { getByTestId } = await render(
      <PlanRevealScreen
        plan={mockPlan}
        name="Naveen"
        onLogFirstMeal={onLogFirstMeal}
      />
    );

    await act(async () => {
      fireEvent.press(getByTestId('btn-log-first-meal'));
    });

    expect(onLogFirstMeal).toHaveBeenCalledTimes(1);
  });

  it('toggles "How we calculated this" breakdown', async () => {
    const onLogFirstMeal = jest.fn();
    const { getByText, queryByText } = await render(
      <PlanRevealScreen
        plan={mockPlan}
        name="Naveen"
        onLogFirstMeal={onLogFirstMeal}
      />
    );

    expect(queryByText('Mifflin-St Jeor Equation')).toBeNull();

    await act(async () => {
      fireEvent.press(getByText('How we calculated this'));
    });

    expect(getByText('Mifflin-St Jeor Equation')).toBeTruthy();
    expect(getByText('1,650 kcal')).toBeTruthy();
    expect(getByText('2,200 kcal')).toBeTruthy();
  });
});
