import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CalorieCompletionCard, DayCalorieIntakeData } from '../CalorieCompletionCard';

describe('CalorieCompletionCard', () => {
  const sampleDays: DayCalorieIntakeData[] = [
    { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', calories: 2350, goalCalories: 2500 },
    { dateStr: '2026-09-17', dayNum: 17, dayName: 'T', calories: 2100, goalCalories: 2500 },
    { dateStr: '2026-09-18', dayNum: 18, dayName: 'W', calories: 2550, goalCalories: 2500 },
    { dateStr: '2026-09-19', dayNum: 19, dayName: 'T', calories: 2350, goalCalories: 2500 },
    { dateStr: '2026-09-20', dayNum: 20, dayName: 'F', calories: 2650, goalCalories: 2500 },
    { dateStr: '2026-09-21', dayNum: 21, dayName: 'S', calories: 2450, goalCalories: 2500 },
    { dateStr: '2026-09-22', dayNum: 22, dayName: 'S', calories: 2200, goalCalories: 2500 },
  ];

  test('renders title, legend items, and day numbers 16-22', async () => {
    const handleSelectDay = jest.fn();
    const { getByText } = await render(
      <CalorieCompletionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
        calorieGoal={2500}
      />
    );

    // Title
    expect(getByText('Calorie (kcal)')).toBeTruthy();

    // Legends
    expect(getByText('Selected')).toBeTruthy();
    expect(getByText('Calorie Intake Goal')).toBeTruthy();

    // Day numbers
    expect(getByText('16')).toBeTruthy();
    expect(getByText('17')).toBeTruthy();
    expect(getByText('18')).toBeTruthy();
    expect(getByText('19')).toBeTruthy();
    expect(getByText('20')).toBeTruthy();
    expect(getByText('21')).toBeTruthy();
    expect(getByText('22')).toBeTruthy();
  });

  test('renders Y-axis labels 500 up to 3000', async () => {
    const { getByText } = await render(
      <CalorieCompletionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={jest.fn()}
        calorieGoal={2500}
      />
    );

    expect(getByText('500')).toBeTruthy();
    expect(getByText('1000')).toBeTruthy();
    expect(getByText('1500')).toBeTruthy();
    expect(getByText('2000')).toBeTruthy();
    expect(getByText('2500')).toBeTruthy();
    expect(getByText('3000')).toBeTruthy();
  });

  test('calls onSelectDay when pressing an X-axis day button', async () => {
    const handleSelectDay = jest.fn();
    const { getByText } = await render(
      <CalorieCompletionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
        calorieGoal={2500}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('19'));
    });
    expect(handleSelectDay).toHaveBeenCalledWith(3);
  });

  test('switches between bar and line chart modes using toggle button', async () => {
    const { getByLabelText } = await render(
      <CalorieCompletionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={jest.fn()}
        calorieGoal={2500}
      />
    );

    const lineBtn = getByLabelText('Show Line Chart view');
    expect(lineBtn).toBeTruthy();
    await act(async () => {
      fireEvent.press(lineBtn);
    });

    const barBtn = getByLabelText('Show Bar Chart view');
    expect(barBtn).toBeTruthy();
    await act(async () => {
      fireEvent.press(barBtn);
    });
  });

  test('displays 0 in tooltip and empty banner when all days have 0 calories', async () => {
    const emptyDays: DayCalorieIntakeData[] = [
      { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', calories: 0, goalCalories: 2500 },
      { dateStr: '2026-09-17', dayNum: 17, dayName: 'T', calories: 0, goalCalories: 2500 },
    ];

    const { getByText } = await render(
      <CalorieCompletionCard
        days={emptyDays}
        selectedIndex={0}
        onSelectDay={jest.fn()}
        calorieGoal={2500}
      />
    );

    expect(getByText(/No meals logged/)).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });
});
