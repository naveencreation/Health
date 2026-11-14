import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PlanRevealScreen, planGoalLine, planRiaLine } from '../PlanRevealScreen';
import { CalculatedHealthPlan } from '../../services/onboardingCalculator';
import { Struggle } from '../../services/onboardingDraft';

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
  targetWaterMl: 2200,
  stepGoal: 6000,
  goalDate: '28 Nov 2026',
  pace: 'steady',
  weeklyChangeKg: -0.5,
};

const maintainPlan: CalculatedHealthPlan = {
  ...mockPlan,
  weeklyChangeKg: undefined,
  goalDate: undefined,
};

describe('PlanRevealScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the title with and without a name', async () => {
    const a = await render(<PlanRevealScreen plan={mockPlan} name="Asha" onContinue={jest.fn()} />);
    expect(a.getByText('Your plan, Asha')).toBeTruthy();
    await a.unmount();
    const b = await render(<PlanRevealScreen plan={mockPlan} name="  " onContinue={jest.fn()} />);
    expect(b.getByText('Your plan')).toBeTruthy();
  });

  it('builds the goal line for each case', () => {
    const o = { weightUnit: 'kg' as const, targetWeightKg: 65, weightKg: 70 };
    expect(planGoalLine(mockPlan, o)).toBe('65 kg by 28 Nov 2026');
    expect(planGoalLine(mockPlan, { ...o, weightUnit: 'lbs' })).toBe('143 lb by 28 Nov 2026');
    expect(planGoalLine({ ...mockPlan, goalDate: undefined }, o)).toBe('Losing 0.5 kg a week');
    expect(planGoalLine({ ...mockPlan, weeklyChangeKg: 0.25 }, o)).toBe('Gaining 0.3 kg a week');
    expect(planGoalLine(maintainPlan, o)).toBe('Staying at 70 kg');
    expect(planGoalLine(maintainPlan, { weightUnit: 'kg' })).toBeNull();
  });

  it('renders the pill only when there is a goal line', async () => {
    const a = await render(
      <PlanRevealScreen plan={mockPlan} targetWeightKg={65} onContinue={jest.fn()} />
    );
    expect(a.getByText('65 kg by 28 Nov 2026')).toBeTruthy();
    await a.unmount();
    const b = await render(<PlanRevealScreen plan={maintainPlan} onContinue={jest.fn()} />);
    expect(b.queryByTestId('plan-goal-pill')).toBeNull();
  });

  it('shows the hero values immediately', async () => {
    const { getByText, getByTestId } = await render(
      <PlanRevealScreen plan={mockPlan} onContinue={jest.fn()} />
    );
    expect(getByText('1,850')).toBeTruthy();
    expect(getByText('140 g')).toBeTruthy();
    expect(getByText('180 g')).toBeTruthy();
    expect(getByText('60 g')).toBeTruthy();
    expect(getByTestId('plan-hero').props.accessibilityLabel).toBe(
      '1,850 calories a day. Protein 140 grams, carbs 180 grams, fat 60 grams.'
    );
    expect(getByText('2.2 L')).toBeTruthy();
    expect(getByText('6,000')).toBeTruthy();
  });

  it('picks the Ria line per struggle', () => {
    const all: (Struggle | undefined)[] = [
      'portions',
      'protein',
      'consistency',
      'home_cooked',
      'eating_out',
      'late_snacking',
      'not_sure',
      undefined,
    ];
    const lines = all.map(s => planRiaLine(s, mockPlan));
    expect(new Set(lines).size).toBe(7);
    expect(lines[1]).toContain('140 g');
    expect(lines[5]).toContain('222 kcal');
    expect(lines[6]).toBe(lines[7]);
  });

  it('calls onContinue from the footer button', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <PlanRevealScreen plan={mockPlan} onContinue={onContinue} />
    );
    await act(async () => {
      fireEvent.press(getByTestId('btn-plan-continue'));
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('has no accordion or adjust button', async () => {
    const { queryByText } = await render(
      <PlanRevealScreen plan={mockPlan} onContinue={jest.fn()} />
    );
    expect(queryByText('How we calculated this')).toBeNull();
    expect(queryByText('Adjust my plan')).toBeNull();
  });
});
