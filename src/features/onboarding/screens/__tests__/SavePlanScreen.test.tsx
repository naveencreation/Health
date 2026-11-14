import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { SavePlanScreen } from '../SavePlanScreen';
import { CalculatedHealthPlan } from '../../services/onboardingCalculator';
import { OnboardingDraft } from '../../services/onboardingDraft';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock react-native Modal
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Modal = ({ visible, children }: any) => (visible ? children : null);
  return RN;
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
      Text: ReactNative.Text,
      createAnimatedComponent: (comp: any) => comp,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedProps: (factory: () => unknown) => factory(),
    withRepeat: (anim: any) => anim,
    withSequence: (...anims: any[]) => anims[0],
    withDelay: (d: number, anim: any) => anim,
    withTiming: (value: number) => value,
    Easing: {
      bezier: () => () => 0,
      linear: (val: number) => val,
      ease: () => 0,
    },
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    FadeInDown: { duration: () => ({ delay: () => ({}) }) },
    FadeOut: { duration: () => ({ delay: () => ({}) }) },
    useReducedMotion: () => false,
  };
});

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock onboardingMigration
const mockMigrateOnboardingData = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../services/onboardingMigration', () => ({
  migrateOnboardingData: (...args: any[]) => mockMigrateOnboardingData(...args),
}));

// Mock firebase auth
const mockAuth: { currentUser: { uid?: string; email: string } | null } = {
  currentUser: { uid: 'mock_uid_123', email: 'test@example.com' },
};
jest.mock('@/services/firebase', () => ({
  auth: {
    get currentUser() {
      return mockAuth.currentUser;
    },
  },
  db: {},
}));

// Mock useAuth
const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockLoginAnonymous = jest.fn();
let mockContextUser: { id: string } | null = { id: 'mock_uid_123' };

jest.mock('@/context/HealthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    login: mockLogin,
    loginAnonymous: mockLoginAnonymous,
    currentUser: mockContextUser,
  }),
}));

