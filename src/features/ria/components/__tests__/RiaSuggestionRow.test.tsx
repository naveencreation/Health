/**
 * RiaSuggestionRow.test.tsx
 * 
 * Unit tests for RiaSuggestionRow:
 * - Time-of-day suggestions generator
 * - Suggestion chip press interaction
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

import { RiaSuggestionRow, getSuggestionsByTimeOfDay } from '../RiaSuggestionRow';
import { haptics } from '@/utils/haptics';

describe('RiaSuggestionRow', () => {
  describe('getSuggestionsByTimeOfDay', () => {
    it('returns morning suggestions between 5 AM and 11:59 AM', () => {
      const morning = getSuggestionsByTimeOfDay(8);
      expect(morning[0].label).toContain('breakfast');
    });

    it('returns lunch suggestions between 12 PM and 4:59 PM', () => {
      const lunch = getSuggestionsByTimeOfDay(13);
      expect(lunch[0].label).toContain('lunch');
    });

    it('returns evening snack suggestions between 5 PM and 8:59 PM', () => {
      const evening = getSuggestionsByTimeOfDay(18);
      expect(evening[0].label).toContain('Snack');
    });

    it('returns night suggestions after 9 PM', () => {
      const night = getSuggestionsByTimeOfDay(22);
      expect(night[0].label).toContain('day');
    });

    it('prioritizes craving chip if user struggles include cravings', () => {
      const nightWithCraving = getSuggestionsByTimeOfDay(23, ['cravings']);
      expect(nightWithCraving[0].label).toContain('craving');
    });
  });

  describe('Component rendering & press', () => {
    it('triggers onSelectSuggestion when a chip is pressed', async () => {
      const onSelectMock = jest.fn();
      const { getAllByTestId } = await render(
        <RiaSuggestionRow onSelectSuggestion={onSelectMock} />
      );

      // Suggestions render chips
      const chips = getAllByTestId(/suggestion-chip-/);
      fireEvent.press(chips[0]);

      expect(haptics.selection).toHaveBeenCalled();
      expect(onSelectMock).toHaveBeenCalled();
    });
  });
});
