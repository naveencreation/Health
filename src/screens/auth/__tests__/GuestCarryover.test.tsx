import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignInScreen } from '../SignInScreen';
import { SignUpScreen } from '../SignUpScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('@/components', () => ({
  BouncingDotsLoader: () => null,
  OnboardingHeader: () => null,
}));

const mockLogin = jest.fn().mockResolvedValue({ success: true });
let mockIsGuest = true;
let mockLogs: Record<string, any> = {};

jest.mock('@/context/HealthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginDemo: jest.fn(),
    register: jest.fn(),
    currentUser: { id: 'u', email: '', name: 'Friend', isGuest: mockIsGuest },
  }),
  useDailyLog: () => ({ dailyLogs: mockLogs }),
}));

const withLogs = (n: number) => {
  mockLogs = {};
  for (let i = 0; i < n; i++) {
    mockLogs[`2026-01-0${i + 1}`] = {
      date: 'x',
      meals: [],
      waterMl: 500,
      steps: 0,
      activities: [],
    };
  }
};

const fill = async (utils: Awaited<ReturnType<typeof render>>) => {
  await fireEvent.changeText(utils.getByTestId('input-signin-email'), ' a@b.com ');
  await fireEvent.changeText(utils.getByTestId('input-signin-password'), 'secret123');
};

describe('SignInScreen guest warning', () => {
  beforeEach(() => {
    mockLogin.mockClear();
    mockIsGuest = true;
    withLogs(2);
  });

  it('shows the sheet instead of logging in, then signs in anyway', async () => {
    const utils = await render(<SignInScreen onBack={jest.fn()} onSwitchToRegister={jest.fn()} />);
    await fill(utils);
    await fireEvent.press(utils.getByTestId('btn-signin-submit'));
    expect(utils.getByText(/You have 2 days logged as a guest/)).toBeTruthy();
    expect(utils.getByText(/a@b\.com’s data/)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
    await fireEvent.press(utils.getByTestId('btn-guest-signin-anyway'));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'secret123'));
  });

  it('switches to sign up from the sheet', async () => {
    const onSwitch = jest.fn();
    const utils = await render(<SignInScreen onBack={jest.fn()} onSwitchToRegister={onSwitch} />);
    await fill(utils);
    await fireEvent.press(utils.getByTestId('btn-signin-submit'));
    await fireEvent.press(utils.getByTestId('btn-guest-create-instead'));
    await waitFor(() => expect(onSwitch).toHaveBeenCalled());
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in directly for non-guests', async () => {
    mockIsGuest = false;
    const utils = await render(<SignInScreen onBack={jest.fn()} />);
    await fill(utils);
    await fireEvent.press(utils.getByTestId('btn-signin-submit'));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  });

  it('logs in directly for guests with no logs', async () => {
    withLogs(0);
    const utils = await render(<SignInScreen onBack={jest.fn()} />);
    await fill(utils);
    await fireEvent.press(utils.getByTestId('btn-signin-submit'));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  });
});

describe('SignUpScreen guest note', () => {
  beforeEach(() => {
    mockIsGuest = true;
    withLogs(1);
  });

  it('shows the carry-over note for a guest with logs', async () => {
    const { getByTestId, getByText } = await render(<SignUpScreen onBack={jest.fn()} />);
    expect(getByTestId('guest-carryover-note')).toBeTruthy();
    expect(getByText('Your 1 day of logs come with you')).toBeTruthy();
  });

  it('hides it for non-guests and empty guests', async () => {
    mockIsGuest = false;
    expect(
      (await render(<SignUpScreen onBack={jest.fn()} />)).queryByTestId('guest-carryover-note')
    ).toBeNull();
    mockIsGuest = true;
    withLogs(0);
    expect(
      (await render(<SignUpScreen onBack={jest.fn()} />)).queryByTestId('guest-carryover-note')
    ).toBeNull();
  });
});
