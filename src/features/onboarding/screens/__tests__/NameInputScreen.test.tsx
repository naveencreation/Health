import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { NameInputScreen } from '../NameInputScreen';

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
    FadeInDown: {
      duration: () => ({
        springify: () => ({
          damping: () => ({}),
        }),
      }),
    },
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
    impactLight: jest.fn(),
  },
}));

describe('NameInputScreen (S2)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, input, and continue button correctly', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(
      <NameInputScreen onContinue={onContinue} />
    );

    expect(getByText('First things first, what should we call you?')).toBeTruthy();
    expect(getByText('Just a first name or nickname is fine.')).toBeTruthy();
    expect(getByTestId('name-input-field')).toBeTruthy();
    expect(getByTestId('name-continue-button')).toBeTruthy();
  });

  it('allows typing name and shows greeting on continue before calling onContinue with entered name', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <NameInputScreen onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input-field'), 'Priya');
    });

    await act(async () => {
      fireEvent.press(getByTestId('name-continue-button'));
    });

    // Greeting view should be displayed
    expect(getByTestId('name-greeting-view')).toBeTruthy();
    expect(getByText('Priya.')).toBeTruthy();

    await waitFor(
      () => {
        expect(onContinue).toHaveBeenCalledWith('Priya');
      },
      { timeout: 2000 }
    );
  });

  it('falls back to "friend" if user continues with empty name', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <NameInputScreen onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('name-continue-button'));
    });

    expect(getByTestId('name-greeting-view')).toBeTruthy();
    expect(getByText('friend.')).toBeTruthy();

    await waitFor(
      () => {
        expect(onContinue).toHaveBeenCalledWith('friend');
      },
      { timeout: 2000 }
    );
  });

  it('allows tapping greeting view to advance immediately without waiting', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <NameInputScreen onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input-field'), 'Naveen');
    });

    await act(async () => {
      fireEvent.press(getByTestId('name-continue-button'));
    });

    expect(getByTestId('name-greeting-touchable')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('name-greeting-touchable'));
    });

    expect(onContinue).toHaveBeenCalledWith('Naveen');
  });
});
