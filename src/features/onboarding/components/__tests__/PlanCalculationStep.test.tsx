import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PlanCalculationStep } from '../PlanCalculationStep';
import { CalculatedHealthPlan } from '../../services/onboardingCalculator';
import { haptics } from '@/utils/haptics';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    impactMedium: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockPlan: CalculatedHealthPlan = {
  bmr: 1650,
  tdee: 2269,
  dailyCalorieBudget: 1769,
  targetProteinG: 133,
  targetCarbsG: 199,
  targetFatG: 49,
  targetFiberG: 28,
  targetWaterMl: 2600,
  stepGoal: 10000,
  estimatedWeeksToGoal: 10,
};

describe('PlanCalculationStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders target calories, metabolic rates, macros, and habits accurately', async () => {
    const onConfirm = jest.fn();
    const onBack = jest.fn();

    const { getByText, getByRole } = await render(
      <PlanCalculationStep
        plan={mockPlan}
        onConfirm={onConfirm}
        onBack={onBack}
        stepIndicator="Step 6 of 7"
      />
    );

    // Header & Titles
    expect(getByText('YOUR PERSONALIZED BLUEPRINT')).toBeTruthy();
    expect(getByText('Your Custom Plan')).toBeTruthy();
    expect(getByText('Step 6 of 7')).toBeTruthy();

    // Calorie & Metabolic values
    expect(getByText('1,769')).toBeTruthy();
    expect(getByText('1,650 kcal')).toBeTruthy();
    expect(getByText('2,269 kcal')).toBeTruthy();

    // Macros
    expect(getByText('133g')).toBeTruthy();
    expect(getByText('199g')).toBeTruthy();
    expect(getByText('49g')).toBeTruthy();

    // Habits & Timeline
    expect(getByText('2,600 mL')).toBeTruthy();
    expect(getByText('10,000 steps')).toBeTruthy();
    expect(getByText('~10 weeks')).toBeTruthy();

    // CTA
    expect(getByRole('button', { name: 'Start My Journey' })).toBeTruthy();
  });

  it('triggers haptics and onConfirm when CTA is tapped', async () => {
    const onConfirm = jest.fn();

    const { getByRole } = await render(
      <PlanCalculationStep plan={mockPlan} onConfirm={onConfirm} />
    );

    const ctaButton = getByRole('button', { name: 'Start My Journey' });
    fireEvent.press(ctaButton);

    await waitFor(() => {
      expect(haptics.impactMedium).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onBack when back button is tapped', async () => {
    const onConfirm = jest.fn();
    const onBack = jest.fn();

    const { getByRole } = await render(
      <PlanCalculationStep plan={mockPlan} onConfirm={onConfirm} onBack={onBack} />
    );

    const backBtn = getByRole('button', { name: 'Go back' });
    fireEvent.press(backBtn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
