import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ActivityLevelScreen } from '../ActivityLevelScreen';

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

describe('ActivityLevelScreen (S8)', () => {
  it('renders all 4 activity options and initial step chip', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(
      <ActivityLevelScreen onContinue={onContinue} />
    );

    expect(getByText('How active is a normal week?')).toBeTruthy();
    expect(getByTestId('activity-card-sedentary')).toBeTruthy();
    expect(getByTestId('activity-card-lightly_active')).toBeTruthy();
    expect(getByTestId('activity-card-moderately_active')).toBeTruthy();
    expect(getByTestId('activity-card-very_active')).toBeTruthy();
    expect(getByTestId('activity-step-chip')).toBeTruthy();
  });

  it('changes activity selection, updates step chip, and calls onContinue', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <ActivityLevelScreen onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('activity-card-lightly_active'));
    });
    expect(getByText('8,000 steps')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('activity-continue-button'));
    });
    expect(onContinue).toHaveBeenCalledWith('lightly_active');
  });
});
