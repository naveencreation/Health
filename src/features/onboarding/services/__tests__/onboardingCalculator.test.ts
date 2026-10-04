import {
  calculateHealthPlan,
  UserBiometricsInput,
} from '../onboardingCalculator';

describe('onboardingCalculator (Mifflin-St Jeor formula)', () => {
  test('calculates correct plan for male weight loss goal', () => {
    const input: UserBiometricsInput = {
      age: 28,
      gender: 'male',
      heightCm: 180,
      weightKg: 85,
      targetWeightKg: 75,
      goal: 'lose_weight',
      activityLevel: 'moderately_active',
    };

    const plan = calculateHealthPlan(input);

    // BMR: 10*85 + 6.25*180 - 5*28 + 5 = 850 + 1125 - 140 + 5 = 1840
    expect(plan.bmr).toBe(1840);
    // TDEE: 1840 * 1.55 = 2852
    expect(plan.tdee).toBe(2852);
    // Deficit (20%): 2852 * 0.8 = 2282
    expect(plan.dailyCalorieBudget).toBe(2282);
    // Protein (1.8g/kg): 85 * 1.8 = 153g
    expect(plan.targetProteinG).toBe(153);
    // Water: 85 * 35 = 2975ml -> rounded to 3000ml
    expect(plan.targetWaterMl).toBe(3000);
    // Step goal: moderately active = 10000
    expect(plan.stepGoal).toBe(10000);
    // Estimated weeks to lose 10kg at 0.5kg/week = 20 weeks
    expect(plan.estimatedWeeksToGoal).toBe(20);
  });

  test('calculates correct plan for female muscle gain goal', () => {
    const input: UserBiometricsInput = {
      age: 24,
      gender: 'female',
      heightCm: 165,
      weightKg: 58,
      goal: 'gain_muscle',
      activityLevel: 'lightly_active',
    };

    const plan = calculateHealthPlan(input);

    // BMR: 10*58 + 6.25*165 - 5*24 - 161 = 580 + 1031.25 - 120 - 161 = 1330.25 -> 1330
    expect(plan.bmr).toBe(1330);
    // TDEE: 1330 * 1.375 = 1828.75 -> 1829
    expect(plan.tdee).toBe(1829);
    // Surplus (+300): 1829 + 300 = 2129
    expect(plan.dailyCalorieBudget).toBe(2129);
    // Protein (2.2g/kg for muscle gain): 58 * 2.2 = 127.6 -> 128g
    expect(plan.targetProteinG).toBe(128);
    // Step goal: lightly active = 8000
    expect(plan.stepGoal).toBe(8000);
  });

  test('enforces safe caloric floors on aggressive deficits', () => {
    const femaleInput: UserBiometricsInput = {
      age: 65,
      gender: 'female',
      heightCm: 145,
      weightKg: 42,
      goal: 'lose_weight',
      activityLevel: 'sedentary',
    };

    const plan = calculateHealthPlan(femaleInput);
    // Must never fall below 1200 kcal safe floor
    expect(plan.dailyCalorieBudget).toBeGreaterThanOrEqual(1200);
  });

  test('handles non-binary / other gender option smoothly', () => {
    const input: UserBiometricsInput = {
      age: 30,
      gender: 'other',
      heightCm: 172,
      weightKg: 70,
      goal: 'maintain',
    };

    const plan = calculateHealthPlan(input);
    expect(plan.bmr).toBeGreaterThan(1000);
    expect(plan.dailyCalorieBudget).toBe(plan.tdee);
  });
});
