import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StepTimeDurationCard, DayTimeData } from '../StepTimeDurationCard';

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

describe('StepTimeDurationCard', () => {
  const sampleDays: DayTimeData[] = [
    { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', durationMinutes: 52 },
    { dateStr: '2026-09-17', dayNum: 17, dayName: 'T', durationMinutes: 50 },
    { dateStr: '2026-09-18', dayNum: 18, dayName: 'W', durationMinutes: 56 },
    { dateStr: '2026-09-19', dayNum: 19, dayName: 'T', durationMinutes: 68 },
    { dateStr: '2026-09-20', dayNum: 20, dayName: 'F', durationMinutes: 54 },
    { dateStr: '2026-09-21', dayNum: 21, dayName: 'S', durationMinutes: 58 },
    { dateStr: '2026-09-22', dayNum: 22, dayName: 'S', durationMinutes: 46 },
  ];

  test('renders header title, legend items, and day numbers', async () => {
    const handleSelectDay = jest.fn();
    const { getByText } = await render(
      <StepTimeDurationCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
        periodDailyAvgMinutes={55}
      />
    );

    // Header & Legend
    expect(getByText('Active Walking Time')).toBeTruthy();
    expect(getByText('Selected')).toBeTruthy();
    expect(getByText('Daily Avg (55m)')).toBeTruthy();

    // Day numbers
    expect(getByText('16')).toBeTruthy();
    expect(getByText('19')).toBeTruthy();
    expect(getByText('22')).toBeTruthy();
  });

  test('displays tooltip pin with selected duration value', async () => {
    const { getByText } = await render(
      <StepTimeDurationCard
        days={sampleDays}
        selectedIndex={0} // Day 16 with 52 min
        onSelectDay={jest.fn()}
      />
    );

    expect(getByText('52')).toBeTruthy();
    expect(getByText('min')).toBeTruthy();
  });

  test('formats hour pin value for duration >= 60 min', async () => {
    const { getByText } = await render(
      <StepTimeDurationCard
        days={sampleDays}
        selectedIndex={3} // Day 19 with 68 min -> 1.1 hr
        onSelectDay={jest.fn()}
      />
    );

    expect(getByText('1.1')).toBeTruthy();
    expect(getByText('hr')).toBeTruthy();
  });

  test('triggers onSelectDay callback when a day bar is pressed', async () => {
    const handleSelectDay = jest.fn();
    const { getByLabelText } = await render(
      <StepTimeDurationCard days={sampleDays} selectedIndex={0} onSelectDay={handleSelectDay} />
    );

    const targetBar = getByLabelText('Day 19: 1h 8m');
    fireEvent.press(targetBar);
    expect(handleSelectDay).toHaveBeenCalledWith(3);
  });

  test('switches chart type when toggle is pressed', async () => {
    const { getByLabelText } = await render(
      <StepTimeDurationCard days={sampleDays} selectedIndex={0} onSelectDay={jest.fn()} />
    );

    const lineToggleBtn = getByLabelText('Show Line Chart view');
    fireEvent.press(lineToggleBtn);
    expect(getByLabelText('Day 19: 1h 8m')).toBeTruthy();
  });
});
