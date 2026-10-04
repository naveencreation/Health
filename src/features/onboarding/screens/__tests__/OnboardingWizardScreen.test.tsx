import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { OnboardingWizardScreen } from '../OnboardingWizardScreen';
import * as ImagePicker from 'expo-image-picker';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    impactMedium: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    selection: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

jest.mock('@/features/health/healthPermissions', () => ({
  requestStepsPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/screens/onboarding/AgeSelectionScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    AgeSelectionScreen: ({ onContinue, onBack, initialAge }: any) => (
      <View testID="step-age">
        <Text>Age: {initialAge}</Text>
        <Pressable testID="btn-age-continue" onPress={() => onContinue(28)} />
        <Pressable testID="btn-age-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('@/screens/onboarding/WeightSelectionScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    WeightSelectionScreen: ({ onContinue, onBack, initialWeightKg }: any) => (
      <View testID="step-weight">
        <Text>Weight: {initialWeightKg}</Text>
        <Pressable testID="btn-weight-continue" onPress={() => onContinue(75, 'kg')} />
        <Pressable testID="btn-weight-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('@/screens/onboarding/HeightSelectionScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    HeightSelectionScreen: ({ onContinue, onBack, initialHeightCm }: any) => (
      <View testID="step-height">
        <Text>Height: {initialHeightCm}</Text>
        <Pressable testID="btn-height-continue" onPress={() => onContinue(180, 'cm')} />
        <Pressable testID="btn-height-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('@/screens/onboarding/GoalSelectionScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    GoalSelectionScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-goal">
        <Pressable testID="btn-goal-continue" onPress={() => onContinue('lose')} />
        <Pressable testID="btn-goal-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('@/screens/onboarding/GenderSelectionScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    GenderSelectionScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-gender">
        <Pressable testID="btn-gender-continue" onPress={() => onContinue('male')} />
        <Pressable testID="btn-gender-back" onPress={onBack} />
      </View>
    ),
  };
});

describe('OnboardingWizardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial age step and handles forward and back navigation', async () => {
    const onComplete = jest.fn();
    const onBackToWelcome = jest.fn();

    const { getByTestId, queryByTestId } = await render(
      <OnboardingWizardScreen
        onComplete={onComplete}
        onBackToWelcome={onBackToWelcome}
        initialBiometrics={{ age: 24 }}
      />
    );

    // Initial step is Age
    expect(getByTestId('step-age')).toBeTruthy();

    // Advance to Weight
    fireEvent.press(getByTestId('btn-age-continue'));

    await waitFor(() => {
      expect(getByTestId('step-weight')).toBeTruthy();
      expect(queryByTestId('step-age')).toBeNull();
    });

    // Go back to Age
    fireEvent.press(getByTestId('btn-weight-back'));

    await waitFor(() => {
      expect(getByTestId('step-age')).toBeTruthy();
      expect(queryByTestId('step-weight')).toBeNull();
    });

    // Go back from Age calls onBackToWelcome
    fireEvent.press(getByTestId('btn-age-back'));
    expect(onBackToWelcome).toHaveBeenCalledTimes(1);
  });

  it('navigates through all steps to Plan and Permissions and calls onComplete', async () => {
    const onComplete = jest.fn();

    const { getByTestId, findByRole, getByRole } = await render(
      <OnboardingWizardScreen onComplete={onComplete} />
    );

    // 1. Age -> 2. Weight
    fireEvent.press(getByTestId('btn-age-continue'));
    await waitFor(() => expect(getByTestId('step-weight')).toBeTruthy());

    // 2. Weight -> 3. Height
    fireEvent.press(getByTestId('btn-weight-continue'));
    await waitFor(() => expect(getByTestId('step-height')).toBeTruthy());

    // 3. Height -> 4. Goal
    fireEvent.press(getByTestId('btn-height-continue'));
    await waitFor(() => expect(getByTestId('step-goal')).toBeTruthy());

    // 4. Goal -> 5. Gender
    fireEvent.press(getByTestId('btn-goal-continue'));
    await waitFor(() => expect(getByTestId('step-gender')).toBeTruthy());

    // 5. Gender -> 6. Plan Calculation
    fireEvent.press(getByTestId('btn-gender-continue'));

    // 6. Plan step is visible
    const planCta = await findByRole('button', { name: 'Start My Journey' });
    expect(planCta).toBeTruthy();

    // 6. Plan -> 7. Permission Primer
    fireEvent.press(planCta);

    // 7. Permission step is visible
    const enableBtn = await findByRole('button', { name: 'Enable Permissions and Continue' });
    expect(enableBtn).toBeTruthy();

    // Tap enable permissions
    fireEvent.press(enableBtn);

    await waitFor(() => {
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledTimes(1);
      const callArgs = onComplete.mock.calls[0][0];
      expect(callArgs.biometrics.age).toBe(28);
      expect(callArgs.biometrics.weightKg).toBe(75);
      expect(callArgs.biometrics.heightCm).toBe(180);
      expect(callArgs.biometrics.gender).toBe('male');
      expect(callArgs.biometrics.goal).toBe('lose_weight');
      expect(callArgs.plan.dailyCalorieBudget).toBeGreaterThan(1200);
      expect(callArgs.plan.bmr).toBeGreaterThan(0);
    });
  });
});
