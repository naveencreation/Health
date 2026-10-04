import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StrugglesScreen } from '../StrugglesScreen';

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

describe('StrugglesScreen (S4)', () => {
  it('renders title, struggle chips, and disabled continue button initially', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(
      <StrugglesScreen onContinue={onContinue} />
    );

    expect(getByText('What usually makes tracking hard?')).toBeTruthy();
    expect(getByTestId('struggle-chip-portions')).toBeTruthy();
    expect(getByTestId('struggle-chip-home_cooked')).toBeTruthy();

    const continueBtn = getByTestId('struggles-continue-button');
    fireEvent.press(continueBtn);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('selects chips, shows reassurance, and enables continue', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <StrugglesScreen onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('struggle-chip-portions'));
    });

    expect(
      getByText('Scan estimates portions for you, no food scales needed.')
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('struggles-continue-button'));
    });
    expect(onContinue).toHaveBeenCalledWith(['portions']);
  });

  it('enforces maximum of 3 selections by shifting the oldest', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <StrugglesScreen onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('struggle-chip-portions'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('struggle-chip-home_cooked'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('struggle-chip-late_snacking'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('struggle-chip-protein'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('struggles-continue-button'));
    });
    expect(onContinue).toHaveBeenCalledWith([
      'home_cooked',
      'late_snacking',
      'protein',
    ]);
  });
});
