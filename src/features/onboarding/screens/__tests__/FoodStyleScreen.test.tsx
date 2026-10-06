import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { FoodStyleScreen } from '../FoodStyleScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

describe('FoodStyleScreen (S10)', () => {
  it('renders dietary chips and habit switches', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(
      <FoodStyleScreen onContinue={onContinue} />
    );

    expect(getByText('Food style & meal rhythm')).toBeTruthy();
    expect(getByTestId('diet-chip-vegetarian')).toBeTruthy();
    expect(getByTestId('diet-chip-eggetarian')).toBeTruthy();
    expect(getByTestId('diet-chip-non_veg')).toBeTruthy();
    expect(getByTestId('diet-chip-vegan')).toBeTruthy();
    expect(getByTestId('diet-chip-no_preference')).toBeTruthy();
    expect(getByTestId('skip-breakfast-switch')).toBeTruthy();
    expect(getByTestId('snacks-switch')).toBeTruthy();
  });

  it('selects vegetarian and toggles skip-breakfast, then calls onContinue', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <FoodStyleScreen onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('diet-chip-vegetarian'));
    });

    await act(async () => {
      fireEvent(getByTestId('skip-breakfast-switch'), 'valueChange', true);
    });

    await act(async () => {
      fireEvent.press(getByTestId('food-style-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith({
      foodStyle: 'vegetarian',
      mealTimes: { breakfast: '08:30', lunch: '13:00', dinner: '20:00' },
      skipsBreakfast: true,
      snacks: true,
    });
  });
});
