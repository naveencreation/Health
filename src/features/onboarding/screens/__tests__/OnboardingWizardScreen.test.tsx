import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { OnboardingWizardScreen } from '../OnboardingWizardScreen';
import * as ImagePicker from 'expo-image-picker';
import { NotificationStorage } from '@/services/notifications';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withRepeat: (anim: any) => anim,
    withTiming: (value: number) => value,
    Easing: {
      linear: (val: number) => val,
    },
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

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

jest.mock('../BuildingPlanScreen', () => {
  const React = require('react');
  const { useEffect } = require('react');
  return {
    BuildingPlanScreen: ({ onComplete }: any) => {
      useEffect(() => {
        onComplete();
      }, [onComplete]);
      return null;
    },
  };
});

jest.mock('../PlanRevealScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    PlanRevealScreen: ({ onLogFirstMeal, onBack }: any) => (
      <View testID="step-plan">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start My Journey"
          testID="btn-log-first-meal"
          onPress={onLogFirstMeal}
        />
        <Pressable testID="btn-plan-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../FirstMealWinScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    FirstMealWinScreen: ({ onContinue, onSkip }: any) => (
      <View testID="step-first_meal">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save my plan & continue"
          testID="btn-first-meal-continue"
          onPress={() =>
            onContinue({
              foodName: '2 Rotis with Dal',
              calories: 340,
              proteinG: 13,
              carbsG: 52,
              fatG: 8,
              portionMultiplier: 1,
              mealSlot: 'lunch',
              loggedAt: Date.now(),
            })
          }
        />
        <Pressable testID="btn-first-meal-skip" onPress={onSkip} />
      </View>
    ),
  };
});

jest.mock('../SavePlanScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    SavePlanScreen: ({ onSuccess, onBack }: any) => (
      <View testID="step-save_plan">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save Plan Continue"
          testID="btn-save-plan-continue"
          onPress={onSuccess}
        />
        <Pressable testID="btn-save-plan-back" onPress={onBack} />
      </View>
    ),
  };
});

jest.mock('../SoftPaywallScreen', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    SoftPaywallScreen: ({ onContinue, onSkip, onBack }: any) => (
      <View testID="step-paywall">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start 7-Day Free Trial"
          testID="btn-paywall-continue"
          onPress={onContinue}
        />
        <Pressable testID="btn-paywall-skip" onPress={onSkip} />
        <Pressable testID="btn-paywall-back" onPress={onBack} />
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

    // First Meal Win
    const firstMealCta = await findByRole('button', { name: 'Save my plan & continue' });
    expect(firstMealCta).toBeTruthy();
    fireEvent.press(firstMealCta);

    // S14 Save Plan
    const savePlanCta = await findByRole('button', { name: 'Save Plan Continue' });
    expect(savePlanCta).toBeTruthy();
    fireEvent.press(savePlanCta);

    // S15 Soft Paywall
    const paywallCta = await findByRole('button', { name: 'Start 7-Day Free Trial' });
    expect(paywallCta).toBeTruthy();
    fireEvent.press(paywallCta);

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
      expect(callData.biometrics.firstMeal?.foodName).toBe('2 Rotis with Dal');
      expect(callData.plan.dailyCalorieBudget).toBeGreaterThan(1200);
    });

    const savedSettings = await NotificationStorage.loadSettings();
    expect(savedSettings.meals.breakfast).toBe('08:30');
    expect(savedSettings.meals.lunch).toBe('13:00');
    expect(savedSettings.meals.dinner).toBe('20:00');
    expect(savedSettings.meals.skipsBreakfast).toBe(false);
  });

  it('supports skipping paywall and back navigation between paywall and save_plan', async () => {
    const onComplete = jest.fn();
    const { getByTestId, findByRole } = await render(
      <OnboardingWizardScreen onComplete={onComplete} initialStep="save_plan" />
    );

    // Save Plan -> Paywall
    const savePlanCta = await findByRole('button', { name: 'Save Plan Continue' });
    fireEvent.press(savePlanCta);

    await waitFor(() => {
      expect(getByTestId('step-paywall')).toBeTruthy();
    });

    // Paywall back -> Save Plan
    fireEvent.press(getByTestId('btn-paywall-back'));
    await waitFor(() => {
      expect(getByTestId('step-save_plan')).toBeTruthy();
    });

    // Save Plan -> Paywall again
    fireEvent.press(getByTestId('btn-save-plan-continue'));
    await waitFor(() => {
      expect(getByTestId('step-paywall')).toBeTruthy();
    });

    // Skip paywall -> Permission Primer
    fireEvent.press(getByTestId('btn-paywall-skip'));
    const enableBtn = await findByRole('button', { name: 'Enable Permissions and Continue' });
    expect(enableBtn).toBeTruthy();
  });
});
