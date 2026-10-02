import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StepHistoryModal } from '../StepHistoryModal';
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('StepHistoryModal', () => {
  const createMockEntries = (count: number): StepLogEntry[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `step_${i + 1}`,
      steps: 500 + i * 100,
      durationMinutes: 5 + i * 2,
      caloriesBurned: 25 + i * 5,
      distanceKm: Number((0.4 + i * 0.1).toFixed(1)),
      loggedAt: '2024-12-22T10:00:00.000Z',
    }));
  };

  test('renders top header with back button, center title and calendar button', async () => {
    const { getByText, getByLabelText } = await render(
      <StepHistoryModal
        visible={true}
        dateStr="2024-12-22"
        entries={createMockEntries(3)}
        totalSteps={1800}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Step Counter History')).toBeTruthy();
    expect(getByLabelText('Back')).toBeTruthy();
    expect(getByLabelText('Pick date')).toBeTruthy();
  });

  test('calls onClose when back button is pressed', async () => {
    const handleClose = jest.fn();
    const { getByLabelText } = await render(
      <StepHistoryModal
        visible={true}
        dateStr="2024-12-22"
        entries={createMockEntries(2)}
        totalSteps={1100}
        onClose={handleClose}
      />
    );

    fireEvent.press(getByLabelText('Back'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('renders all entries directly when count is <= 5', async () => {
    const entries = createMockEntries(4);
    const { getByText, queryByText } = await render(
      <StepHistoryModal
        visible={true}
        dateStr="2024-12-22"
        entries={entries}
        totalSteps={2600}
        onClose={jest.fn()}
      />
    );

    // All 4 step amounts visible
    expect(getByText('500')).toBeTruthy();
    expect(getByText('600')).toBeTruthy();
    expect(getByText('700')).toBeTruthy();
    expect(getByText('800')).toBeTruthy();

    // No expand button rendered
    expect(queryByText(/\+ Show .* more sessions/)).toBeNull();

    // Total label & total value visible
    expect(getByText('Total')).toBeTruthy();
  });

  test('collapses to 5 entries and expands when toggle is pressed when entries > 5', async () => {
    const entries = createMockEntries(8); // 8 items
    const { getByText, queryByText } = await render(
      <StepHistoryModal
        visible={true}
        dateStr="2024-12-22"
        entries={entries}
        totalSteps={6800}
        onClose={jest.fn()}
      />
    );

    // First 5 entries are visible
    expect(getByText('500')).toBeTruthy();
    expect(getByText('900')).toBeTruthy();

    // 6th entry (1,000 steps) should be hidden initially
    expect(queryByText('1,000')).toBeNull();

    // Toggle button should say "+ Show 3 more sessions"
    const toggleBtn = getByText('+ Show 3 more sessions');
    expect(toggleBtn).toBeTruthy();

    // Click expand
    fireEvent.press(toggleBtn);

    // Now all entries should be visible
    await waitFor(() => {
      expect(getByText('1,000')).toBeTruthy();
      expect(getByText('1,100')).toBeTruthy();
      expect(getByText('1,200')).toBeTruthy();
      expect(getByText('Show less')).toBeTruthy();
    });

    // Total section still visible
    expect(getByText('Total')).toBeTruthy();
  });

  test('tapping kebab menu opens Delete popover and deleting entry updates totals', async () => {
    const entries = createMockEntries(2);
    const handleDeleteEntry = jest.fn();

    const { getAllByLabelText, getByText, queryByText } = await render(
      <StepHistoryModal
        visible={true}
        dateStr="2024-12-22"
        entries={entries}
        totalSteps={1100}
        onClose={jest.fn()}
        onDeleteEntry={handleDeleteEntry}
      />
    );

    const kebabButtons = getAllByLabelText('More options');
    expect(kebabButtons.length).toBe(2);

    // Tap the first kebab button
    fireEvent.press(kebabButtons[0], {
      nativeEvent: { pageY: 250, pageX: 320 },
    });

    // Delete popover option should be visible
    await waitFor(() => {
      expect(getByText('Delete')).toBeTruthy();
    });

    // Tap Delete
    fireEvent.press(getByText('Delete'));

    // onDeleteEntry callback invoked
    expect(handleDeleteEntry).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'step_1' }),
      '2024-12-22'
    );

    // Entry 1 (500 steps) removed from view
    await waitFor(() => {
      expect(queryByText('500')).toBeNull();
    });
  });
});
