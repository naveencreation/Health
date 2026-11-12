import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import { ProfileScreen } from '../ProfileScreen';
import { AccountScreen, GoalsScreen } from '@/screens/profile';
import { useAuth, useGoals } from '@/context/HealthContext';
import { usePro } from '@/features/subscription';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  collection: jest.fn(() => ({})),
  getDocs: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn((...a: any[]) => a),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

jest.mock('@/services/ai/storage/SecureKeyStorage', () => ({
  SecureKeyStorage: {
    restoreFromFirestore: jest.fn(() => Promise.resolve(false)),
    invalidateCache: jest.fn(),
    getApiKey: jest.fn(),
    saveApiKey: jest.fn(),
    isKeyConfigured: jest.fn().mockResolvedValue(false),
    hasApiKey: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    impactHeavy: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    warning: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/context/HealthContext', () => ({
  useAuth: jest.fn(),
  useGoals: jest.fn(),
  useDailyLog: jest.fn(() => ({
    dailyLogs: {},
    currentLog: { meals: [], waterMl: 0, steps: 0 },
  })),
  useAnalytics: jest.fn(() => ({
    dailyLogs: {},
  })),
}));

jest.mock('@/features/subscription/hooks/usePro', () => ({
  usePro: jest.fn(),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
      createAnimatedComponent: (Comp: any) => Comp,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedScrollHandler: () => () => {},
    withTiming: (value: number) => value,
    interpolate: (_value: number, _input: number[], output: number[]) => output[1],
    Easing: {
      out: (f: any) => f,
      in: (f: any) => f,
      cubic: (t: any) => t,
    },
    runOnJS: (fn: any) => fn,
    createAnimatedComponent: (Comp: any) => Comp,
  };
});

describe('ProfileScreen Integration', () => {
  const mockUserGoals = {
    name: 'Naveen Kumar',
    currentWeightKg: 75,
    targetWeightKg: 70,
    startWeightKg: 80,
    heightCm: 178,
    dailyCalorieBudget: 2100,
    targetProtein: 140,
    targetCarbs: 220,
    targetFat: 60,
    stepGoal: 10000,
    waterGoalMl: 2500,
    streakDays: 14,
    riaTone: 'supportive',
  };

  const mockCurrentUser = {
    name: 'Naveen Kumar',
    email: 'naveen@calori.fit',
    isGuest: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useGoals as jest.Mock).mockReturnValue({
      userGoals: mockUserGoals,
      updateGoals: jest.fn(),
    });
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: mockCurrentUser,
      logout: jest.fn(),
      deleteAccount: jest.fn(),
    });
    (usePro as jest.Mock).mockReturnValue({
      isPro: false,
      activePlanId: undefined,
      purchasePlan: jest.fn().mockResolvedValue({ success: true }),
      restorePurchases: jest.fn().mockResolvedValue({ restored: false }),
    });
  });

  it('renders profile identity and Pro promo card for standard tier user', async () => {
    const { getByText, getAllByText } = await render(<ProfileScreen />);

    expect(getByText('Profile')).toBeTruthy();
    expect(getAllByText('Naveen Kumar').length).toBeGreaterThan(0);
    expect(getByText('Unlock Calorify Pro')).toBeTruthy();
    expect(getByText('7-DAY FREE TRIAL')).toBeTruthy();
  });

  it('renders active VIP membership when user is Pro subscriber', async () => {
    (usePro as jest.Mock).mockReturnValue({
      isPro: true,
      activePlanId: 'pro_annual',
      expiresAt: '2027-12-31T00:00:00.000Z',
    });

    const { getByText, getByRole } = await render(<ProfileScreen />);

    expect(getByText('Calorify Pro')).toBeTruthy();
    expect(getByText('ACTIVE')).toBeTruthy();
    expect(getByText('Annual VIP Membership')).toBeTruthy();
    expect(getByRole('button', { name: 'Manage Pro Subscription' })).toBeTruthy();
  });

  it('opens AchievementCenterScreen from the Achievements row', async () => {
    const { getByRole, findByText } = await render(<ProfileScreen />);

    const awardsBtn = getByRole('button', { name: /Achievements, 14 day streak/i });
    fireEvent.press(awardsBtn);

    const achievementsTitle = await findByText('Achievements');
    expect(achievementsTitle).toBeTruthy();
  });

  it('opens Pro paywall modal when tapping Upgrade to Pro button', async () => {
    const { getByRole, findByText } = await render(<ProfileScreen />);

    const upgradeBtn = getByRole('button', { name: 'Upgrade to Calorify Pro' });
    fireEvent.press(upgradeBtn);

    const paywallHeadline = await findByText(
      "You're on the free plan"
    );
    expect(paywallHeadline).toBeTruthy();
  });

  it('keeps the user signed in when edits have not synced, then signs out on confirm', async () => {
    const logout = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: mockCurrentUser,
      logout,
      deleteAccount: jest.fn(),
    });
    const { getByRole, findByRole } = await render(<AccountScreen onBack={jest.fn()} />);

    await fireEvent.press(getByRole('button', { name: 'Sign out of Calorify' }));
    await act(async () => {
      await fireEvent.press(await findByRole('button', { name: 'Sign out' }));
    });
    expect(logout).toHaveBeenLastCalledWith(false);

    await act(async () => {
      await fireEvent.press(await findByRole('button', { name: 'Sign out anyway' }));
    });
    expect(logout).toHaveBeenLastCalledWith(true);
  });

  it('blocks saving goals below the safe calorie floor', async () => {
    const updateGoals = jest.fn();
    (useGoals as jest.Mock).mockReturnValue({ userGoals: mockUserGoals, updateGoals });
    const { getByLabelText, getAllByRole, findByText } = await render(
      <GoalsScreen onBack={jest.fn()} />
    );

    await fireEvent.changeText(getByLabelText('Daily calorie budget in kilocalories'), '900');
    await fireEvent.press(getAllByRole('button', { name: 'Save nutrition and activity goals' })[0]);

    expect(updateGoals).not.toHaveBeenCalled();
    expect(await findByText('At least 1350 kcal for safety')).toBeTruthy();
  });

  it('requires the password before deleting an email account', async () => {
    const deleteAccount = jest.fn().mockResolvedValue({ success: true });
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: mockCurrentUser,
      logout: jest.fn(),
      deleteAccount,
    });
    const { getByRole, findByRole, getByLabelText, findByText } = await render(
      <AccountScreen onBack={jest.fn()} />
    );

    await fireEvent.press(await findByRole('button', { name: 'Delete Account Permanently' }));
    const confirm = (await findByRole('button', { name: 'Delete permanently' }));
    await act(async () => {
      await fireEvent.press(confirm);
    });
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(await findByText('Enter your password to confirm.')).toBeTruthy();

    await fireEvent.changeText(getByLabelText('Password, required to delete your account'), 'secret-pw');
    await act(async () => {
      await fireEvent.press(getByRole('button', { name: 'Delete permanently' }));
    });
    expect(deleteAccount).toHaveBeenCalledWith('secret-pw');
  });

  it('shows the plan summary and opens each settings sub-screen from its row', async () => {
    const screen = await render(<ProfileScreen />);

    expect(screen.getByText('2,100')).toBeTruthy();
    expect(screen.getByText('BMI 23.7 · Healthy weight')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /^Ria coach/ }));
    expect(await screen.findByText('Coaching style')).toBeTruthy();
  });

  it('offers sign-in instead of sign-out to a guest', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: { name: 'Guest', isGuest: true },
      logout: jest.fn(),
      deleteAccount: jest.fn(),
    });
    const onSignIn = jest.fn();
    const onBack = jest.fn();
    const screen = await render(<AccountScreen onBack={onBack} onSignIn={onSignIn} />);

    expect(screen.queryByRole('button', { name: 'Sign out of Calorify' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in or create account' }));
    expect(onBack).toHaveBeenCalled();
    expect(onSignIn).toHaveBeenCalled();
  });
});
