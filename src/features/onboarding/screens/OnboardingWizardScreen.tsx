import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, BackHandler } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NameInputScreen } from './NameInputScreen';
import { GoalSelectionScreen } from './GoalSelectionScreen';
import { StrugglesScreen } from './StrugglesScreen';
import { AboutYouScreen } from './AboutYouScreen';
import { HeightSelectionScreen, HeightUnit } from './HeightSelectionScreen';
import { WeightSelectionScreen } from './WeightSelectionScreen';
import { TargetWeightScreen } from './TargetWeightScreen';
import { ActivityLevelScreen } from './ActivityLevelScreen';
import { PaceSelectionScreen } from './PaceSelectionScreen';
import { FoodStyleScreen, FoodStyleData } from './FoodStyleScreen';
import { BuildingPlanScreen } from './BuildingPlanScreen';
import { PlanRevealScreen } from './PlanRevealScreen';
import { FirstMealWinScreen } from './FirstMealWinScreen';
import { SavePlanScreen } from './SavePlanScreen';
import { SoftPaywallScreen } from './SoftPaywallScreen';
import { PlanCalculationStep } from '../components/PlanCalculationStep';
import { PermissionPrimerStep } from '../components/PermissionPrimerStep';
import {
  calculateHealthPlan,
  CalculatedHealthPlan,
  GoalType,
  Sex,
  Pace,
  ActivityLevel,
  UserBiometricsInput,
} from '../services/onboardingCalculator';
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  GoalIntent,
  Struggle,
  FoodStyle,
  PendingMeal,
} from '../services/onboardingDraft';
import { requestStepsPermission } from '@/features/health/healthPermissions';
import { NotificationService } from '@/services/notifications';

export type OnboardingStep =
  | 'name'
  | 'goal'
  | 'struggles'
  | 'about_you'
  | 'height'
  | 'weight'
  | 'target_weight'
  | 'activity'
  | 'pace'
  | 'food_style'
  | 'building_plan'
  | 'plan'
  | 'first_meal'
  | 'save_plan'
  | 'paywall'
  | 'permissions';

export interface OnboardingCompleteData {
  biometrics: UserBiometricsInput & {
    weightUnit?: 'kg' | 'lbs';
    heightUnit?: 'cm' | 'ft';
    name?: string;
    goalIntent?: GoalIntent;
    struggles?: Struggle[];
    foodStyle?: FoodStyle;
    mealTimes?: { breakfast: string; lunch: string; dinner: string };
    skipsBreakfast?: boolean;
    snacks?: boolean;
    firstMeal?: PendingMeal;
  };
  plan: CalculatedHealthPlan;
}

export interface OnboardingWizardScreenProps {
  onComplete: (data: OnboardingCompleteData) => void | Promise<void>;
  onBackToWelcome?: () => void;
  onSignIn?: () => void;
  onSkip?: () => void;
  initialBiometrics?: Partial<
    UserBiometricsInput & {
      weightUnit?: 'kg' | 'lbs';
      heightUnit?: 'cm' | 'ft';
      name?: string;
      sex?: Sex;
    }
  >;
  initialStep?: OnboardingStep;
}

export const buildReconstructedHistory = (
  targetStep: OnboardingStep,
  goal?: GoalType,
  age?: number
): OnboardingStep[] => {
  const isMaintain = goal === 'maintain';
  const isTeen = typeof age === 'number' && age >= 13 && age <= 17;
  const skipWeightAndPace = isMaintain || isTeen;

  const sequence: OnboardingStep[] = [
    'name',
    'goal',
    'struggles',
    'about_you',
    'height',
    'weight',
    ...(skipWeightAndPace ? [] : (['target_weight'] as OnboardingStep[])),
    'activity',
    ...(skipWeightAndPace ? [] : (['pace'] as OnboardingStep[])),
    'food_style',
    'plan',
    'first_meal',
    'save_plan',
    'paywall',
    'permissions',
  ];

  const targetIndex = sequence.indexOf(targetStep);
  if (targetIndex <= 0) return ['name'];
  return sequence.slice(0, targetIndex + 1);
};

