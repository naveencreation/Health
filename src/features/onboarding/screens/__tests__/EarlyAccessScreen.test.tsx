import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EarlyAccessScreen } from '../EarlyAccessScreen';

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

let mockUser: { id: string; isGuest?: boolean } | null = { id: 'real_uid' };
jest.mock('@/context/HealthContext', () => ({
  useAuth: () => ({ currentUser: mockUser }),
}));

describe('EarlyAccessScreen', () => {
  const onContinue = jest.fn();
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'real_uid' };
  });

  it('shows the name in the title', async () => {
    const { getByText } = await render(
      <EarlyAccessScreen name="Priya" onContinue={onContinue} onBack={onBack} />
    );
    expect(getByText('It’s all free for now, Priya')).toBeTruthy();
    expect(getByText('EARLY ACCESS')).toBeTruthy();
  });

  it('drops the comma when there is no name', async () => {
    const { getByText } = await render(
      <EarlyAccessScreen onContinue={onContinue} onBack={onBack} />
    );
    expect(getByText('It’s all free for now')).toBeTruthy();
  });

  it('shows the backup row when signed in', async () => {
    const { getByText, queryByText } = await render(
      <EarlyAccessScreen name="Priya" onContinue={onContinue} onBack={onBack} />
    );
    expect(getByText('Backup with your account')).toBeTruthy();
    expect(queryByText('Your plan on this phone')).toBeNull();
  });

  it('shows the on-this-phone row for guests', async () => {
    mockUser = { id: 'guest_123', isGuest: true };
    const { getByText, queryByText } = await render(
      <EarlyAccessScreen name="Priya" onContinue={onContinue} onBack={onBack} />
    );
    expect(getByText('Your plan on this phone')).toBeTruthy();
    expect(queryByText('Backup with your account')).toBeNull();
  });

  it('Continue calls onContinue', async () => {
    const { getByTestId } = await render(
      <EarlyAccessScreen name="Priya" onContinue={onContinue} onBack={onBack} />
    );
    fireEvent.press(getByTestId('btn-early-access-continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
