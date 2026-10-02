import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MovementTrackerCard } from '../MovementTrackerCard';
import { DailyHabitsCard } from '../DailyHabitsCard';

const mockAddSteps = jest.fn();
const mockAddWorkout = jest.fn();
const mockRemoveWorkout = jest.fn();

const mockCreateLog = (steps = 6420) => ({
  steps,
  activities: [
    {
      id: 'act-1',
      name: 'Brisk Walk',
      durationMinutes: 30,
      caloriesBurned: 130,
      loggedAt: '2026-10-02T10:00:00Z',
    },
  ],
});

let mockCurrentLogState = mockCreateLog();

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    currentLog: mockCurrentLogState,
    addSteps: mockAddSteps,
    addWorkout: mockAddWorkout,
    removeWorkout: mockRemoveWorkout,
  }),
  useGoals: () => ({
    userGoals: {
      stepGoal: 10000,
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
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

describe('MovementTrackerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentLogState = mockCreateLog();
  });

  test('renders title, step count, target goal, distance in km, burn estimate, and progress percentage', async () => {
    const { getByText } = await render(<MovementTrackerCard />);

    expect(getByText('Movement')).toBeTruthy();
    expect(getByText('6,420')).toBeTruthy();
    expect(getByText('steps')).toBeTruthy();
    expect(getByText('/ 10,000 steps • ~4.9 km • ~257 kcal')).toBeTruthy();
    expect(getByText(/64%/)).toBeTruthy();
    expect(getByText(/of daily goal/)).toBeTruthy();
  });

  test('renders Goal Smashed celebration badge when steps >= stepGoal', async () => {
    mockCurrentLogState = mockCreateLog(11000);
    const { getByText } = await render(<MovementTrackerCard />);

    expect(getByText(/Goal Smashed! \(110%\)/)).toBeTruthy();
  });

  test('calls addSteps when plus stepper is tapped', async () => {
    const { getByLabelText } = await render(<MovementTrackerCard />);

    const addBtn = getByLabelText('Add 1,000 steps');
    fireEvent.press(addBtn);
    expect(mockAddSteps).toHaveBeenCalledWith(1000);
  });

  test('calls addSteps with negative amount when minus stepper is tapped', async () => {
    const { getByLabelText } = await render(<MovementTrackerCard />);

    const minusBtn = getByLabelText('Decrease steps by 1,000');
    fireEvent.press(minusBtn);
    expect(mockAddSteps).toHaveBeenCalledWith(-1000);
  });

  test('disables minus button when steps are 0', async () => {
    mockCurrentLogState = mockCreateLog(0);
    const { getByLabelText } = await render(<MovementTrackerCard />);

    const minusBtn = getByLabelText('Decrease steps by 1,000');
    expect(minusBtn.props.accessibilityState?.disabled).toBe(true);
  });

  test('displays logged workouts and allows removing an activity', async () => {
    const { getByText, getByLabelText } = await render(<MovementTrackerCard />);

    expect(getByText("Today's Workouts (1)")).toBeTruthy();
    expect(getByText('+130 kcal total')).toBeTruthy();
    expect(getByText('Brisk Walk')).toBeTruthy();

    const removeBtn = getByLabelText('Remove workout Brisk Walk');
    fireEvent.press(removeBtn);
    expect(mockRemoveWorkout).toHaveBeenCalledWith('act-1');
  });

  test('opens workout modal and logs quick workout', async () => {
    const { getByLabelText, getByText } = await render(<MovementTrackerCard />);

    // Tap + Workout button
    const workoutBtn = getByLabelText('Log workout');
    fireEvent.press(workoutBtn);

    await waitFor(() => {
      expect(getByText('Log Activity / Workout')).toBeTruthy();
    });

    expect(getByText('Quick select an exercise:')).toBeTruthy();

    // Select Gym / Weights preset
    const gymBtn = getByLabelText('Log Gym / Weights workout');
    fireEvent.press(gymBtn);

    expect(mockAddWorkout).toHaveBeenCalledWith('Gym / Weights', 45, 220);
  });

  test('tapping workout chip opens edit mode and updates activity', async () => {
    const { getByLabelText, getByText } = await render(<MovementTrackerCard />);

    const editChip = getByLabelText('Edit workout Brisk Walk');
    fireEvent.press(editChip);

    await waitFor(() => {
      expect(getByText('Edit Activity')).toBeTruthy();
    });

    const updateBtn = getByLabelText('Save custom workout');
    expect(getByText('Update Workout')).toBeTruthy();
    fireEvent.press(updateBtn);

    expect(mockRemoveWorkout).toHaveBeenCalledWith('act-1');
    expect(mockAddWorkout).toHaveBeenCalledWith('Brisk Walk', 30, 130);
  });

  test('DailyHabitsCard backward-compatibility alias renders MovementTrackerCard', async () => {
    const { getByTestId, getByText } = await render(<DailyHabitsCard />);

    expect(getByTestId('daily-habits-card')).toBeTruthy();
    expect(getByText('Movement')).toBeTruthy();
  });
});
