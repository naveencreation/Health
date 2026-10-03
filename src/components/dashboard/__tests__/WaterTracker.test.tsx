import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WaterTracker } from '../WaterTracker';

const mockAddWater = jest.fn();
const mockDailyLogs: Record<string, any> = {
  '2026-10-02': { waterMl: 0 },
};

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: '2026-10-02',
    dailyLogs: mockDailyLogs,
    addWater: mockAddWater,
  }),
  useGoals: () => ({
    userGoals: {
      waterGoalMl: 2500,
      cupSizeMl: 250,
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  Ionicons: 'Ionicons',
}));

jest.mock('@/components/water/DropletVisualizer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    DropletVisualizer: React.forwardRef((_props: any, _ref: any) => (
      <View testID="droplet-visualizer" />
    )),
  };
});

describe('WaterTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDailyLogs['2026-10-02'] = { waterMl: 0 };
  });

  test('renders title, zero intake, and goal target matching reference', async () => {
    const { getByText, getByTestId, getByLabelText } = await render(<WaterTracker />);

    expect(getByText('Water')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
    expect(getByText('mL')).toBeTruthy();
    expect(getByText('/ 2,500 mL')).toBeTruthy();
    expect(getByTestId('droplet-visualizer')).toBeTruthy();

    // Minus button is disabled when water is 0
    const minusBtn = getByLabelText(/Decrease water/i);
    expect(minusBtn.props.accessibilityState?.disabled).toBe(true);
  });

  test('calls addWater with step when plus button is tapped', async () => {
    const { getByLabelText } = await render(<WaterTracker />);

    const plusBtn = getByLabelText(/Increase water/i);
    fireEvent.press(plusBtn);

    expect(mockAddWater).toHaveBeenCalledWith(250, 'water');
  });

  test('calls addWater with negative step when intake > 0 and minus is tapped', async () => {
    mockDailyLogs['2026-10-02'] = { waterMl: 500 };
    const { getByLabelText } = await render(<WaterTracker />);

    const minusBtn = getByLabelText(/Decrease water/i);
    expect(minusBtn.props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(minusBtn);
    expect(mockAddWater).toHaveBeenCalledWith(-250, 'water');
  });

  test('calls onPressHeader when left column is tapped', async () => {
    const mockOnPressHeader = jest.fn();
    const { getByLabelText } = await render(<WaterTracker onPressHeader={mockOnPressHeader} />);

    fireEvent.press(getByLabelText('Open Water Tracker details'));
    expect(mockOnPressHeader).toHaveBeenCalledTimes(1);
  });
});
