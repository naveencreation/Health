export type GenderType = 'male' | 'female' | 'other';
export type GoalType = 'lose_weight' | 'maintain' | 'gain_muscle';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

export interface UserBiometricsInput {
  age: number;
  gender: GenderType;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  goal: GoalType;
  activityLevel?: ActivityLevel;
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
}

/**
 * Calculates scientifically grounded BMR, TDEE, Calorie Budget, and Macronutrient targets
 * based on the validated Mifflin-St Jeor formula.
 */
export function calculateHealthPlan(input: UserBiometricsInput): CalculatedHealthPlan {
  const age = Math.max(12, Math.min(100, input.age || 25));
  const weight = Math.max(30, Math.min(300, input.weightKg || 70));
  const height = Math.max(100, Math.min(250, input.heightCm || 170));
  const gender = input.gender || 'male';
  const goal = input.goal || 'maintain';
  const activity = input.activityLevel || 'moderately_active';

  // 1. Mifflin-St Jeor BMR Formula
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender === 'female') {
    bmr -= 161;
  } else if (gender === 'male') {
    bmr += 5;
  } else {
    // Non-binary / other: balanced midpoint
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

  // 3. Goal Adjustment & Safe Caloric Floors
  let dailyCalorieBudget = tdee;
  if (goal === 'lose_weight') {
    dailyCalorieBudget = Math.round(tdee * 0.8); // 20% healthy deficit (~500 kcal)
  } else if (goal === 'gain_muscle') {
    dailyCalorieBudget = Math.round(tdee + 300); // Clean lean surplus
  }

  // Safety floor: 1200 kcal for females, 1500 kcal for males
  const safeFloor = gender === 'female' ? 1200 : 1500;
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

  // 7. Estimated Weeks to Goal (if target weight is provided)
  let estimatedWeeksToGoal: number | undefined;
  if (input.targetWeightKg && input.targetWeightKg !== weight) {
    const diffKg = Math.abs(weight - input.targetWeightKg);
    // Healthy sustainable loss: ~0.5kg/week; lean gain: ~0.25kg/week
    const ratePerWeek = goal === 'lose_weight' ? 0.5 : 0.25;
    estimatedWeeksToGoal = Math.max(1, Math.round(diffKg / ratePerWeek));
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
  };
}
