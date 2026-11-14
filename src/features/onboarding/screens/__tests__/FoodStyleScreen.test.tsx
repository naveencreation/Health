import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { FoodStyleScreen, foodStyleReply } from '../FoodStyleScreen';
import { FoodStyle } from '../../services/onboardingDraft';

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
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts with nothing selected and Continue disabled', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <FoodStyleScreen onContinue={jest.fn()} />
    );

    expect(getByText('What’s on your plate?')).toBeTruthy();
    expect(queryByTestId('food-style-ria-reply')).toBeNull();
    expect(queryByTestId('snacks-switch')).toBeNull();
    expect(getByTestId('diet-tile-vegan').props.accessibilityState.checked).toBe(false);
    expect(getByTestId('breakfast-option-yes').props.accessibilityState.checked).toBe(false);
    expect(getByTestId('food-style-continue-button').props.accessibilityState.disabled).toBe(true);
  });

  it('picking only a diet keeps Continue disabled and shows the reply', async () => {
    const { getByTestId, getByText } = await render(<FoodStyleScreen onContinue={jest.fn()} />);

    await act(async () => {
      fireEvent.press(getByTestId('diet-tile-vegan'));
    });

    expect(getByTestId('diet-tile-vegan').props.accessibilityState.checked).toBe(true);
    expect(getByText(foodStyleReply('vegan', null))).toBeTruthy();
    expect(getByTestId('food-style-continue-button').props.accessibilityState.disabled).toBe(true);
  });

  it('diet + skip enables Continue and passes the data through', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(<FoodStyleScreen onContinue={onContinue} />);

    await act(async () => {
      fireEvent.press(getByTestId('diet-tile-non_veg'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('breakfast-option-skip'));
    });

    expect(getByTestId('food-style-continue-button').props.accessibilityState.disabled).toBe(false);
    expect(getByText(/No breakfast reminder, then\.$/)).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('food-style-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith({
      foodStyle: 'non_veg',
      skipsBreakfast: true,
      snacks: true,
      mealTimes: { breakfast: '08:30', lunch: '13:00', dinner: '20:00' },
    });
  });

  it('restores initial selections and enables Continue', async () => {
    const { getByTestId } = await render(
      <FoodStyleScreen
        onContinue={jest.fn()}
        initialFoodStyle="eggetarian"
        initialSkipsBreakfast={false}
      />
    );

    expect(getByTestId('diet-tile-eggetarian').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('breakfast-option-yes').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('food-style-continue-button').props.accessibilityState.disabled).toBe(false);
  });

  describe('foodStyleReply', () => {
    const cases: [FoodStyle, string][] = [
      ['vegetarian', 'Dal, paneer, curd and chana will carry most of your protein.'],
      ['eggetarian', 'Eggs make protein easy: two give you about 12\u00A0g.'],
      ['non_veg', 'Chicken, fish and eggs give you plenty of easy protein.'],
      ['vegan', 'Dal, tofu, soy and peanuts will carry your protein.'],
      ['no_preference', 'Got it, you’ll see a mix of everything.'],
    ];

    it.each(cases)('%s', (style, text) => {
      expect(foodStyleReply(style, null)).toBe(text);
      expect(foodStyleReply(style, false)).toBe(text);
      expect(foodStyleReply(style, true)).toBe(`${text} No breakfast reminder, then.`);
    });
  });
});
