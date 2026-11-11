import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RiaSuggestionCardView } from '../RiaSuggestionCardView';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const options = [
  { name: 'Greek yogurt', kcal: 120, protein: 12, carbs: 8, fat: 3 },
  { name: 'Roasted chana', kcal: 110, protein: 7, carbs: 15, fat: 2 },
];

describe('RiaSuggestionCardView', () => {
  it('logs an option when Log is pressed', async () => {
    const onLogOption = jest.fn();
    const { getByLabelText } = await render(
      <RiaSuggestionCardView data={{ options }} onLogOption={onLogOption} />
    );

    await fireEvent.press(getByLabelText('Log Greek yogurt'));

    expect(onLogOption).toHaveBeenCalledWith(options[0]);
  });

  it('shows Logged instead of Log for options already logged', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <RiaSuggestionCardView
        data={{ options, loggedOptions: ['Greek yogurt'] }}
        onLogOption={jest.fn()}
      />
    );

    expect(getByLabelText('Greek yogurt logged')).toBeTruthy();
    expect(queryByLabelText('Log Greek yogurt')).toBeNull();
    expect(getByLabelText('Log Roasted chana')).toBeTruthy();
  });
});