export const OnboardingWizardScreen: React.FC<OnboardingWizardScreenProps> = ({
  onComplete,
  onBackToWelcome,
  onSignIn,
  onSkip,
  initialBiometrics,
  initialStep = 'name',
}) => {
  const [stepHistory, setStepHistory] = useState<OnboardingStep[]>([initialStep]);
  const currentStep = stepHistory[stepHistory.length - 1];

  // User responses
  const [name, setName] = useState<string>(initialBiometrics?.name ?? '');
  const [goal, setGoal] = useState<GoalType>(initialBiometrics?.goal ?? 'lose_weight');
  const [goalIntent, setGoalIntent] = useState<GoalIntent>('lose');
  const [struggles, setStruggles] = useState<Struggle[]>([]);
  const [sex, setSex] = useState<Sex>(initialBiometrics?.sex ?? 'female');
  const [age, setAge] = useState<number>(initialBiometrics?.age ?? 25);
  const [heightCm, setHeightCm] = useState<number>(initialBiometrics?.heightCm ?? 170);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(
    (initialBiometrics?.heightUnit as HeightUnit) ?? 'cm'
  );
  const [weightKg, setWeightKg] = useState<number>(initialBiometrics?.weightKg ?? 70);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(initialBiometrics?.weightUnit ?? 'kg');
  const [targetWeightKg, setTargetWeightKg] = useState<number | undefined>(
    initialBiometrics?.targetWeightKg
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialBiometrics?.activityLevel ?? 'moderately_active'
  );
  const [pace, setPace] = useState<Pace>(initialBiometrics?.pace ?? 'steady');
  const [foodStyle, setFoodStyle] = useState<FoodStyle>('no_preference');
  const [mealTimes, setMealTimes] = useState<{ breakfast: string; lunch: string; dinner: string }>({
    breakfast: '08:30',
    lunch: '13:00',
    dinner: '20:00',
  });
  const [skipsBreakfast, setSkipsBreakfast] = useState<boolean>(false);
  const [snacks, setSnacks] = useState<boolean>(true);
  const [firstMeal, setFirstMeal] = useState<PendingMeal | undefined>(undefined);

  // Resume draft from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    loadOnboardingDraft().then(draft => {
      if (!isMounted || !draft) return;
      if (draft.name) setName(draft.name);
      if (draft.goal) setGoal(draft.goal);
      if (draft.goalIntent) setGoalIntent(draft.goalIntent);
      if (draft.struggles) setStruggles(draft.struggles);
      if (draft.sex) setSex(draft.sex);
      if (draft.age) setAge(draft.age);
      if (draft.heightCm) setHeightCm(draft.heightCm);
      if (draft.units?.height) setHeightUnit(draft.units.height);
      if (draft.weightKg) setWeightKg(draft.weightKg);
      if (draft.units?.weight) setWeightUnit(draft.units.weight);
      if (draft.targetWeightKg) setTargetWeightKg(draft.targetWeightKg);
      if (draft.activityLevel) setActivityLevel(draft.activityLevel);
      if (draft.pace) setPace(draft.pace);
      if (draft.foodStyle) setFoodStyle(draft.foodStyle);
      if (draft.mealTimes) setMealTimes(draft.mealTimes);
      if (typeof draft.skipsBreakfast === 'boolean') setSkipsBreakfast(draft.skipsBreakfast);
      if (typeof draft.snacks === 'boolean') setSnacks(draft.snacks);
      if (draft.firstMeal) setFirstMeal(draft.firstMeal);

      if (draft.step && draft.step !== 'name' && isMounted) {
        const reconstructed = buildReconstructedHistory(
          draft.step as OnboardingStep,
          draft.goal,
          draft.age
        );
        setStepHistory(reconstructed);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const pushStep = useCallback(
    (next: OnboardingStep) => {
      setStepHistory(prev => [...prev, next]);
      saveOnboardingDraft({
        step: next,
        name,
        goal,
        goalIntent,
        struggles,
        sex,
        age,
        heightCm,
        weightKg,
        units: { height: heightUnit, weight: weightUnit },
        targetWeightKg,
        activityLevel,
        pace,
        foodStyle,
        mealTimes,
        skipsBreakfast,
        snacks,
        firstMeal,
      });
    },
    [
      name,
      goal,
      goalIntent,
      struggles,
      sex,
      age,
      heightCm,
      weightKg,
      heightUnit,
      weightUnit,
      targetWeightKg,
      activityLevel,
      pace,
      foodStyle,
      mealTimes,
      skipsBreakfast,
      snacks,
      firstMeal,
    ]
  );

  const popStep = useCallback(() => {
    if (stepHistory.length > 1) {
      setStepHistory(prev => prev.slice(0, -1));
    } else if (onBackToWelcome) {
      onBackToWelcome();
    }
  }, [stepHistory.length, onBackToWelcome]);

  useEffect(() => {
    const onHardwareBack = () => {
      popStep();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [popStep]);

  const biometricsInput: UserBiometricsInput = useMemo(
    () => ({
      age,
      sex,
      gender: sex === 'female' ? 'female' : sex === 'male' ? 'male' : 'other',
      heightCm,
      weightKg,
      targetWeightKg,
      goal,
      activityLevel,
      pace,
    }),
    [age, sex, heightCm, weightKg, targetWeightKg, goal, activityLevel, pace]
  );

  const calculatedPlan: CalculatedHealthPlan = useMemo(
    () => calculateHealthPlan(biometricsInput),
    [biometricsInput]
  );

  const handleFinish = async () => {
    await clearOnboardingDraft();
    await onComplete({
      biometrics: {
        ...biometricsInput,
        weightUnit,
        heightUnit,
        name,
        goalIntent,
        struggles,
        foodStyle,
        mealTimes,
        skipsBreakfast,
        snacks,
        firstMeal,
      },
      plan: calculatedPlan,
    });
  };

  const handleEnablePermissions = async () => {
    try {
      await ImagePicker.requestCameraPermissionsAsync();
    } catch {
      // Gracefully continue
    }

    try {
      if (Platform.OS === 'android') {
        await requestStepsPermission();
      }
    } catch {
      // Gracefully continue
    }

    try {
      await NotificationService.requestPermission();
    } catch {
      // Gracefully continue
    }

    await handleFinish();
  };

  // Branching helper: determines if target weight & pace should be asked
  const shouldAskTargetAndPace =
    (goal === 'lose_weight' || goal === 'gain_muscle') &&
    goalIntent !== 'maintain' &&
    goalIntent !== 'understand' &&
    age >= 18;

  // S2: Name
  if (currentStep === 'name') {
    return (
      <View style={styles.container}>
        <NameInputScreen
          initialName={name}
          onBack={popStep}
          onContinue={val => {
            setName(val);
            pushStep('goal');
          }}
          onSkip={onSkip}
          sectionIndex={0}
          totalSections={4}
          sectionProgress={0.2}
        />
      </View>
    );
  }

  // S3: Goal
  if (currentStep === 'goal') {
    return (
      <View style={styles.container}>
        <GoalSelectionScreen
          name={name}
          initialGoal={goal}
          initialIntent={goalIntent}
          onBack={popStep}
          onContinue={(chosenGoal, chosenIntent) => {
            setGoal(chosenGoal);
            setGoalIntent(chosenIntent);
            pushStep('struggles');
          }}
          onSkip={onSkip}
          sectionIndex={0}
          totalSections={4}
          sectionProgress={0.4}
        />
      </View>
    );
  }

  // S4: Struggles
  if (currentStep === 'struggles') {
    return (
      <View style={styles.container}>
        <StrugglesScreen
          initialStruggles={struggles}
          onBack={popStep}
          onContinue={chosenStruggles => {
            setStruggles(chosenStruggles);
            pushStep('about_you');
          }}
          onSkip={onSkip}
          sectionIndex={0}
          totalSections={4}
          sectionProgress={0.6}
        />
      </View>
    );
  }

  // S5: About You (Sex + Age)
  if (currentStep === 'about_you') {
    return (
      <View style={styles.container}>
        <AboutYouScreen
          initialSex={sex}
          initialAge={age}
          onBack={popStep}
          onContinue={(chosenSex, chosenAge) => {
            setSex(chosenSex);
            setAge(chosenAge);
            pushStep('height');
          }}
          onSkip={onSkip}
          sectionIndex={0}
          totalSections={4}
          sectionProgress={0.8}
        />
      </View>
    );
  }

  // S6 Part 1: Height
  if (currentStep === 'height') {
    return (
      <View style={styles.container}>
        <HeightSelectionScreen
          initialHeightCm={heightCm}
          onBack={popStep}
          onContinue={(val, unit) => {
            setHeightCm(val);
            if (unit) setHeightUnit(unit);
            pushStep('weight');
          }}
          onSkip={onSkip}
          sectionIndex={1}
          totalSections={4}
          sectionProgress={0.25}
        />
      </View>
    );
  }

  // S6 Part 2: Weight
  if (currentStep === 'weight') {
    return (
      <View style={styles.container}>
        <WeightSelectionScreen
          initialWeightKg={weightKg}
          onBack={popStep}
          onContinue={(val, unit) => {
            setWeightKg(val);
            if (unit) setWeightUnit(unit);
            if (shouldAskTargetAndPace) {
              pushStep('target_weight');
            } else {
              pushStep('activity');
            }
          }}
          onSkip={onSkip}
          sectionIndex={1}
          totalSections={4}
          sectionProgress={0.5}
        />
      </View>
    );
  }

  // S7: Target Weight (Lose / Build only)
  if (currentStep === 'target_weight') {
    return (
      <View style={styles.container}>
        <TargetWeightScreen
          currentWeightKg={weightKg}
          heightCm={heightCm}
          goal={goal}
          initialTargetWeightKg={targetWeightKg}
          weightUnit={weightUnit}
          onBack={popStep}
          onContinue={val => {
            setTargetWeightKg(val);
            pushStep('activity');
          }}
          onSkip={onSkip}
          sectionIndex={1}
          totalSections={4}
          sectionProgress={0.75}
        />
      </View>
    );
  }

  // S8: Activity Level
  if (currentStep === 'activity') {
    return (
      <View style={styles.container}>
        <ActivityLevelScreen
          initialActivityLevel={activityLevel}
          onBack={popStep}
          onContinue={val => {
            setActivityLevel(val);
            if (shouldAskTargetAndPace) {
              pushStep('pace');
            } else {
              pushStep('food_style');
            }
          }}
          onSkip={onSkip}
          sectionIndex={1}
          totalSections={4}
          sectionProgress={1.0}
        />
      </View>
    );
  }

  // S9: Pace (Lose / Build only)
  if (currentStep === 'pace') {
    return (
      <View style={styles.container}>
        <PaceSelectionScreen
          biometrics={biometricsInput}
          initialPace={pace}
          onBack={popStep}
          onContinue={val => {
            setPace(val);
            pushStep('food_style');
          }}
          onSkip={onSkip}
          sectionIndex={2}
          totalSections={4}
          sectionProgress={0.5}
        />
      </View>
    );
  }

  // S10: Food Style & Meal Rhythm
  if (currentStep === 'food_style') {
    return (
      <View style={styles.container}>
        <FoodStyleScreen
          initialFoodStyle={foodStyle}
          initialMealTimes={mealTimes}
          initialSkipsBreakfast={skipsBreakfast}
          initialSnacks={snacks}
          onBack={popStep}
          onContinue={(data: FoodStyleData) => {
            setFoodStyle(data.foodStyle);
            setMealTimes(data.mealTimes);
            setSkipsBreakfast(data.skipsBreakfast);
            setSnacks(data.snacks);
            pushStep('building_plan');
          }}
          onSkip={onSkip}
          sectionIndex={2}
          totalSections={4}
          sectionProgress={1.0}
        />
      </View>
    );
  }

  // S11: Building Your Plan (Cinematic animated transition)
  if (currentStep === 'building_plan') {
    return (
      <View style={styles.container}>
        <BuildingPlanScreen
          name={name}
          onComplete={() => {
            setStepHistory(prev => [...prev.filter(s => s !== 'building_plan'), 'plan']);
            saveOnboardingDraft({
              step: 'plan',
              name,
              goal,
              goalIntent,
              struggles,
              sex,
              age,
              heightCm,
              weightKg,
              units: { height: heightUnit, weight: weightUnit },
              targetWeightKg,
              activityLevel,
              pace,
              foodStyle,
              mealTimes,
              skipsBreakfast,
              snacks,
              firstMeal,
            });
          }}
        />
      </View>
    );
  }

  // S12: Plan Reveal (Segmented ring, insight card, calculation breakdown)
  if (currentStep === 'plan') {
    return (
      <View style={styles.container}>
        <PlanRevealScreen
          plan={calculatedPlan}
          name={name}
          firstStruggle={struggles[0]}
          targetWeightKg={targetWeightKg}
          weightUnit={weightUnit}
          onBack={popStep}
          onLogFirstMeal={() => pushStep('first_meal')}
        />
      </View>
    );
  }

  // S13: First Meal Win (The Aha Moment)
  if (currentStep === 'first_meal') {
    return (
      <View style={styles.container}>
        <FirstMealWinScreen
          name={name}
          foodStyle={foodStyle}
          struggles={struggles}
          dailyCalorieBudget={calculatedPlan.dailyCalorieBudget}
          onBack={popStep}
          onContinue={meal => {
            setFirstMeal(meal);
            saveOnboardingDraft({
              step: 'first_meal',
              name,
              goal,
              goalIntent,
              struggles,
              sex,
              age,
              heightCm,
              weightKg,
              units: { height: heightUnit, weight: weightUnit },
              targetWeightKg,
              activityLevel,
              pace,
              foodStyle,
              mealTimes,
              skipsBreakfast,
              snacks,
              firstMeal: meal,
            });
            pushStep('save_plan');
          }}
          onSkip={() => pushStep('save_plan')}
          sectionIndex={3}
          totalSections={4}
          sectionProgress={0.66}
        />
      </View>
    );
  }

  // S14: Save Your Plan (Account & Auth)
  if (currentStep === 'save_plan') {
    return (
      <View style={styles.container}>
        <SavePlanScreen
          name={name}
          plan={calculatedPlan}
          draft={{
            version: 1,
            step: 'save_plan',
            startedAt: Date.now(),
            name,
            goal,
            goalIntent,
            struggles,
            sex,
            age,
            heightCm,
            weightKg,
            units: { height: heightUnit, weight: weightUnit },
            targetWeightKg,
            activityLevel,
            pace,
            foodStyle,
            mealTimes,
            skipsBreakfast,
            snacks,
            firstMeal,
          }}
          firstMeal={firstMeal}
          targetWeightKg={targetWeightKg}
          weightUnit={weightUnit}
          onBack={popStep}
          onSuccess={() => pushStep('paywall')}
          sectionIndex={3}
          totalSections={4}
          sectionProgress={1.0}
        />
      </View>
    );
  }

  // S15: Soft Paywall (Zero-Pressure Pro Offer & Free Trial)
  if (currentStep === 'paywall') {
    return (
      <View style={styles.container}>
        <SoftPaywallScreen
          name={name}
          plan={calculatedPlan}
          onContinue={() => pushStep('permissions')}
          onSkip={() => pushStep('permissions')}
          onBack={popStep}
          sectionIndex={3}
          totalSections={4}
          sectionProgress={1.0}
        />
      </View>
    );
  }

  // Step 16: Permission Primer
  if (currentStep === 'permissions') {
    return (
      <View style={styles.container}>
        <PermissionPrimerStep
          onEnablePermissions={handleEnablePermissions}
          onSkip={handleFinish}
          onBack={popStep}
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FAF9F6',
  },
});

export default OnboardingWizardScreen;
