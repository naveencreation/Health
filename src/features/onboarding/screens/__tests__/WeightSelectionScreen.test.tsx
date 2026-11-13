import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { WeightSelectionScreen, toTenths, tenthsToKg } from '../WeightSelectionScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

const press = async (el: unknown) => {
  await act(async () => {
    fireEvent.press(el as never);
  });
};

describe('WeightSelectionScreen', () => {
  it('renders kg drums at 72.5 with the lb conversion', async () => {
    const { getByText, getByTestId } = await render(
      <WeightSelectionScreen initialWeightKg={72.5} />
    );

    expect(getByText('What do you weigh today?')).toBeTruthy();
    expect(getByTestId('weight-wheel-whole')).toBeTruthy();
    expect(getByTestId('weight-wheel-tenths')).toBeTruthy();
    expect(getByText('That’s 159.8 lb')).toBeTruthy();
  });

  it('switches to lb and shows the kg conversion', async () => {
    const { getByText, getByTestId } = await render(
      <WeightSelectionScreen initialWeightKg={72.5} />
    );

    await press(getByTestId('weight-unit-lbs'));
    expect(getByTestId('weight-wheel-whole')).toBeTruthy();
    expect(getByText('That’s 72.5 kg')).toBeTruthy();
  });

  it('opens in lb when initialUnit is lbs', async () => {
    const { getByText } = await render(
      <WeightSelectionScreen initialWeightKg={80} initialUnit="lbs" />
    );
    expect(getByText('That’s 80.0 kg')).toBeTruthy();
  });

  it('continues with kilograms even in lb mode', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <WeightSelectionScreen initialWeightKg={80} initialUnit="lbs" onContinue={onContinue} />
    );

    await press(getByTestId('weight-continue-button'));
    const [kg, unit] = onContinue.mock.calls[0];
    expect(Math.abs(kg - 80)).toBeLessThanOrEqual(0.1);
    expect(unit).toBe('lbs');
  });

  it('converts and clamps with the pure helpers', () => {
    expect(tenthsToKg(2007, 'kg')).toBe(200);
    expect(toTenths(10, 'kg')).toBe(300);
    expect(toTenths(72.5, 'kg')).toBe(725);
    expect(toTenths(80, 'lbs')).toBe(1764);
    expect(tenthsToKg(660, 'lbs')).toBe(30);
  });
});
