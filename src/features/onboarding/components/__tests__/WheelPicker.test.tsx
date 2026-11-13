import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { WheelPicker } from '../WheelPicker';

const setup = async (value: number, onChange = jest.fn()) => {
  const utils = await render(
    <WheelPicker
      min={10}
      max={13}
      value={value}
      onChange={onChange}
      unit="yrs"
      accessibilityLabel="Age"
      testID="w"
    />
  );
  return { ...utils, onChange };
};

const doAction = (utils: Awaited<ReturnType<typeof setup>>, actionName: string) =>
  act(async () => {
    fireEvent(utils.getByTestId('w-container'), 'accessibilityAction', {
      nativeEvent: { actionName },
    });
  });

describe('WheelPicker', () => {
  it('renders every value in range and the unit once', async () => {
    const { getByText, getAllByText } = await setup(11);
    [10, 11, 12, 13].forEach(n => expect(getByText(String(n))).toBeTruthy());
    expect(getAllByText('yrs')).toHaveLength(1);
  });

  it('increments and decrements by one', async () => {
    const a = await setup(11);
    await doAction(a, 'increment');
    expect(a.onChange).toHaveBeenCalledWith(12);
    await doAction(a, 'decrement');
    expect(a.onChange).toHaveBeenCalledWith(10);
  });

  it('clamps at min and max', async () => {
    const lo = await setup(10);
    await doAction(lo, 'decrement');
    expect(lo.onChange).not.toHaveBeenCalled();
    const hi = await setup(13);
    await doAction(hi, 'increment');
    expect(hi.onChange).not.toHaveBeenCalled();
  });
});
