import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StepTrackerScreen } from '../StepTrackerScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('StepTrackerScreen', () => {
  test('renders header title and placeholder content', async () => {
    const mockBack = jest.fn();
    const { getByText, getAllByText, getByLabelText } = await render(
      <StepTrackerScreen onBack={mockBack} />
    );

    expect(getAllByText('Step Tracker').length).toBe(2);
    expect(getByLabelText('Go back')).toBeTruthy();
    expect(
      getByText(/Track your daily step cadence, walking distance, active energy output/i)
    ).toBeTruthy();
  });

  test('calls onBack when back button is pressed', async () => {
    const mockBack = jest.fn();
    const { getByLabelText } = await render(
      <StepTrackerScreen onBack={mockBack} />
    );

    fireEvent.press(getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
