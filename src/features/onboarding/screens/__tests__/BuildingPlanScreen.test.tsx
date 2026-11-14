import React from 'react';
import { act, render } from '@testing-library/react-native';
import { BuildingPlanScreen } from '../BuildingPlanScreen';
import type { CalculatedHealthPlan } from '../../services/onboardingCalculator';

jest.mock('@/utils/haptics', () => ({
  haptics: { selection: jest.fn() },
}));

const plan: CalculatedHealthPlan = {
  bmr: 1500,
  tdee: 2000,
  dailyCalorieBudget: 1650,
  targetProteinG: 0,
  targetCarbsG: 0,
  targetFatG: 0,
  targetFiberG: 0,
  targetWaterMl: 0,
  stepGoal: 0,
  weeklyChangeKg: -0.5,
  goalDate: 'Mar 3',
};

const renderScreen = (props: { name?: string; onComplete?: () => void } = {}) =>
  render(
    <BuildingPlanScreen
      name={props.name}
      plan={plan}
      activityLabel="Mostly sitting"
      pace="steady"
      weightUnit="kg"
      targetWeightKg={70}
      onComplete={props.onComplete ?? jest.fn()}
    />
  );

describe('BuildingPlanScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts running with placeholder rows', async () => {
    const { getByText, queryByText, getAllByTestId } = await renderScreen({ name: 'Naveen' });
    expect(getByText('Working it out, Naveen')).toBeTruthy();
    expect(getByText('Building your plan…')).toBeTruthy();
    expect(getAllByTestId(/building-plan-placeholder-/)).toHaveLength(3);
    expect(queryByText('Resting burn')).toBeNull();
  });

  it('reveals rows and the total, then completes at 4000 ms', async () => {
    const onComplete = jest.fn();
    const { getByText, getByTestId } = await renderScreen({ name: 'Naveen', onComplete });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1900);
    });
    expect(getByText('1,500')).toBeTruthy();
    expect(getByText('+500')).toBeTruthy();
    expect(getByText('−350')).toBeTruthy();
    expect(getByText('Steady, for 70 kg by Mar 3')).toBeTruthy();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(onComplete).not.toHaveBeenCalled();
    expect(getByText('Your number, Naveen')).toBeTruthy();
    expect(getByText('1,650')).toBeTruthy();
    expect(getByText('Opening your plan…')).toBeTruthy();
    expect(getByTestId('building-plan-total').props.accessibilityLabel).toBe(
      'Your daily target is 1,650 calories'
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('drops the name when blank', async () => {
    const { getByText } = await renderScreen({ name: '   ' });
    expect(getByText('Working it out')).toBeTruthy();
  });

  it('does not complete after unmount', async () => {
    const onComplete = jest.fn();
    const { unmount } = await renderScreen({ onComplete });
    unmount();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
