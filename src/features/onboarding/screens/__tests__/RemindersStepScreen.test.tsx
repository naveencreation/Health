import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RemindersStepScreen } from '../RemindersStepScreen';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    Easing: { bezier: () => () => 0, linear: (v: number) => v, ease: () => 0 },
    useReducedMotion: () => false,
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/utils/haptics', () => ({
  haptics: { impactMedium: jest.fn().mockResolvedValue(undefined) },
}));

const mealTimes = { breakfast: '08:30', lunch: '13:00', dinner: '20:00' };

describe('RemindersStepScreen', () => {
  const onEnable = jest.fn();
  const onNotNow = jest.fn();
  const onBack = jest.fn();
  const originalOS = Platform.OS;

  const renderScreen = (props: Partial<React.ComponentProps<typeof RemindersStepScreen>> = {}) =>
    render(
      <RemindersStepScreen
        name="Priya"
        skipsBreakfast={false}
        mealTimes={mealTimes}
        stepGoal={6000}
        onEnable={onEnable}
        onNotNow={onNotNow}
        onBack={onBack}
        {...props}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  afterAll(() => {
    Platform.OS = originalOS;
  });

  it('shows the name in the title, or none', async () => {
    const { getByText, rerender } = await renderScreen();
    expect(getByText('Want a nudge at meal times, Priya?')).toBeTruthy();
    await rerender(
      <RemindersStepScreen
        skipsBreakfast={false}
        mealTimes={mealTimes}
        stepGoal={6000}
        onEnable={onEnable}
        onNotNow={onNotNow}
        onBack={onBack}
      />
    );
    expect(getByText('Want a nudge at meal times?')).toBeTruthy();
  });

  it('shows breakfast off for skippers', async () => {
    const { getByText, queryByText } = await renderScreen({ skipsBreakfast: true });
    expect(getByText('Off · you skip breakfast')).toBeTruthy();
    expect(queryByText('8:30 am')).toBeNull();
  });

  it('shows breakfast, lunch and dinner times in 12-hour format', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('8:30 am')).toBeTruthy();
    expect(getByText('1:00 pm')).toBeTruthy();
    expect(getByText('8:00 pm')).toBeTruthy();
    expect(getByText('5:30 pm')).toBeTruthy();
    expect(getByText('9:00 pm')).toBeTruthy();
  });

  it('shows the formatted step goal, water interval and quiet hours', async () => {
    const { getByText } = await renderScreen({ stepGoal: 10000 });
    expect(getByText('How far you are from 10,000')).toBeTruthy();
    expect(getByText('2 hours after your last glass')).toBeTruthy();
    expect(getByText(/Quiet from 10 pm to 7 am/)).toBeTruthy();
  });

  it('calls onEnable and onNotNow', async () => {
    const { getByTestId } = await renderScreen();
    fireEvent.press(getByTestId('btn-reminders-enable'));
    await waitFor(() => expect(onEnable).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('btn-reminders-not-now'));
    await waitFor(() => expect(onNotNow).toHaveBeenCalledTimes(1));
  });

  it('shows a single Continue on web wired to onEnable', async () => {
    Platform.OS = 'web';
    const { getByTestId, queryByTestId } = await renderScreen();
    expect(queryByTestId('btn-reminders-enable')).toBeNull();
    expect(queryByTestId('btn-reminders-not-now')).toBeNull();
    fireEvent.press(getByTestId('btn-reminders-continue'));
    await waitFor(() => expect(onEnable).toHaveBeenCalledTimes(1));
  });
});
