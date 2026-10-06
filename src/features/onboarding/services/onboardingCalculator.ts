export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type Sex = 'female' | 'male' | 'prefer_not_to_say';
export type GoalType = 'lose_weight' | 'maintain' | 'gain_muscle';
export type Pace = 'gentle' | 'steady' | 'faster';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

export interface UserBiometricsInput {
  age: number;
  gender: GenderType;
  sex?: Sex;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  goal: GoalType;
  activityLevel?: ActivityLevel;
  pace?: Pace;
}

export interface CalculatedHealthPlan {
  bmr: number;
  tdee: number;
  dailyCalorieBudget: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  targetFiberG: number;
  targetWaterMl: number;
  stepGoal: number;
  estimatedWeeksToGoal?: number;
  goalDate?: string;
  pace?: Pace;
  isAtSafeFloor?: boolean;
}

export interface AgePolicyResult {
  allowed: boolean;
  forceMaintain: boolean;
  message?: string;
}

/**
 * Calculates the minimum safe target weight (kg) at BMI 18.5 for a given height.
 */
export function minSafeTargetKg(heightCm: number): number {
  const heightM = Math.max(1, heightCm) / 100;
  const minKg = 18.5 * heightM * heightM;
  return Math.round(minKg * 10) / 10;
}

/**
 * Evaluates age policy:
 * - Under 13: block onboarding with a friendly message.
 * - 13 to 17: force goal to 'maintain' (skip weight-loss deficit).
 * - 18+: standard personalized calculations.
 */
export function evaluateAgePolicy(age: number): AgePolicyResult {
  if (age < 13) {
    return {
      allowed: false,
      forceMaintain: false,
      message: 'Calorify is designed for users aged 13 and older.',
    };
  }
  if (age >= 13 && age <= 17) {
    return {
      allowed: true,
      forceMaintain: true,
      message:
        "Because you're still growing, we'll set a healthy maintenance budget to support your energy and development.",
    };
  }
  return {
    allowed: true,
    forceMaintain: false,
  };
}

/**
 * Formats a target date from weeks into human-readable e.g. "14 Dec"
 */
