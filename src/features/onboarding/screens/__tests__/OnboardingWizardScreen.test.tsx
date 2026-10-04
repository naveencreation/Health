import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { OnboardingWizardScreen } from '../OnboardingWizardScreen';
import * as ImagePicker from 'expo-image-picker';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

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

jest.mock('../NameInputScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    NameInputScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-name">
        <Pressable testID="btn-name-continue" onPress={() => onContinue('Dev')} />
        <Pressable testID="btn-name-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../GoalSelectionScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    GoalSelectionScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-goal">
        <Pressable
          testID="btn-goal-continue"
          onPress={() => onContinue('lose_weight', 'lose')}
        />
        <Pressable testID="btn-goal-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../StrugglesScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    StrugglesScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-struggles">
        <Pressable
          testID="btn-struggles-continue"
          onPress={() => onContinue(['portions'])}
        />
        <Pressable testID="btn-struggles-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../AboutYouScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    AboutYouScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-about_you">
        <Pressable
          testID="btn-about_you-continue"
          onPress={() => onContinue('female', 28)}
        />
        <Pressable testID="btn-about_you-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../HeightSelectionScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    HeightSelectionScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-height">
        <Pressable testID="btn-height-continue" onPress={() => onContinue(172, 'cm')} />
        <Pressable testID="btn-height-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../WeightSelectionScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    WeightSelectionScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-weight">
        <Pressable testID="btn-weight-continue" onPress={() => onContinue(68, 'kg')} />
        <Pressable testID="btn-weight-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../TargetWeightScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    TargetWeightScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-target_weight">
        <Pressable testID="btn-target_weight-continue" onPress={() => onContinue(62)} />
        <Pressable testID="btn-target_weight-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../ActivityLevelScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    ActivityLevelScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-activity">
        <Pressable testID="btn-activity-continue" onPress={() => onContinue('moderately_active')} />
        <Pressable testID="btn-activity-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../PaceSelectionScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    PaceSelectionScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-pace">
        <Pressable testID="btn-pace-continue" onPress={() => onContinue('steady')} />
        <Pressable testID="btn-pace-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../FoodStyleScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    FoodStyleScreen: ({ onContinue, onBack }: any) => (
      <View testID="step-food_style">
        <Pressable
          testID="btn-food_style-continue"
          onPress={() =>
            onContinue({
              foodStyle: 'vegetarian',
              mealTimes: { breakfast: '08:30', lunch: '13:00', dinner: '20:00' },
              skipsBreakfast: false,
              snacks: true,
            })
          }
        />
        <Pressable testID="btn-food_style-back" onPress={onBack} />
      </View>
    ),
  };
});

describe('OnboardingWizardScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await mockAsyncStorage.clear();
  });

  it('renders initial Name step and supports back to welcome', async () => {
    const onComplete = jest.fn();
    const onBackToWelcome = jest.fn();

    const { getByTestId, queryByTestId } = await render(
      <OnboardingWizardScreen
        onComplete={onComplete}
        onBackToWelcome={onBackToWelcome}
      />
    );

    expect(getByTestId('step-name')).toBeTruthy();

    // Advance to Goal
    fireEvent.press(getByTestId('btn-name-continue'));
    await waitFor(() => {
      expect(getByTestId('step-goal')).toBeTruthy();
      expect(queryByTestId('step-name')).toBeNull();
    });

    // Back to Name
    fireEvent.press(getByTestId('btn-goal-back'));
    await waitFor(() => {
      expect(getByTestId('step-name')).toBeTruthy();
    });

    // Back to Welcome
    fireEvent.press(getByTestId('btn-name-back'));
    expect(onBackToWelcome).toHaveBeenCalledTimes(1);
  });

  it('navigates through all S2-S10 steps, plan calculation, and completes onboarding', async () => {
    const onComplete = jest.fn();

    const { getByTestId, findByRole } = await render(
      <OnboardingWizardScreen onComplete={onComplete} />
    );

    // 1. Name -> Goal
    fireEvent.press(getByTestId('btn-name-continue'));
    await waitFor(() => expect(getByTestId('step-goal')).toBeTruthy());

    // 2. Goal -> Struggles
    fireEvent.press(getByTestId('btn-goal-continue'));
    await waitFor(() => expect(getByTestId('step-struggles')).toBeTruthy());

    // 3. Struggles -> About You
    fireEvent.press(getByTestId('btn-struggles-continue'));
    await waitFor(() => expect(getByTestId('step-about_you')).toBeTruthy());

    // 4. About You -> Height
    fireEvent.press(getByTestId('btn-about_you-continue'));
    await waitFor(() => expect(getByTestId('step-height')).toBeTruthy());

    // 5. Height -> Weight
    fireEvent.press(getByTestId('btn-height-continue'));
    await waitFor(() => expect(getByTestId('step-weight')).toBeTruthy());

    // 6. Weight -> Target Weight (since goal is lose_weight)
    fireEvent.press(getByTestId('btn-weight-continue'));
    await waitFor(() => expect(getByTestId('step-target_weight')).toBeTruthy());

    // 7. Target Weight -> Activity
    fireEvent.press(getByTestId('btn-target_weight-continue'));
    await waitFor(() => expect(getByTestId('step-activity')).toBeTruthy());

    // 8. Activity -> Pace
    fireEvent.press(getByTestId('btn-activity-continue'));
    await waitFor(() => expect(getByTestId('step-pace')).toBeTruthy());

    // 9. Pace -> Food Style
    fireEvent.press(getByTestId('btn-pace-continue'));
    await waitFor(() => expect(getByTestId('step-food_style')).toBeTruthy());

    // 10. Food Style -> Plan
    fireEvent.press(getByTestId('btn-food_style-continue'));

    // Plan calculation confirmation
    const planCta = await findByRole('button', { name: 'Start My Journey' });
    expect(planCta).toBeTruthy();
    fireEvent.press(planCta);

    // Permission Primer
    const enableBtn = await findByRole('button', { name: 'Enable Permissions and Continue' });
    expect(enableBtn).toBeTruthy();
    fireEvent.press(enableBtn);

    await waitFor(() => {
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledTimes(1);
      const callData = onComplete.mock.calls[0][0];
      expect(callData.biometrics.name).toBe('Dev');
      expect(callData.biometrics.goal).toBe('lose_weight');
      expect(callData.biometrics.struggles).toEqual(['portions']);
      expect(callData.biometrics.age).toBe(28);
      expect(callData.biometrics.sex).toBe('female');
      expect(callData.biometrics.heightCm).toBe(172);
      expect(callData.biometrics.weightKg).toBe(68);
      expect(callData.biometrics.targetWeightKg).toBe(62);
      expect(callData.biometrics.activityLevel).toBe('moderately_active');
      expect(callData.biometrics.pace).toBe('steady');
      expect(callData.biometrics.foodStyle).toBe('vegetarian');
      expect(callData.plan.dailyCalorieBudget).toBeGreaterThan(1200);
    });
  });
});
