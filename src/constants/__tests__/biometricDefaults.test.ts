import {
  BIOMETRIC_DEFAULTS,
  HYDRATION_DEFAULTS,
  MOVEMENT_DEFAULTS,
  BMI_DEFAULTS,
} from '../biometricDefaults';

describe('biometricDefaults', () => {
  it('provides consistent, complete baseline goals', () => {
    expect(BIOMETRIC_DEFAULTS.dailyCalorieBudget).toBe(2213);
    expect(BIOMETRIC_DEFAULTS.targetProtein).toBe(90);
    expect(BIOMETRIC_DEFAULTS.targetCarbs).toBe(110);
    expect(BIOMETRIC_DEFAULTS.targetFat).toBe(70);
    expect(BIOMETRIC_DEFAULTS.targetFiber).toBe(30);
    expect(BIOMETRIC_DEFAULTS.waterGoalMl).toBe(2500);
    expect(BIOMETRIC_DEFAULTS.stepGoal).toBe(10000);
    expect(BIOMETRIC_DEFAULTS.currentWeightKg).toBe(68.0);
    expect(BIOMETRIC_DEFAULTS.targetWeightKg).toBe(65.0);
    expect(BIOMETRIC_DEFAULTS.heightCm).toBe(175);
  });

  it('calculates walking distance using user height correctly', () => {
    // 10000 steps with height 175cm -> stride = 175 * 0.415 / 100 = 0.72625m
    // Distance = 10000 * 0.72625 / 1000 = 7.2625km -> rounded to 7.3km
    const distance = MOVEMENT_DEFAULTS.calculateDistanceKm(10000, 175);
    expect(distance).toBe(7.3);

    expect(MOVEMENT_DEFAULTS.calculateDistanceKm(0)).toBe(0);
    expect(MOVEMENT_DEFAULTS.calculateDistanceKm(-50)).toBe(0);
  });

  it('calculates step burn adjusted for body mass correctly', () => {
    // 10000 steps with weight 68kg -> 10000 * 0.0005 * 68 = 340 kcal
    const burn = MOVEMENT_DEFAULTS.calculateStepBurnKcal(10000, 68);
    expect(burn).toBe(340);

    expect(MOVEMENT_DEFAULTS.calculateStepBurnKcal(0)).toBe(0);
  });

  it('calculates active minutes with cadence correctly', () => {
    expect(MOVEMENT_DEFAULTS.calculateActiveMinutes(5000)).toBe(50);
    expect(MOVEMENT_DEFAULTS.calculateActiveMinutes(0)).toBe(0);
  });

  it('calculates clinical BMI correctly', () => {
    // 68kg at 175cm -> 68 / (1.75^2) = 22.2
    const bmi = BMI_DEFAULTS.calculateBMI(68, 175);
    expect(bmi).toBe(22.2);
  });

  it('provides standard hydration defaults', () => {
    expect(HYDRATION_DEFAULTS.defaultCupSizeMl).toBe(250);
    expect(HYDRATION_DEFAULTS.standardPresetsMl).toContain(250);
  });
});
