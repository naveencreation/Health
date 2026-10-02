import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StepDistanceCalorieCard, DayMetricData } from '../StepDistanceCalorieCard';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedProps: (factory: () => unknown) => factory(),
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('StepDistanceCalorieCard', () => {
  const sampleDays: DayMetricData[] = [
    { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', steps: 5200, distanceKm: 4.0, calories: 208 },
    { dateStr: '2026-09-17', dayNum: 17, dayName: 'T', steps: 5024, distanceKm: 3.8, calories: 201 },
    { dateStr: '2026-09-18', dayNum: 18, dayName: 'W', steps: 5600, distanceKm: 4.3, calories: 224 },
    { dateStr: '2026-09-19', dayNum: 19, dayName: 'T', steps: 6800, distanceKm: 5.2, calories: 272 },
    { dateStr: '2026-09-20', dayNum: 20, dayName: 'F', steps: 5400, distanceKm: 4.1, calories: 216 },
    { dateStr: '2026-09-21', dayNum: 21, dayName: 'S', steps: 5800, distanceKm: 4.4, calories: 232 },
    { dateStr: '2026-09-22', dayNum: 22, dayName: 'S', steps: 4600, distanceKm: 3.5, calories: 184 },
  ];

  test('renders header title, mode tabs, and summary tiles', async () => {
    const handleSelectDay = jest.fn();
    const { getByText, getByLabelText } = await render(
      <StepDistanceCalorieCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
      />
    );

    // Header & Tabs
    expect(getByText('Distance & Calories')).toBeTruthy();
    expect(getByLabelText('Distance mode')).toBeTruthy();
    expect(getByLabelText('Calories mode')).toBeTruthy();

    // Summary footer tiles
    expect(getByText('Total Distance')).toBeTruthy();
    expect(getByText('Active Calories')).toBeTruthy();
  });

  test('switches to Calories mode when Calories tab is pressed', async () => {
    const { getByLabelText, findByText } = await render(
      <StepDistanceCalorieCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText('Calories mode'));
    expect(await findByText(/Daily Avg/)).toBeTruthy();
  });

  test('toggles to line chart view when line icon is pressed', async () => {
    const { getByLabelText } = await render(
      <StepDistanceCalorieCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={jest.fn()}
      />
    );

    const lineToggleBtn = getByLabelText('Show Line Chart view');
    expect(lineToggleBtn).toBeTruthy();
    fireEvent.press(lineToggleBtn);
  });

  test('invokes onSelectDay when day is tapped', async () => {
    const handleSelectDay = jest.fn();
    const { getByLabelText } = await render(
      <StepDistanceCalorieCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
      />
    );

    fireEvent.press(getByLabelText('Day 19: 5.2 km'));
    expect(handleSelectDay).toHaveBeenCalledWith(3);
  });
});
