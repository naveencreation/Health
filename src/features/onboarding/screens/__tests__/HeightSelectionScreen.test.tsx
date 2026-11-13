import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { HeightSelectionScreen, cmToFtIn, ftInToCm } from '../HeightSelectionScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

const press = async (el: unknown) => {
  await act(async () => {
    fireEvent.press(el as never);
  });
};

describe('HeightSelectionScreen', () => {
  it('renders the cm wheel at 170 with the ft/in conversion', async () => {
    const { getByText, getByTestId, queryByTestId } = await render(<HeightSelectionScreen />);

    expect(getByText('How tall are you?')).toBeTruthy();
    expect(getByTestId('height-wheel-cm')).toBeTruthy();
    expect(queryByTestId('height-wheel-ft')).toBeNull();
    expect(getByText('That’s 5 ft 7 in')).toBeTruthy();
  });

  it('switches to ft/in wheels and shows cm', async () => {
    const { getByText, getByTestId, queryByTestId } = await render(<HeightSelectionScreen />);

    await press(getByTestId('height-unit-ft'));
    expect(getByTestId('height-wheel-ft')).toBeTruthy();
    expect(getByTestId('height-wheel-in')).toBeTruthy();
    expect(queryByTestId('height-wheel-cm')).toBeNull();
    expect(getByText('That’s 170 cm')).toBeTruthy();
  });

  it('opens in ft when initialUnit is ft', async () => {
    const { getByTestId } = await render(<HeightSelectionScreen initialUnit="ft" />);
    expect(getByTestId('height-wheel-ft')).toBeTruthy();
  });

  it('continues with the current value and unit', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(<HeightSelectionScreen onContinue={onContinue} />);

    await press(getByTestId('height-continue-button'));
    expect(onContinue).toHaveBeenCalledWith(170, 'cm');
  });

  it('converts and clamps with the pure helpers', () => {
    expect(ftInToCm(5, 7)).toBe(170);
    expect(cmToFtIn(170)).toEqual({ ft: 5, inch: 7 });
    expect(cmToFtIn(250)).toEqual({ ft: 8, inch: 2 });
    expect(ftInToCm(8, 11)).toBe(249);
    expect(ftInToCm(3, 0)).toBe(100);
  });
});
