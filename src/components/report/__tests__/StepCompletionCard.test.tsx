import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StepCompletionCard, DayStepData } from '../StepCompletionCard';

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

describe('StepCompletionCard', () => {
  const sampleDays: DayStepData[] = [
    { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', steps: 5200, goalSteps: 6000, completionPct: 87 },
    { dateStr: '2026-09-17', dayNum: 17, dayName: 'T', steps: 5024, goalSteps: 6000, completionPct: 84 },
    { dateStr: '2026-09-18', dayNum: 18, dayName: 'W', steps: 5600, goalSteps: 6000, completionPct: 93 },
    { dateStr: '2026-09-19', dayNum: 19, dayName: 'T', steps: 6800, goalSteps: 6000, completionPct: 113 },
    { dateStr: '2026-09-20', dayNum: 20, dayName: 'F', steps: 5400, goalSteps: 6000, completionPct: 90 },
    { dateStr: '2026-09-21', dayNum: 21, dayName: 'S', steps: 5800, goalSteps: 6000, completionPct: 97 },
    { dateStr: '2026-09-22', dayNum: 22, dayName: 'S', steps: 4600, goalSteps: 6000, completionPct: 77 },
  ];

  test('renders title, legend items, and day numbers 16-22', async () => {
    const handleSelectDay = jest.fn();
    const { getByText } = await render(
      <StepCompletionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
        stepGoal={6000}
      />
    );

    // Title
    expect(getByText('Step')).toBeTruthy();

    // Legends
    expect(getByText('Selected')).toBeTruthy();
    expect(getByText('Step Goal')).toBeTruthy();

    // Day numbers
    expect(getByText('16')).toBeTruthy();
    expect(getByText('17')).toBeTruthy();
    expect(getByText('18')).toBeTruthy();
    expect(getByText('19')).toBeTruthy();
    expect(getByText('20')).toBeTruthy();
    expect(getByText('21')).toBeTruthy();
    expect(getByText('22')).toBeTruthy();
  });

  test('displays tooltip pin with selected step count and steps unit', async () => {
    const { getByText } = await render(
      <StepCompletionCard
        days={sampleDays}
        selectedIndex={1} // Day 17: 5024 steps
        onSelectDay={jest.fn()}
        stepGoal={6000}
      />
    );

    expect(getByText('5,024')).toBeTruthy();
    expect(getByText('steps')).toBeTruthy();
  });

  test('invokes onSelectDay when a day column is pressed', async () => {
    const handleSelectDay = jest.fn();
    const { getByLabelText } = await render(
      <StepCompletionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
        stepGoal={6000}
      />
    );

    fireEvent.press(getByLabelText('Day 19: 6,800 steps'));
    expect(handleSelectDay).toHaveBeenCalledWith(3);
  });

  test('toggles to line chart view when line icon is pressed', async () => {
    const { getByLabelText } = await render(
      <StepCompletionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={jest.fn()}
        stepGoal={6000}
      />
    );

    const lineToggleBtn = getByLabelText('Show Line Chart view');
    expect(lineToggleBtn).toBeTruthy();
    fireEvent.press(lineToggleBtn);
  });
});
