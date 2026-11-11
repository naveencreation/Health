import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TodayMetricGrid } from '../TodayMetricGrid';

let mockHeightCm: number | undefined = 175;

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../common/AnimatedProgressBar', () => ({ AnimatedProgressBar: () => null }));
jest.mock('@/context/HealthContext', () => ({
  useGoals: () => ({ userGoals: { heightCm: mockHeightCm } }),
}));
jest.mock('@/features/hydration/hooks/useHydration', () => ({
  useHydration: () => ({ currentWaterMl: 1250, targetWaterMl: 2500, percentage: 50 }),
}));
jest.mock('@/features/weight/hooks/useWeight', () => ({
  useWeight: () => ({
    unit: 'kg',
    displayCurrentWeight: '72.4',
    displayTargetWeight: '68.0',
    displayDelta: '0.3',
    isLoss: true,
    isGain: false,
    progressPercent: 40,
    bmi: 23.6,
  }),
}));
jest.mock('@/features/movement/hooks/useMovement', () => ({
  useMovement: () => ({
    steps: 4836,
    stepGoal: 10000,
    barPercent: 48,
    distanceKm: '3.7',
    stepBurnKcal: 193.44,
  }),
}));

const handlers = () => ({
  onOpenWater: jest.fn(),
  onOpenWeight: jest.fn(),
  onOpenSteps: jest.fn(),
  onEditGoal: jest.fn(),
});

describe('TodayMetricGrid', () => {
  beforeEach(() => {
    mockHeightCm = 175;
  });

  it('shows each metric and opens its tracker', async () => {
    const h = handlers();
    const { getByText, getByTestId } = await render(<TodayMetricGrid {...h} />);

    expect(getByText('Body & activity')).toBeTruthy();
    expect(getByText('of 2,500 mL')).toBeTruthy();
    expect(getByText('▼ 0.3 · Goal 68.0 kg')).toBeTruthy();
    expect(getByText(/23\.6/)).toBeTruthy();
    expect(getByText('Normal')).toBeTruthy();
    expect(getByText('of 10,000 steps')).toBeTruthy();

    await fireEvent.press(getByTestId('today-tile-water'));
    await fireEvent.press(getByTestId('today-tile-weight'));
    await fireEvent.press(getByTestId('today-tile-bmi'));
    await fireEvent.press(getByTestId('today-tile-steps'));
    expect(h.onOpenWater).toHaveBeenCalledTimes(1);
    expect(h.onOpenWeight).toHaveBeenCalledTimes(2);
    expect(h.onOpenSteps).toHaveBeenCalledTimes(1);
    expect(h.onEditGoal).not.toHaveBeenCalled();
  });

  it('asks for height instead of showing a made-up BMI', async () => {
    mockHeightCm = undefined;
    const h = handlers();
    const { getByText, queryByText, getByTestId } = await render(<TodayMetricGrid {...h} />);

    expect(getByText('Add your height')).toBeTruthy();
    expect(queryByText(/23\.6/)).toBeNull();
    await fireEvent.press(getByTestId('today-tile-bmi'));
    expect(h.onEditGoal).toHaveBeenCalledTimes(1);
    expect(h.onOpenWeight).not.toHaveBeenCalled();
  });
});
