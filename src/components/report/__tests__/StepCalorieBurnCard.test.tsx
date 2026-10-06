import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StepCalorieBurnCard, DayCalorieData } from '../StepCalorieBurnCard';

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

describe('StepCalorieBurnCard', () => {
  const sampleDays: DayCalorieData[] = [
    { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', calories: 208 },
    { dateStr: '2026-09-17', dayNum: 17, dayName: 'T', calories: 201 },
    { dateStr: '2026-09-18', dayNum: 18, dayName: 'W', calories: 224 },
    { dateStr: '2026-09-19', dayNum: 19, dayName: 'T', calories: 272 },
    { dateStr: '2026-09-20', dayNum: 20, dayName: 'F', calories: 216 },
    { dateStr: '2026-09-21', dayNum: 21, dayName: 'S', calories: 232 },
    { dateStr: '2026-09-22', dayNum: 22, dayName: 'S', calories: 184 },
  ];

  test('renders header title, legend items, and day numbers', async () => {
    const handleSelectDay = jest.fn();
    const { getByText } = await render(
      <StepCalorieBurnCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
        periodDailyAvgCalories={220}
      />
    );

    // Header & Legend
    expect(getByText('Active Calorie Burn')).toBeTruthy();
    expect(getByText('Selected')).toBeTruthy();
    expect(getByText('Daily Avg (220 kcal)')).toBeTruthy();

    // Day numbers
    expect(getByText('16')).toBeTruthy();
    expect(getByText('19')).toBeTruthy();
    expect(getByText('22')).toBeTruthy();
  });

  test('displays tooltip pin with selected calorie value', async () => {
    const { getByText } = await render(
      <StepCalorieBurnCard
        days={sampleDays}
        selectedIndex={3} // Day 19 with 272 kcal
        onSelectDay={jest.fn()}
      />
    );

    expect(getByText('272')).toBeTruthy();
    expect(getByText('kcal')).toBeTruthy();
  });

  test('toggles to line chart view when line icon is pressed', async () => {
    const { getByLabelText } = await render(
      <StepCalorieBurnCard days={sampleDays} selectedIndex={1} onSelectDay={jest.fn()} />
    );

    const lineToggleBtn = getByLabelText('Show Line Chart view');
    expect(lineToggleBtn).toBeTruthy();
    fireEvent.press(lineToggleBtn);
  });

  test('invokes onSelectDay when day bar is tapped', async () => {
    const handleSelectDay = jest.fn();
    const { getByLabelText } = await render(
      <StepCalorieBurnCard days={sampleDays} selectedIndex={1} onSelectDay={handleSelectDay} />
    );

    fireEvent.press(getByLabelText('Day 19: 272 kcal'));
    expect(handleSelectDay).toHaveBeenCalledWith(3);
  });
});
