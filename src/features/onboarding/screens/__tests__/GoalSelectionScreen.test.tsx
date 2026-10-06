import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { GoalSelectionScreen } from '../GoalSelectionScreen';

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

describe('GoalSelectionScreen (S3)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders personalized title with user name and all 4 goal options', async () => {
    const { getByText, getByTestId } = await render(
      <GoalSelectionScreen name="Aarav" />
    );

    expect(getByText('What brings you here, Aarav?')).toBeTruthy();
    expect(getByTestId('goal-card-lose')).toBeTruthy();
    expect(getByTestId('goal-card-maintain')).toBeTruthy();
    expect(getByTestId('goal-card-build')).toBeTruthy();
    expect(getByTestId('goal-card-understand')).toBeTruthy();
  });

  it('shows reassurance banner on selection and advances when Continue is pressed', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <GoalSelectionScreen name="Aarav" onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('goal-card-lose'));
    });

    expect(
      getByText("We'll set a gentle calorie budget you can actually stick to.")
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('goal-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith('lose_weight', 'lose');
  });

  it('supports selecting "Just understand what I eat" and manual Continue', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <GoalSelectionScreen onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('goal-card-understand'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('goal-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith('maintain', 'understand');
  });
});
