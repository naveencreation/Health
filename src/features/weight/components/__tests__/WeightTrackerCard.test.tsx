import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WeightTrackerCard } from '../WeightTrackerCard';

const mockDailyLogs: Record<string, any> = {
  '2026-10-02': { weightKg: 78.5 },
  '2026-10-01': { weightKg: 78.7 },
};

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: '2026-10-02',
    currentLog: { weightKg: 78.5 },
    dailyLogs: mockDailyLogs,
  }),
  useGoals: () => ({
    userGoals: {
      currentWeightKg: 78.5,
      startWeightKg: 80.0,
      targetWeightKg: 75.0,
      weightUnit: 'kg',
    },
  }),
}));

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    Easing: {
      out: () => () => {},
      cubic: () => {},
    },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  Ionicons: 'Ionicons',
}));

jest.mock('../../modals/LogWeightModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LogWeightModal: (props: any) => (props.visible ? <View testID="log-weight-modal" /> : null),
  };
});

describe('WeightTrackerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders title, weight metric, delta, Update button, and goal range', async () => {
    const { getByText, getByLabelText } = await render(<WeightTrackerCard />);

    expect(getByText('Weight')).toBeTruthy();
    expect(getByText('78.5')).toBeTruthy();
    expect(getByText('kg')).toBeTruthy();
    expect(getByText('- 0.2 kg')).toBeTruthy();
    expect(getByText('Update')).toBeTruthy();
    expect(getByText('80.0 kg')).toBeTruthy();
    expect(getByText('75.0 kg')).toBeTruthy();
    expect(getByLabelText('Open Weight Tracker details')).toBeTruthy();
    expect(getByLabelText('Update weight')).toBeTruthy();
  });

  test('calls onOpenFullTracker when left column is tapped', async () => {
    const mockOnOpen = jest.fn();
    const { getByLabelText } = await render(<WeightTrackerCard onOpenFullTracker={mockOnOpen} />);

    fireEvent.press(getByLabelText('Open Weight Tracker details'));
    expect(mockOnOpen).toHaveBeenCalledTimes(1);
  });

  test('opens LogWeightModal when Update button is pressed', async () => {
    const { getByLabelText, getByTestId, queryByTestId } = await render(<WeightTrackerCard />);

    expect(queryByTestId('log-weight-modal')).toBeNull();

    fireEvent.press(getByLabelText('Update weight'));
    await waitFor(() => {
      expect(getByTestId('log-weight-modal')).toBeTruthy();
    });
  });
});
