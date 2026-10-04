import {
  calculateHealthPlan,
  previewPlans,
  minSafeTargetKg,
  evaluateAgePolicy,
  calculateGoalDate,
  UserBiometricsInput,
} from '../onboardingCalculator';

describe('onboardingCalculator (Mifflin-St Jeor & Pace Engine)', () => {
  describe('Pace and Deficit calculations for Weight Loss', () => {
    const baseMaleLoss: UserBiometricsInput = {
      age: 28,
      gender: 'male',
      heightCm: 180,
      weightKg: 85,
      targetWeightKg: 75,
      goal: 'lose_weight',
      activityLevel: 'moderately_active',
    };

    it('calculates steady pace (20% deficit) by default', () => {
      const plan = calculateHealthPlan(baseMaleLoss);
      // BMR: 10*85 + 6.25*180 - 5*28 + 5 = 1840
      expect(plan.bmr).toBe(1840);
      // TDEE: 1840 * 1.55 = 2852
      expect(plan.tdee).toBe(2852);
      // Deficit: 2852 * (1 - 0.20) = 2282
      expect(plan.dailyCalorieBudget).toBe(2282);
      expect(plan.pace).toBe('steady');
      expect(plan.isAtSafeFloor).toBe(false);

      // Deficit = 2852 - 2282 = 570 kcal/day
      // Weekly loss = (570 * 7) / 7700 = 0.518 kg/week
      // Weeks for 10kg = 10 / 0.518 = 19.3 -> 19 weeks
      expect(plan.estimatedWeeksToGoal).toBe(19);
      expect(plan.goalDate).toBeDefined();
    });

    it('calculates gentle pace (10% deficit)', () => {
      const plan = calculateHealthPlan({ ...baseMaleLoss, pace: 'gentle' });
      // Deficit: 2852 * 0.90 = 2567
      expect(plan.dailyCalorieBudget).toBe(2567);
      expect(plan.pace).toBe('gentle');
      // Deficit = 2852 - 2567 = 285 kcal/day -> (285*7)/7700 = 0.259 kg/week -> 10 / 0.259 = 39 weeks
      expect(plan.estimatedWeeksToGoal).toBe(39);
    });

    it('calculates faster pace (25% deficit)', () => {
      const plan = calculateHealthPlan({ ...baseMaleLoss, pace: 'faster' });
      // Deficit: 2852 * 0.75 = 2139
      expect(plan.dailyCalorieBudget).toBe(2139);
      expect(plan.pace).toBe('faster');
      // Deficit = 2852 - 2139 = 713 kcal/day -> (713*7)/7700 = 0.648 kg/week -> 10 / 0.648 = 15 weeks
      expect(plan.estimatedWeeksToGoal).toBe(15);
    });
  });

  describe('Muscle Gain Surplus with Paces', () => {
    const baseGain: UserBiometricsInput = {
      age: 24,
      gender: 'female',
      heightCm: 165,
      weightKg: 58,
      targetWeightKg: 62,
      goal: 'gain_muscle',
      activityLevel: 'lightly_active',
    };

    it('calculates steady muscle gain (+300 kcal, 0.25 kg/week)', () => {
      const plan = calculateHealthPlan({ ...baseGain, pace: 'steady' });
      // TDEE = 1829, +300 = 2129
      expect(plan.dailyCalorieBudget).toBe(2129);
      // 4 kg / 0.25 kg/week = 16 weeks
      expect(plan.estimatedWeeksToGoal).toBe(16);
      expect(plan.goalDate).toBeDefined();
    });

    it('calculates gentle muscle gain (+150 kcal, 0.15 kg/week)', () => {
      const plan = calculateHealthPlan({ ...baseGain, pace: 'gentle' });
      expect(plan.dailyCalorieBudget).toBe(1829 + 150);
      // 4 kg / 0.15 kg/week = 26.6 -> 27 weeks
      expect(plan.estimatedWeeksToGoal).toBe(27);
    });

    it('calculates faster muscle gain (+450 kcal, 0.35 kg/week)', () => {
      const plan = calculateHealthPlan({ ...baseGain, pace: 'faster' });
      expect(plan.dailyCalorieBudget).toBe(1829 + 450);
      // 4 kg / 0.35 kg/week = 11.4 -> 11 weeks
      expect(plan.estimatedWeeksToGoal).toBe(11);
    });
  });

  describe('previewPlans()', () => {
    it('returns all three pace results in one call', () => {
      const previews = previewPlans({
        age: 30,
        gender: 'male',
        heightCm: 175,
        weightKg: 80,
        targetWeightKg: 75,
        goal: 'lose_weight',
        activityLevel: 'sedentary',
      });

      expect(previews.gentle.pace).toBe('gentle');
      expect(previews.steady.pace).toBe('steady');
      expect(previews.faster.pace).toBe('faster');

      expect(previews.gentle.dailyCalorieBudget).toBeGreaterThan(previews.steady.dailyCalorieBudget);
      expect(previews.steady.dailyCalorieBudget).toBeGreaterThan(previews.faster.dailyCalorieBudget);

      expect(previews.gentle.estimatedWeeksToGoal).toBeGreaterThan(
        previews.steady.estimatedWeeksToGoal!
      );
      expect(previews.steady.estimatedWeeksToGoal).toBeGreaterThan(
        previews.faster.estimatedWeeksToGoal!
      );
    });
  });

  describe('Safety Floors', () => {
    it('enforces 1200 kcal floor for females and flags isAtSafeFloor', () => {
      const plan = calculateHealthPlan({
        age: 65,
        gender: 'female',
        heightCm: 145,
        weightKg: 40,
        goal: 'lose_weight',
        pace: 'faster',
        activityLevel: 'sedentary',
      });

      expect(plan.dailyCalorieBudget).toBe(1200);
      expect(plan.isAtSafeFloor).toBe(true);
    });

    it('enforces 1500 kcal floor for males and flags isAtSafeFloor', () => {
      const plan = calculateHealthPlan({
        age: 70,
        gender: 'male',
        heightCm: 155,
        weightKg: 50,
        goal: 'lose_weight',
        pace: 'faster',
        activityLevel: 'sedentary',
      });

      expect(plan.dailyCalorieBudget).toBe(1500);
      expect(plan.isAtSafeFloor).toBe(true);
    });

    it('enforces 1350 kcal midpoint floor for prefer_not_to_say', () => {
      const plan = calculateHealthPlan({
        age: 65,
        gender: 'prefer_not_to_say',
        heightCm: 150,
        weightKg: 42,
        goal: 'lose_weight',
        pace: 'faster',
        activityLevel: 'sedentary',
      });

      expect(plan.dailyCalorieBudget).toBe(1350);
      expect(plan.isAtSafeFloor).toBe(true);
    });
  });

  describe('minSafeTargetKg guardrail helper', () => {
    it('calculates minimum safe weight at BMI 18.5', () => {
      // Height 180cm -> 18.5 * 1.8^2 = 18.5 * 3.24 = 59.94 -> 59.9 kg
      expect(minSafeTargetKg(180)).toBe(59.9);
      // Height 160cm -> 18.5 * 1.6^2 = 18.5 * 2.56 = 47.36 -> 47.4 kg
      expect(minSafeTargetKg(160)).toBe(47.4);
    });
  });

  describe('Age Policy & Safety Guardrails', () => {
    it('blocks users under 13 with friendly message', () => {
      const policy = evaluateAgePolicy(12);
      expect(policy.allowed).toBe(false);
      expect(policy.forceMaintain).toBe(false);
      expect(policy.message).toContain('13 and older');
    });

    it('forces goal to maintain for teens 13 to 17', () => {
      const policy = evaluateAgePolicy(15);
      expect(policy.allowed).toBe(true);
      expect(policy.forceMaintain).toBe(true);

      const plan = calculateHealthPlan({
        age: 15,
        gender: 'male',
        heightCm: 170,
        weightKg: 65,
        goal: 'lose_weight', // attempted deficit
        activityLevel: 'moderately_active',
      });

      // Goal is overridden to maintain; budget equals TDEE
      expect(plan.dailyCalorieBudget).toBe(plan.tdee);
    });

    it('allows full customization for users 18 and older', () => {
      const policy = evaluateAgePolicy(20);
      expect(policy.allowed).toBe(true);
      expect(policy.forceMaintain).toBe(false);
    });
  });

  describe('calculateGoalDate', () => {
    it('formats target date properly', () => {
      const baseDate = new Date('2026-10-01T00:00:00Z');
      const formatted = calculateGoalDate(2, baseDate);
      expect(formatted).toBe('15 Oct');
    });
  });
});
