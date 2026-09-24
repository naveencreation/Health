import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { WorkoutHistoryCard } from '../WorkoutHistoryCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const mockUseAnalytics = jest.fn();

jest.mock('@/context/HealthContext', () => ({
  useAnalytics: () => mockUseAnalytics(),
}));

describe('WorkoutHistoryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state when there are no logged activities', async () => {
    mockUseAnalytics.mockReturnValue({
      dailyLogs: {},
    });

    const { getByText } = await render(<WorkoutHistoryCard timeRange="7d" />);

    expect(getByText('Workout History')).toBeTruthy();
    expect(getByText('0 sessions')).toBeTruthy();
    expect(getByText('No workouts logged yet')).toBeTruthy();
    expect(
      getByText(/Log your walks, runs, gym sessions, and yoga/i)
    ).toBeTruthy();
  });

  test('renders workouts with habit stats and dynamic activity details', async () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    mockUseAnalytics.mockReturnValue({
      dailyLogs: {
        [todayStr]: {
          activities: [
            {
              id: 'act-1',
              name: 'Morning Jog',
              durationMinutes: 30,
              caloriesBurned: 240,
            },
            {
              id: 'act-2',
              name: 'Evening Yoga',
              durationMinutes: 45,
              caloriesBurned: 120,
            },
          ],
        },
      },
    });

    const { getByText } = await render(<WorkoutHistoryCard timeRange="7d" />);

    expect(getByText('2 sessions')).toBeTruthy();
    expect(getByText('360')).toBeTruthy(); // 240 + 120 kcal
    expect(getByText('1h 15m')).toBeTruthy(); // 75 mins = 1h 15m
    expect(getByText('1')).toBeTruthy(); // 1 active day
    expect(getByText('/7d')).toBeTruthy();

    expect(getByText('Morning Jog')).toBeTruthy();
    expect(getByText('Evening Yoga')).toBeTruthy();
    expect(getByText('240')).toBeTruthy();
    expect(getByText('120')).toBeTruthy();
  });

  test('handles progressive disclosure expand/collapse for >4 activities', async () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const activities = [
      { id: 'act-1', name: 'Walking', durationMinutes: 20, caloriesBurned: 80 },
      { id: 'act-2', name: 'Running', durationMinutes: 25, caloriesBurned: 200 },
      { id: 'act-3', name: 'Cycling', durationMinutes: 30, caloriesBurned: 220 },
      { id: 'act-4', name: 'Gym Workout', durationMinutes: 40, caloriesBurned: 250 },
      { id: 'act-5', name: 'Swimming', durationMinutes: 35, caloriesBurned: 260 },
    ];

    mockUseAnalytics.mockReturnValue({
      dailyLogs: {
        [todayStr]: { activities },
      },
    });

    const { getByText, queryByText, getByRole } = await render(<WorkoutHistoryCard timeRange="7d" />);

    // First 4 should be visible
    expect(getByText('Walking')).toBeTruthy();
    expect(getByText('Running')).toBeTruthy();
    expect(getByText('Cycling')).toBeTruthy();
    expect(getByText('Gym Workout')).toBeTruthy();
    // 5th activity is hidden initially
    expect(queryByText('Swimming')).toBeNull();

    // Expand button is visible
    const expandBtn = getByRole('button');
    expect(expandBtn).toBeTruthy();

    // Click expand
    await act(async () => {
      fireEvent.press(expandBtn);
    });
    expect(getByText('Swimming')).toBeTruthy();
    expect(getByText('Show fewer')).toBeTruthy();

    // Click collapse
    await act(async () => {
      fireEvent.press(getByRole('button'));
    });
    expect(queryByText('Swimming')).toBeNull();
  });
});
