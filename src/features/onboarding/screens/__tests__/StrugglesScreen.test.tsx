import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StrugglesScreen, toggleStruggleSelection } from '../StrugglesScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

const press = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
};

describe('StrugglesScreen (S4)', () => {
  it('renders title, chips, counter, and ignores Continue when empty', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(<StrugglesScreen onContinue={onContinue} />);

    expect(getByText('What makes tracking hard for you?')).toBeTruthy();
    expect(getByText('0 of 3 picked')).toBeTruthy();
    [
      'home_cooked',
      'portions',
      'eating_out',
      'consistency',
      'protein',
      'late_snacking',
      'not_sure',
    ].forEach(id => expect(getByTestId(`struggle-chip-${id}`)).toBeTruthy());

    await press(getByTestId('struggles-continue-button'));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('shows the Ria reply and counter for a pick, then continues', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(<StrugglesScreen onContinue={onContinue} />);

    await press(getByTestId('struggle-chip-portions'));

    expect(getByTestId('struggles-ria-reply')).toBeTruthy();
    expect(
      getByText('No scales needed. A photo is enough for me to estimate portions.')
    ).toBeTruthy();
    expect(getByText('1 of 3 picked')).toBeTruthy();

    await press(getByTestId('struggles-continue-button'));
    expect(onContinue).toHaveBeenCalledWith(['portions']);
  });

  it('locks remaining chips at 3 picks and keeps pick order', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(<StrugglesScreen onContinue={onContinue} />);

    await press(getByTestId('struggle-chip-portions'));
    await press(getByTestId('struggle-chip-home_cooked'));
    await press(getByTestId('struggle-chip-late_snacking'));

    const protein = getByTestId('struggle-chip-protein');
    expect(protein.props.accessibilityState.disabled).toBe(true);
    await press(protein);
    expect(getByText('3 of 3 picked')).toBeTruthy();

    await press(getByTestId('struggles-continue-button'));
    expect(onContinue).toHaveBeenCalledWith(['portions', 'home_cooked', 'late_snacking']);
  });

  it('makes not_sure exclusive', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(<StrugglesScreen onContinue={onContinue} />);

    await press(getByTestId('struggle-chip-portions'));
    await press(getByTestId('struggle-chip-not_sure'));
    await press(getByTestId('struggles-continue-button'));
    expect(onContinue).toHaveBeenLastCalledWith(['not_sure']);

    await press(getByTestId('struggle-chip-protein'));
    await press(getByTestId('struggles-continue-button'));
    expect(onContinue).toHaveBeenLastCalledWith(['protein']);
  });
});

describe('toggleStruggleSelection', () => {
  it('adds to the end and removes when already selected', () => {
    expect(toggleStruggleSelection(['portions'], 'protein')).toEqual(['portions', 'protein']);
    expect(toggleStruggleSelection(['portions', 'protein'], 'portions')).toEqual(['protein']);
  });

  it('returns prev unchanged at the cap of 3', () => {
    const prev = ['portions', 'home_cooked', 'protein'] as const;
    expect(toggleStruggleSelection([...prev], 'eating_out')).toEqual([...prev]);
    const same = [...prev];
    expect(toggleStruggleSelection(same, 'eating_out')).toBe(same);
  });

  it('handles not_sure rules', () => {
    expect(toggleStruggleSelection(['portions', 'protein'], 'not_sure')).toEqual(['not_sure']);
    expect(toggleStruggleSelection(['not_sure'], 'protein')).toEqual(['protein']);
    expect(toggleStruggleSelection(['not_sure'], 'not_sure')).toEqual([]);
  });
});
