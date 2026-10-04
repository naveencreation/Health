import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AgeSelectionScreen } from './AgeSelectionScreen';
import { GenderSelectionScreen } from './GenderSelectionScreen';
import { GoalSelectionScreen, FitnessGoal } from './GoalSelectionScreen';
import { HeightSelectionScreen } from './HeightSelectionScreen';
import { WeightSelectionScreen } from './WeightSelectionScreen';
import { PlanCalculationStep } from '../components/PlanCalculationStep';
import { PermissionPrimerStep } from '../components/PermissionPrimerStep';
import {
  calculateHealthPlan,
  CalculatedHealthPlan,
  GoalType,
  GenderType,
  UserBiometricsInput,
} from '../services/onboardingCalculator';
import { requestStepsPermission } from '@/features/health/healthPermissions';

export type OnboardingStep =
  'age' | 'weight' | 'height' | 'goal' | 'gender' | 'plan' | 'permissions';

export interface OnboardingCompleteData {
  biometrics: UserBiometricsInput & {
    weightUnit?: 'kg' | 'lbs';
    heightUnit?: 'cm' | 'ft';
  };
  plan: CalculatedHealthPlan;
}

export interface OnboardingWizardScreenProps {
  onComplete: (data: OnboardingCompleteData) => void | Promise<void>;
  onBackToWelcome?: () => void;
  onSignIn?: () => void;
  onSkip?: () => void;
  initialBiometrics?: Partial<UserBiometricsInput>;
}

export const OnboardingWizardScreen: React.FC<OnboardingWizardScreenProps> = ({
  onComplete,
  onBackToWelcome,
  onSignIn,
  onSkip,
  initialBiometrics,
}) => {
  const [stepHistory, setStepHistory] = useState<OnboardingStep[]>(['age']);

  const currentStep = stepHistory[stepHistory.length - 1];

  const [age, setAge] = useState<number>(initialBiometrics?.age ?? 25);
  const [weightKg, setWeightKg] = useState<number>(initialBiometrics?.weightKg ?? 70);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightCm, setHeightCm] = useState<number>(initialBiometrics?.heightCm ?? 175);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [goal, setGoal] = useState<GoalType>(initialBiometrics?.goal ?? 'maintain');
  const [gender, setGender] = useState<GenderType>(initialBiometrics?.gender ?? 'male');

  const pushStep = (next: OnboardingStep) => {
    setStepHistory(prev => [...prev, next]);
  };

  const popStep = () => {
    if (stepHistory.length > 1) {
      setStepHistory(prev => prev.slice(0, -1));
    } else if (onBackToWelcome) {
      onBackToWelcome();
    }
  };

  // Convert UI FitnessGoal ('lose' | 'maintain' | 'gain') to GoalType ('lose_weight' | 'maintain' | 'gain_muscle')
  const mapFitnessGoal = (g: FitnessGoal): GoalType => {
    if (g === 'lose') return 'lose_weight';
    if (g === 'gain') return 'gain_muscle';
    return 'maintain';
  };

  // Convert GoalType back to FitnessGoal for screen initial state
  const mapToFitnessGoal = (g: GoalType): FitnessGoal => {
    if (g === 'lose_weight') return 'lose';
    if (g === 'gain_muscle') return 'gain';
    return 'maintain';
  };

  const biometricsInput: UserBiometricsInput = useMemo(
    () => ({
      age,
      gender,
      heightCm,
      weightKg,
      goal,
    }),
    [age, gender, heightCm, weightKg, goal]
  );

  const calculatedPlan: CalculatedHealthPlan = useMemo(
    () => calculateHealthPlan(biometricsInput),
    [biometricsInput]
  );

  const handleFinish = async () => {
    await onComplete({
      biometrics: {
        ...biometricsInput,
        weightUnit,
        heightUnit,
      },
      plan: calculatedPlan,
    });
  };

  const handleEnablePermissions = async () => {
    try {
      // 1. Request camera permission for meal scanning
      await ImagePicker.requestCameraPermissionsAsync();
    } catch {
      // Gracefully continue even if user denies or platform issues
    }

    try {
      // 2. Request step permission if on Android with Health Connect
      if (Platform.OS === 'android') {
        await requestStepsPermission();
      }
    } catch {
      // Gracefully continue
    }

    await handleFinish();
  };

  // Render Step 1: Age
  if (currentStep === 'age') {
    return (
      <View style={styles.container}>
        <AgeSelectionScreen
          initialAge={age}
          onBack={popStep}
          onContinue={val => {
            setAge(val);
            pushStep('weight');
          }}
          onSkip={onSkip}
          onSignIn={onSignIn}
        />
      </View>
    );
  }

  // Render Step 2: Weight
  if (currentStep === 'weight') {
    return (
      <View style={styles.container}>
        <WeightSelectionScreen
          initialWeightKg={weightKg}
          onBack={popStep}
          onContinue={(val, unit) => {
            setWeightKg(val);
            if (unit) setWeightUnit(unit);
            pushStep('height');
          }}
          onSkip={onSkip}
          onSignIn={onSignIn}
        />
      </View>
    );
  }

  // Render Step 3: Height
  if (currentStep === 'height') {
    return (
      <View style={styles.container}>
        <HeightSelectionScreen
          initialHeightCm={heightCm}
          onBack={popStep}
          onContinue={(val, unit) => {
            setHeightCm(val);
            if (unit) setHeightUnit(unit);
            pushStep('goal');
          }}
          onSkip={onSkip}
          onSignIn={onSignIn}
        />
      </View>
    );
  }

  // Render Step 4: Goal
  if (currentStep === 'goal') {
    return (
      <View style={styles.container}>
        <GoalSelectionScreen
          initialGoal={mapToFitnessGoal(goal)}
          onBack={popStep}
          onContinue={selectedGoal => {
            setGoal(mapFitnessGoal(selectedGoal));
            pushStep('gender');
          }}
          onSkip={onSkip}
          onSignIn={onSignIn}
        />
      </View>
    );
  }

  // Render Step 5: Gender
  if (currentStep === 'gender') {
    return (
      <View style={styles.container}>
        <GenderSelectionScreen
          initialGender={gender}
          onBack={popStep}
          onContinue={val => {
            const mappedGender: GenderType =
              val === 'female' ? 'female' : val === 'male' ? 'male' : 'other';
            setGender(mappedGender);
            pushStep('plan');
          }}
          onSkip={onSkip}
          onSignIn={onSignIn}
        />
      </View>
    );
  }

  // Render Step 6: Plan Calculation Blueprint
  if (currentStep === 'plan') {
    return (
      <View style={styles.container}>
        <PlanCalculationStep
          plan={calculatedPlan}
          onBack={popStep}
          stepIndicator="Step 6 of 7"
          onConfirm={() => pushStep('permissions')}
        />
      </View>
    );
  }

  // Render Step 7: Permission Primer
  if (currentStep === 'permissions') {
    return (
      <View style={styles.container}>
        <PermissionPrimerStep onEnablePermissions={handleEnablePermissions} onSkip={handleFinish} />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
});

export default OnboardingWizardScreen;
