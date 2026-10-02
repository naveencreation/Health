import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StepHistoryCard } from '../StepHistoryCard';
import { StepLogEntry } from '@/types';

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

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/screens/main/StepReportScreen', () => ({
  StepReportScreen: () => null,
}));

describe('StepHistoryCard', () => {
  const mockEntries: StepLogEntry[] = [
    {
      id: 'step_1',
      steps: 850,
      durationMinutes: 8,
      caloriesBurned: 40,
      distanceKm: 0.7,
      loggedAt: '2026-10-02T08:30:00.000Z',
    },
    {
      id: 'step_2',
      steps: 950,
      durationMinutes: 9,
      caloriesBurned: 45,
      distanceKm: 0.8,
      loggedAt: '2026-10-02T12:30:00.000Z',
    },
    {
      id: 'step_3',
      steps: 1200,
      durationMinutes: 12,
      caloriesBurned: 60,
      distanceKm: 1.0,
      loggedAt: '2026-10-02T16:30:00.000Z',
    },
    {
      id: 'step_4',
      steps: 800,
      durationMinutes: 7,
      caloriesBurned: 38,
      distanceKm: 0.6,
      loggedAt: '2026-10-02T19:30:00.000Z',
    },
  ];

  test('renders header, date subtitle, and 4 session rows matching sample', async () => {
    const { getByText, getAllByRole } = await render(
      <StepHistoryCard
        dateStr="2026-10-02"
        totalSteps={3800}
        customEntries={mockEntries}
      />
    );

    // Header & Subtitle
    expect(getByText('History')).toBeTruthy();
    expect(getByText('View All')).toBeTruthy();
    expect(getByText(/2026/)).toBeTruthy();

    // 4 sample rows data
    expect(getByText('850')).toBeTruthy();
    expect(getByText('8m')).toBeTruthy();
    expect(getByText('40')).toBeTruthy();
    expect(getByText('0.7')).toBeTruthy();

    expect(getByText('950')).toBeTruthy();
    expect(getByText('9m')).toBeTruthy();
    expect(getByText('45')).toBeTruthy();
    expect(getByText('0.8')).toBeTruthy();

    expect(getByText('1,200')).toBeTruthy();
    expect(getByText('12m')).toBeTruthy();
    expect(getByText('60')).toBeTruthy();
    expect(getByText('1.0')).toBeTruthy();

    expect(getByText('800')).toBeTruthy();
    expect(getByText('7m')).toBeTruthy();
    expect(getByText('38')).toBeTruthy();
    expect(getByText('0.6')).toBeTruthy();

    // Action buttons (View All + 4 kebab buttons = 5 buttons)
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });

  test('synthesizes sessions cleanly when only totalSteps is provided', async () => {
    const { getByText } = await render(
      <StepHistoryCard
        dateStr="2026-10-02"
        totalSteps={1269}
      />
    );

    expect(getByText('History')).toBeTruthy();
    expect(getByText('View All')).toBeTruthy();
  });

  test('renders empty state when totalSteps is 0 and no entries', async () => {
    const { getByText } = await render(
      <StepHistoryCard
        dateStr="2026-10-02"
        totalSteps={0}
      />
    );

    expect(getByText('No step records yet')).toBeTruthy();
  });

  test('opens View All modal when View All button is pressed', async () => {
    const { getByText } = await render(
      <StepHistoryCard
        dateStr="2026-10-02"
        totalSteps={3800}
        customEntries={mockEntries}
      />
    );

    fireEvent.press(getByText('View All'));
    await waitFor(() => {
      expect(getByText('Step Counter History')).toBeTruthy();
    });
  });
});
