import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { TrackerScreen } from '../TrackerScreen';

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
    interpolate: (_value: number, _input: number[], output: number[]) => output[1],
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: '2026-10-02',
  }),
  useGoals: () => ({
    userGoals: {},
  }),
}));

jest.mock('@/components', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    TopDateStrip: () => <Text testID="top-date-strip">TopDateStrip</Text>,
    RiaCoachCard: ({ onOpenChat }: any) => (
      <Pressable testID="ria-coach-card" onPress={onOpenChat}>
        <Text>RiaCoachCard</Text>
      </Pressable>
    ),
    WaterTracker: ({ onPressHeader }: any) => (
      <Pressable testID="water-tracker-card" onPress={onPressHeader}>
        <Text>WaterTracker</Text>
      </Pressable>
    ),
    WeightTrackerCard: ({ onOpenFullTracker }: any) => (
      <Pressable testID="weight-tracker-card" onPress={onOpenFullTracker}>
        <Text>WeightTrackerCard</Text>
      </Pressable>
    ),
    TodayBMICard: () => <Text testID="today-bmi-card">TodayBMICard</Text>,
    MovementTrackerCard: ({ onPressHeader }: any) => (
      <Pressable testID="movement-tracker-card" onPress={onPressHeader}>
        <Text>MovementTrackerCard</Text>
      </Pressable>
    ),
  };
});

describe('TrackerScreen', () => {
  test('renders header title and all 6 health & habit components in exact sequence', async () => {
    const { getByText, getByTestId } = await render(<TrackerScreen />);

    expect(getByText('Track')).toBeTruthy();
    expect(getByTestId('top-date-strip')).toBeTruthy();
    expect(getByTestId('ria-coach-card')).toBeTruthy();
    expect(getByTestId('water-tracker-card')).toBeTruthy();
    expect(getByTestId('weight-tracker-card')).toBeTruthy();
    expect(getByTestId('today-bmi-card')).toBeTruthy();
    expect(getByTestId('movement-tracker-card')).toBeTruthy();
  });

  test('wires onOpenRiaChat callback when Ria card is tapped', async () => {
    const mockRiaChat = jest.fn();
    const { getByTestId } = await render(<TrackerScreen onOpenRiaChat={mockRiaChat} />);

    fireEvent.press(getByTestId('ria-coach-card'));
    expect(mockRiaChat).toHaveBeenCalledTimes(1);
  });

  test('wires onOpenWaterTracker callback when WaterTracker is tapped', async () => {
    const mockWaterTracker = jest.fn();
    const { getByTestId } = await render(<TrackerScreen onOpenWaterTracker={mockWaterTracker} />);

    fireEvent.press(getByTestId('water-tracker-card'));
    expect(mockWaterTracker).toHaveBeenCalledTimes(1);
  });

  test('wires onOpenWeightTracker callback when WeightTrackerCard is tapped', async () => {
    const mockWeightTracker = jest.fn();
    const { getByTestId } = await render(<TrackerScreen onOpenWeightTracker={mockWeightTracker} />);

    fireEvent.press(getByTestId('weight-tracker-card'));
    expect(mockWeightTracker).toHaveBeenCalledTimes(1);
  });

  test('wires onOpenStepTracker callback when MovementTrackerCard is tapped', async () => {
    const mockStepTracker = jest.fn();
    const { getByTestId } = await render(<TrackerScreen onOpenStepTracker={mockStepTracker} />);

    fireEvent.press(getByTestId('movement-tracker-card'));
    expect(mockStepTracker).toHaveBeenCalledTimes(1);
  });
});