export function calculateGoalDate(weeks: number, fromDate: Date = new Date()): string {
  const target = new Date(fromDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  const day = target.getDate();
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${day} ${monthNames[target.getMonth()]}`;
}

/**
 * Calculates scientifically grounded BMR, TDEE, Calorie Budget, and Macronutrient targets
 * based on the validated Mifflin-St Jeor formula and pace parameters.
 */
export function calculateHealthPlan(input: UserBiometricsInput): CalculatedHealthPlan {
  const agePolicy = evaluateAgePolicy(input.age || 25);
  const age = Math.max(13, Math.min(100, input.age || 25));
  const weight = Math.max(30, Math.min(300, input.weightKg || 70));
  const height = Math.max(100, Math.min(250, input.heightCm || 170));
  const gender = input.gender || 'male';
  let goal = input.goal || 'maintain';
  const pace = input.pace || 'steady';
  const activity = input.activityLevel || 'moderately_active';

  // Age 13-17 safety guardrail: force maintain goal
  if (agePolicy.forceMaintain && goal === 'lose_weight') {
    goal = 'maintain';
  }

  // 1. Mifflin-St Jeor BMR Formula
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender === 'female') {
    bmr -= 161;
  } else if (gender === 'male') {
    bmr += 5;
  } else {
    // 'prefer_not_to_say' / 'other': midpoint
    bmr -= 78;
  }
  bmr = Math.round(bmr);

  // 2. Activity Multiplier for TDEE (Total Daily Energy Expenditure)
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };
  const multiplier = activityMultipliers[activity] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  // 3. Goal & Pace Adjustment
  let dailyCalorieBudget = tdee;
  if (goal === 'lose_weight') {
    // Deficit of TDEE: gentle 10%, steady 20%, faster 25%
    const deficitRate = pace === 'gentle' ? 0.1 : pace === 'faster' ? 0.25 : 0.2;
    dailyCalorieBudget = Math.round(tdee * (1 - deficitRate));
  } else if (goal === 'gain_muscle') {
    // Lean surplus: gentle +150, steady +300, faster +450 kcal
    const surplusKcal = pace === 'gentle' ? 150 : pace === 'faster' ? 450 : 300;
    dailyCalorieBudget = Math.round(tdee + surplusKcal);
  }

  // Safety floor: 1200 kcal female, 1500 kcal male, 1350 kcal midpoint
  const safeFloor =
    gender === 'female' ? 1200 : gender === 'male' ? 1500 : 1350;
  const isAtSafeFloor = dailyCalorieBudget < safeFloor;
  dailyCalorieBudget = Math.max(safeFloor, dailyCalorieBudget);

  // 4. Macronutrient Gram Targets
  // Protein: 1.8g/kg for weight loss / maintenance, 2.2g/kg for muscle gain
  const proteinFactor = goal === 'gain_muscle' ? 2.2 : 1.8;
  const targetProteinG = Math.round(weight * proteinFactor);
  const proteinKcal = targetProteinG * 4;

  // Fat: 28% of total daily calories (9 kcal/g)
  const fatKcal = Math.round(dailyCalorieBudget * 0.28);
  const targetFatG = Math.round(fatKcal / 9);

  // Carbs: Remaining calories (4 kcal/g)
  const remainingKcal = Math.max(0, dailyCalorieBudget - proteinKcal - targetFatG * 9);
  const targetCarbsG = Math.round(remainingKcal / 4);

  // Fiber: 14g per 1000 kcal
  const targetFiberG = Math.round((dailyCalorieBudget / 1000) * 14);

  // 5. Daily Water Intake (35 mL per kg body weight, rounded to nearest 100 mL)
  const rawWaterMl = weight * 35;
  const targetWaterMl = Math.max(2000, Math.round(rawWaterMl / 100) * 100);

  // 6. Step Goal
  const stepGoals: Record<ActivityLevel, number> = {
    sedentary: 6000,
    lightly_active: 8000,
    moderately_active: 10000,
    very_active: 12000,
  };
  const stepGoal = stepGoals[activity] || 10000;

  // 7. Estimated Weeks to Goal & Goal Date
  let estimatedWeeksToGoal: number | undefined;
  let goalDate: string | undefined;

  if (input.targetWeightKg && input.targetWeightKg !== weight && goal !== 'maintain') {
    const diffKg = Math.abs(weight - input.targetWeightKg);

    if (goal === 'lose_weight') {
      // Lose: diffKg / (((tdee - budget) * 7) / 7700) using the budget after the floor
      const actualDeficit = tdee - dailyCalorieBudget;
      if (actualDeficit > 0) {
        const weeklyLossKg = (actualDeficit * 7) / 7700;
        estimatedWeeksToGoal = Math.max(1, Math.round(diffKg / weeklyLossKg));
        goalDate = calculateGoalDate(estimatedWeeksToGoal);
      }
    } else if (goal === 'gain_muscle') {
      // Gain: fixed rates 0.15 / 0.25 / 0.35 kg per week
      const ratePerWeek = pace === 'gentle' ? 0.15 : pace === 'faster' ? 0.35 : 0.25;
      estimatedWeeksToGoal = Math.max(1, Math.round(diffKg / ratePerWeek));
      goalDate = calculateGoalDate(estimatedWeeksToGoal);
    }
  }

  return {
    bmr,
    tdee,
    dailyCalorieBudget,
    targetProteinG,
    targetCarbsG,
    targetFatG,
    targetFiberG,
    targetWaterMl,
    stepGoal,
    estimatedWeeksToGoal,
    goalDate,
    pace,
    isAtSafeFloor,
  };
}

/**
 * Returns preview plans for all three paces ('gentle', 'steady', 'faster') in one call.
 * Used for Screen 9 (Pace selection).
 */
export function previewPlans(
  input: UserBiometricsInput
): Record<Pace, CalculatedHealthPlan> {
  return {
    gentle: calculateHealthPlan({ ...input, pace: 'gentle' }),
    steady: calculateHealthPlan({ ...input, pace: 'steady' }),
    faster: calculateHealthPlan({ ...input, pace: 'faster' }),
  };
}
