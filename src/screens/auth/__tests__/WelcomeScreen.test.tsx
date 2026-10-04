import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WelcomeScreen } from '../WelcomeScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@/context/HealthContext', () => ({
  useAuth: () => ({
    loginDemo: jest.fn(),
  }),
}));

jest.mock('@/components/common/ScreenTransitionContainer', () => ({
  ScreenTransitionContainer: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/common/BouncingDotsLoader', () => ({
  BouncingDotsLoader: () => null,
}));

jest.mock('../SignInScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    SignInScreen: ({ onBack, onSwitchToRegister }: any) => (
      <View testID="signin-screen">
        <Pressable testID="btn-signin-back" onPress={onBack} />
        <Pressable testID="btn-switch-register" onPress={onSwitchToRegister} />
      </View>
    ),
  };
});

jest.mock('../SignUpScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    SignUpScreen: ({ onBack, initialData }: any) => (
      <View testID="signup-screen">
        <Text testID="signup-data">{JSON.stringify(initialData)}</Text>
        <Pressable testID="btn-signup-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../ForgotPasswordScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    ForgotPasswordScreen: ({ onBack }: any) => (
      <View testID="forgot-password-screen">
        <Pressable testID="btn-fp-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('@/features/onboarding', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    OnboardingWizardScreen: ({ onComplete, onBackToWelcome, onSignIn }: any) => (
      <View testID="onboarding-wizard">
        <Pressable
          testID="btn-wizard-complete"
          onPress={() =>
            onComplete({
              biometrics: {
                age: 26,
                weightKg: 72,
                weightUnit: 'kg',
                heightCm: 178,
                heightUnit: 'cm',
                goal: 'gain_muscle',
                gender: 'male',
              },
              plan: { dailyCalorieBudget: 2400 },
            })
          }
        />
        <Pressable testID="btn-wizard-back" onPress={onBackToWelcome} />
        <Pressable testID="btn-wizard-signin" onPress={onSignIn} />
      </View>
    ),
  };
});

describe('WelcomeScreen (Consolidated Phase 0)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Calorify wordmark and Get Started with Calorify CTA', async () => {
    const { getByText, getByTestId } = await render(<WelcomeScreen />);

    expect(getByText('Calorify')).toBeTruthy();
    const getStartedBtn = getByTestId('btn-welcome-get-started');
    expect(getStartedBtn.props.accessibilityLabel).toBe('Get Started with Calorify');
  });

  it('delegates onboarding flow directly to OnboardingWizardScreen single orchestrator', async () => {
    const { getByTestId, queryByTestId } = await render(<WelcomeScreen />);

    // Press Get Started
    fireEvent.press(getByTestId('btn-welcome-get-started'));

    await waitFor(() => {
      expect(getByTestId('onboarding-wizard')).toBeTruthy();
      expect(queryByTestId('btn-welcome-get-started')).toBeNull();
    });

    // Press Back in OnboardingWizardScreen -> returns to Welcome
    fireEvent.press(getByTestId('btn-wizard-back'));

    await waitFor(() => {
      expect(queryByTestId('onboarding-wizard')).toBeNull();
      expect(getByTestId('btn-welcome-get-started')).toBeTruthy();
    });
  });

  it('navigates to SignUpScreen with biometrics upon wizard completion', async () => {
    const { getByTestId, queryByTestId } = await render(<WelcomeScreen />);

    fireEvent.press(getByTestId('btn-welcome-get-started'));

    await waitFor(() => {
      expect(getByTestId('onboarding-wizard')).toBeTruthy();
    });

    // Complete wizard
    fireEvent.press(getByTestId('btn-wizard-complete'));

    await waitFor(() => {
      expect(getByTestId('signup-screen')).toBeTruthy();
      expect(queryByTestId('onboarding-wizard')).toBeNull();
    });

    const dataText = getByTestId('signup-data').props.children;
    const parsedData = JSON.parse(dataText);
    expect(parsedData.age).toBe(26);
    expect(parsedData.weight).toBe(72);
    expect(parsedData.goal).toBe('gain');
  });

  it('opens SignInScreen when tapping Sign In', async () => {
    const { getByTestId } = await render(<WelcomeScreen />);

    fireEvent.press(getByTestId('btn-welcome-signin'));

    await waitFor(() => {
      expect(getByTestId('signin-screen')).toBeTruthy();
    });
  });
});
