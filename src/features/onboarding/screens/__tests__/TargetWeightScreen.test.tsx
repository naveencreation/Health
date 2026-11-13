import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  TargetWeightScreen,
  targetRange,
  healthyRange,
  riaTargetMessage,
} from '../TargetWeightScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/utils/haptics', () => ({ haptics: { selection: jest.fn() } }));

const press = async (el: unknown) => {
  await act(async () => {
    fireEvent.press(el as never);
  });
};

describe('TargetWeightScreen', () => {
  it('renders the drum, delta pill and healthy range for a lose goal', async () => {
    const { getByTestId, getByText } = await render(
      <TargetWeightScreen
        onContinue={jest.fn()}
        currentWeightKg={63}
        heightCm={162}
        goal="lose_weight"
      />
    );
    expect(getByTestId('target-weight-wheel')).toBeTruthy();
    expect(getByText('5 kg less than today')).toBeTruthy();
    expect(getByText('Healthy range for your height: 49–65 kg')).toBeTruthy();
    expect(getByTestId('target-weight-ria-reply')).toBeTruthy();
  });

  it('continues with the default target in kg', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <TargetWeightScreen
        onContinue={onContinue}
        currentWeightKg={63}
        heightCm={162}
        goal="lose_weight"
      />
    );
    await press(getByTestId('target-weight-continue-button'));
    expect(onContinue).toHaveBeenCalledWith(58);
  });

  it('shows lb and "more than today" for a gain goal in lbs, and returns kg', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText, getAllByText } = await render(
      <TargetWeightScreen
        onContinue={onContinue}
        currentWeightKg={63}
        heightCm={162}
        goal="gain_muscle"
        weightUnit="lbs"
      />
    );
    expect(getByText(/more than today/)).toBeTruthy();
    expect(getAllByText(/ lb/).length).toBeGreaterThan(0);
    await press(getByTestId('target-weight-continue-button'));
    const kg = onContinue.mock.calls[0][0];
    // default 63 + 3 kg = 66 kg = 145.5 lb -> 146 lb whole
    expect(Math.abs(kg - 146 / 2.20462)).toBeLessThan(0.1);
  });

  it('shows the lean card and continues with the current weight', async () => {
    const onContinue = jest.fn();
    const { getByTestId, queryByTestId } = await render(
      <TargetWeightScreen
        onContinue={onContinue}
        currentWeightKg={48}
        heightCm={162}
        goal="lose_weight"
      />
    );
    expect(getByTestId('target-weight-lean-card')).toBeTruthy();
    expect(queryByTestId('target-weight-wheel')).toBeNull();
    expect(queryByTestId('target-weight-delta')).toBeNull();
    await press(getByTestId('target-weight-continue-button'));
    expect(onContinue).toHaveBeenCalledWith(48);
  });
});

describe('targetRange', () => {
  it('lose: max is strictly below current, min is the ceiled safe floor', () => {
    expect(targetRange(63, 162, 'lose_weight', 'kg')).toEqual({ min: 49, max: 62 });
  });
  it('returns null when already lean', () => {
    expect(targetRange(48, 162, 'lose_weight', 'kg')).toBeNull();
  });
  it('gain: from just above current to +20 kg', () => {
    expect(targetRange(63, 162, 'gain_muscle', 'kg')).toEqual({ min: 64, max: 83 });
  });
});

describe('healthyRange', () => {
  it('computes BMI 18.5-24.9 bounds', () => {
    expect(healthyRange(162, 'kg')).toEqual({ lo: 49, hi: 65 });
  });
});

describe('riaTargetMessage', () => {
  it('categorises gain, realistic loss and big loss', () => {
    expect(riaTargetMessage('gain_muscle', 63, 66)).toMatch(/Slow and steady/);
    expect(riaTargetMessage('lose_weight', 100, 90)).toMatch(/realistic/);
    expect(riaTargetMessage('lose_weight', 100, 89)).toMatch(/big goal/);
  });
});
