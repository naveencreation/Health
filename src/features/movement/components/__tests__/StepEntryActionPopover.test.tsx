import React from 'react';
import { render } from '@testing-library/react-native';
import { StepEntryActionPopover } from '../StepEntryActionPopover';
import { StepLogEntry } from '@/types';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      createAnimatedComponent: (c: any) => c,
    },
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const makeEntry = (source: StepLogEntry['source']): StepLogEntry => ({
  id: 'step_1',
  steps: 500,
  durationMinutes: 5,
  caloriesBurned: 25,
  distanceKm: 0.4,
  loggedAt: '2026-10-02T10:00:00.000Z',
  source,
});

const renderPopover = (source: StepLogEntry['source']) =>
  render(
    <StepEntryActionPopover
      visible
      positionY={200}
      entry={makeEntry(source)}
      onDelete={jest.fn()}
      onClose={jest.fn()}
    />
  );

describe('StepEntryActionPopover', () => {
  test('shows Delete for a manual entry', async () => {
    const { getByText, queryByText } = await renderPopover('manual');
    expect(getByText('Delete')).toBeTruthy();
    expect(queryByText('Synced from Health Connect')).toBeNull();
  });

  test.each(['health_connect', 'synthetic'] as const)(
    'shows the synced note and no Delete for %s entries',
    async source => {
      const { getByText, queryByText } = await renderPopover(source);
      expect(getByText('Synced from Health Connect')).toBeTruthy();
      expect(queryByText('Delete')).toBeNull();
    }
  );
});
