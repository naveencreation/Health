import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StepTrackerScreen } from '../StepTrackerScreen';
import * as health from '@/features/health';

import { Platform } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockAddSteps = jest.fn();
jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    currentLog: { steps: 5200 },
    addSteps: mockAddSteps,
  }),
  useGoals: () => ({
    userGoals: { stepGoal: 10000 },
  }),
}));

jest.mock('@/features/health', () => ({
  connectHealth: jest.fn(),
  getTodaySteps: jest.fn(),
  hasStepsPermission: jest.fn(),
  openHealthSettings: jest.fn(),
}));

describe('StepTrackerScreen', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    (health.hasStepsPermission as jest.Mock).mockResolvedValue(false);
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  test('renders header title and step metrics', async () => {
    const mockBack = jest.fn();
    const { getByText, getByLabelText } = await render(
      <StepTrackerScreen onBack={mockBack} />
    );

    expect(getByText('Step Tracker')).toBeTruthy();
    expect(getByLabelText('Go back')).toBeTruthy();
    expect(getByText("TODAY'S STEPS")).toBeTruthy();
    expect(getByText('5,200')).toBeTruthy();
    expect(getByText('Goal: 10,000 steps (52%)')).toBeTruthy();
  });

  test('calls onBack when back button is pressed', async () => {
    const mockBack = jest.fn();
    const { getByLabelText } = await render(
      <StepTrackerScreen onBack={mockBack} />
    );

    fireEvent.press(getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('calls connectHealth when Connect button is pressed', async () => {
    (health.connectHealth as jest.Mock).mockResolvedValue({
      success: true,
      reason: null,
    });
    (health.getTodaySteps as jest.Mock).mockResolvedValue(7842);

    const mockBack = jest.fn();
    const { getByLabelText, findByText } = await render(
      <StepTrackerScreen onBack={mockBack} />
    );

    fireEvent.press(getByLabelText('Connect Health Connect'));

    expect(await findByText('7,842')).toBeTruthy();
    expect(await findByText('✓ Synced 7,842 steps from Health Connect')).toBeTruthy();
  });
});
