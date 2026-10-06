import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { TargetWeightScreen } from '../TargetWeightScreen';

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
    useAnimatedScrollHandler: () => () => {},
    withTiming: (value: number) => value,
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

describe('TargetWeightScreen (S7)', () => {
  it('renders target weight stepper and live timeline feedback card', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(
      <TargetWeightScreen
        currentWeightKg={70}
        heightCm={175}
        goal="lose_weight"
        onContinue={onContinue}
      />
    );

    expect(getByText('Where would you like to be?')).toBeTruthy();
    expect(getByTestId('live-feedback-card')).toBeTruthy();
    expect(getByTestId('decrease-weight-button')).toBeTruthy();
    expect(getByTestId('increase-weight-button')).toBeTruthy();
  });

  it('adjusts target weight and provides safe target to onContinue', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <TargetWeightScreen
        currentWeightKg={75}
        heightCm={175}
        goal="lose_weight"
        onContinue={onContinue}
      />
    );

    await act(async () => {
      fireEvent.press(getByTestId('decrease-weight-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('target-weight-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith(69);
  });

  it('triggers guardrail warning when target falls below BMI 18.5 limit', async () => {
    const onContinue = jest.fn();
    // For 175cm, BMI 18.5 is ~56.7 kg -> minSafe is 57 kg
    const { getByTestId, getByText } = await render(
      <TargetWeightScreen
        currentWeightKg={60}
        heightCm={175}
        goal="lose_weight"
        initialTargetWeightKg={50} // Below 57 kg!
        onContinue={onContinue}
      />
    );

    expect(getByTestId('guardrail-warning-banner')).toBeTruthy();
    expect(
      getByText("That's below a healthy range for your height, so let's aim for 56.7 kg.")
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('target-weight-continue-button'));
    });
    // Clamped safely to 56.7 kg
    expect(onContinue).toHaveBeenCalledWith(56.7);
  });
});
