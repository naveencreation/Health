import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AboutYouScreen } from '../AboutYouScreen';

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

describe('AboutYouScreen (S5)', () => {
  it('renders sex options and age picker', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(
      <AboutYouScreen onContinue={onContinue} />
    );

    expect(getByText('A little about you.')).toBeTruthy();
    expect(getByTestId('sex-option-female')).toBeTruthy();
    expect(getByTestId('sex-option-male')).toBeTruthy();
    expect(getByTestId('sex-option-prefer_not_to_say')).toBeTruthy();
    expect(getByTestId('age-scroll-wheel')).toBeTruthy();
  });

  it('selects sex and allows continue for adult age', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <AboutYouScreen onContinue={onContinue} initialAge={28} initialSex="male" />
    );

    await act(async () => {
      fireEvent.press(getByTestId('sex-option-female'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('about-you-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith('female', 28);
  });

  it('displays policy notice and disables continue when age is under 13', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <AboutYouScreen onContinue={onContinue} initialAge={11} />
    );

    expect(getByTestId('age-policy-banner')).toBeTruthy();
    expect(
      getByText('Calorify is designed for users aged 13 and older.')
    ).toBeTruthy();

    const continueBtn = getByTestId('about-you-continue-button');
    fireEvent.press(continueBtn);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('displays maintain guidance when age is 13 to 17', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <AboutYouScreen onContinue={onContinue} initialAge={15} />
    );

    expect(getByTestId('age-policy-banner')).toBeTruthy();
    expect(
      getByText(
        "Because you're still growing, we'll set a healthy maintenance budget to support your energy and development."
      )
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('about-you-continue-button'));
    });
    expect(onContinue).toHaveBeenCalledWith('female', 15);
  });
});