describe('SavePlanScreen (S14)', () => {
  const samplePlan: CalculatedHealthPlan = {
    dailyCalorieBudget: 1882,
    targetProteinG: 130,
    targetCarbsG: 240,
    targetFatG: 70,
    targetFiberG: 32,
    targetWaterMl: 3000,
    stepGoal: 10000,
    bmr: 1800,
    tdee: 2500,
    goalDate: '2026-11-20',
  };

  const sampleDraft: OnboardingDraft = {
    version: 1,
    step: 'save_plan',
    startedAt: Date.now(),
    name: 'Aarav',
    goal: 'lose_weight',
    targetWeightKg: 74,
  };

  const defaultProps = {
    name: 'Aarav',
    plan: samplePlan,
    draft: sampleDraft,
    targetWeightKg: 74,
    weightUnit: 'kg' as const,
    onBack: jest.fn(),
    onSuccess: jest.fn(),
  };

  const fillValidCredentials = async (
    getByTestId: (id: string) => any,
    email = 'aarav@example.com'
  ) => {
    await act(async () => {
      fireEvent.changeText(getByTestId('input-user-email'), email);
      fireEvent.changeText(getByTestId('input-user-password'), 'calorify2026');
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = { uid: 'mock_uid_123', email: 'test@example.com' };
    mockContextUser = { id: 'mock_uid_123' };
    mockRegister.mockResolvedValue({ success: true });
    mockLogin.mockResolvedValue({ success: true });
    mockLoginAnonymous.mockResolvedValue({ success: true });
  });

  it('renders title, subtitle, formatted summary, guest sub-line and no Google button', async () => {
    const { getByText, getByTestId, queryByTestId, queryByText } = await render(
      <SavePlanScreen {...defaultProps} />
    );

    expect(getByText('Save your plan, Aarav')).toBeTruthy();
    expect(
      getByText('An account backs up your plan and logs, and brings them to a new phone.')
    ).toBeTruthy();
    expect(getByTestId('plan-summary-card')).toBeTruthy();
    expect(getByText(/1,882/)).toBeTruthy();
    expect(queryByTestId('btn-continue-google')).toBeNull();
    expect(queryByText('Plan calibrated')).toBeNull();
    expect(getByText('Continue without an account')).toBeTruthy();
    expect(getByText('Your plan stays on this phone and isn’t backed up.')).toBeTruthy();
  });

  it('hides the Name field when the wizard has a name', async () => {
    const { queryByTestId } = await render(<SavePlanScreen {...defaultProps} />);
    expect(queryByTestId('input-user-name')).toBeNull();
  });

  it('shows the Name field when the wizard name is empty and registers with it', async () => {
    const { getByTestId, getByText } = await render(
      <SavePlanScreen {...defaultProps} name="" draft={{ ...sampleDraft, name: undefined }} />
    );
    expect(getByText('Save your plan')).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(getByTestId('input-user-name'), 'Meera');
    });
    await fillValidCredentials(getByTestId, 'meera@example.com');
    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-auth'));
    });
    expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ name: 'Meera' }));
  });

  it('shows the requirement chips and enables Create account only when valid', async () => {
    const { getByTestId, getByText } = await render(<SavePlanScreen {...defaultProps} />);

    expect(getByText('8+ characters')).toBeTruthy();
    expect(getByText('1 number')).toBeTruthy();
    expect(getByTestId('btn-submit-auth').props.accessibilityState.disabled).toBe(true);

    await fillValidCredentials(getByTestId);
    expect(getByTestId('btn-submit-auth').props.accessibilityState.disabled).toBe(false);
  });

  it('submits registration, migrates under the real uid, and shows the maker note', async () => {
    const { getByTestId, getByText } = await render(<SavePlanScreen {...defaultProps} />);

    await fillValidCredentials(getByTestId);
    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-auth'));
    });

    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Aarav',
        email: 'aarav@example.com',
        password: 'calorify2026',
      })
    );
    expect(mockMigrateOnboardingData).toHaveBeenCalledWith(
      'mock_uid_123',
      'aarav@example.com',
      expect.anything(),
      expect.anything(),
      false
    );
    expect(getByText('A QUICK NOTE FROM THE MAKER')).toBeTruthy();
    expect(getByText('Hi Aarav,')).toBeTruthy();
    expect(getByText(/— Naveen/)).toBeTruthy();
  });

  it('on email collision switches to sign-in mode, then signs in and migrates', async () => {
    mockRegister.mockResolvedValueOnce({
      success: false,
      error: 'This email is already registered. Please sign in.',
    });

    const { getByTestId, getByText, queryByText } = await render(
      <SavePlanScreen {...defaultProps} />
    );

    await fillValidCredentials(getByTestId, 'existing@example.com');
    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-auth'));
    });

    expect(
      getByText('There’s already an account with this email. Enter its password to sign in.')
    ).toBeTruthy();
    expect(getByText('Welcome back, Aarav')).toBeTruthy();
    expect(getByText('Sign in and we’ll save this plan to your account.')).toBeTruthy();
    expect(getByText(/New here\?/)).toBeTruthy();
    expect(queryByText('Continue without an account')).toBeNull();
    expect(queryByText('8+ characters')).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-auth'));
    });

    expect(mockLogin).toHaveBeenCalledWith('existing@example.com', 'calorify2026');
    expect(mockMigrateOnboardingData).toHaveBeenCalledTimes(1);
  });

  it('never invents an id: with no uid it shows an error and skips migration', async () => {
    mockAuth.currentUser = null;
    mockContextUser = null;

    const { getByTestId, getByText, queryByText } = await render(
      <SavePlanScreen {...defaultProps} />
    );

    await fillValidCredentials(getByTestId);
    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-auth'));
    });

    expect(getByText('Couldn’t finish signing in. Please try again.')).toBeTruthy();
    expect(mockMigrateOnboardingData).not.toHaveBeenCalled();
    expect(queryByText('A QUICK NOTE FROM THE MAKER')).toBeNull();
  });

  it('handles guest login cleanly when user taps "Continue without an account"', async () => {
    const { getByTestId, getByText } = await render(<SavePlanScreen {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('btn-continue-guest'));
    });

    expect(mockLoginAnonymous).toHaveBeenCalledWith('Aarav');
    expect(mockMigrateOnboardingData).toHaveBeenCalledWith(
      'mock_uid_123',
      '',
      expect.anything(),
      expect.anything(),
      true
    );
    expect(getByText('A QUICK NOTE FROM THE MAKER')).toBeTruthy();
  });

  it('proceeds to next step when tapping founder note backdrop', async () => {
    const onSuccessMock = jest.fn();
    const { getByTestId } = await render(
      <SavePlanScreen {...defaultProps} onSuccess={onSuccessMock} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('btn-continue-guest'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('founder-note-backdrop'));
    });

    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });
});
