import React from 'react';
import { render } from '@testing-library/react-native';
import { StepTotalSummaryCard } from '../StepTotalSummaryCard';

describe('StepTotalSummaryCard', () => {
  test('renders step count, subtitle, and calculated metrics when only totalSteps is provided', async () => {
    const { getByText } = await render(
      <StepTotalSummaryCard totalSteps={256480} />
    );

    // Step count formatted with comma
    expect(getByText('256,480')).toBeTruthy();
    // Default subtitle
    expect(getByText('Total steps all the time')).toBeTruthy();

    // Derived metric units and values
    // duration = 256480 / 100 = 2565 mins -> 42h 45m
    expect(getByText('time')).toBeTruthy();
    expect(getByText('kcal')).toBeTruthy();
    expect(getByText('km')).toBeTruthy();
  });

  test('renders explicit custom duration, calories, distance, and subtitle', async () => {
    const { getByText } = await render(
      <StepTotalSummaryCard
        totalSteps={256480}
        totalDurationMinutes={5124} // 85h 24m
        totalCalories={20492}
        totalDistanceKm={294.35}
        subtitle="Total steps all the time"
      />
    );

    // Verify values matching reference screenshot
    expect(getByText('256,480')).toBeTruthy();
    expect(getByText('Total steps all the time')).toBeTruthy();
    expect(getByText('85h 24m')).toBeTruthy();
    expect(getByText('20,492')).toBeTruthy();
    expect(getByText('294.35')).toBeTruthy();

    // Labels
    expect(getByText('time')).toBeTruthy();
    expect(getByText('kcal')).toBeTruthy();
    expect(getByText('km')).toBeTruthy();
  });

  test('formats minutes under 1 hour cleanly (e.g. 45m)', async () => {
    const { getByText } = await render(
      <StepTotalSummaryCard
        totalSteps={4500}
        totalDurationMinutes={45}
        totalCalories={180}
        totalDistanceKm={3.42}
      />
    );

    expect(getByText('4,500')).toBeTruthy();
    expect(getByText('45m')).toBeTruthy();
    expect(getByText('180')).toBeTruthy();
    expect(getByText('3.42')).toBeTruthy();
  });
});
