import {
  BIOMETRIC_DEFAULTS,
  HYDRATION_DEFAULTS,
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

  it('provides standard hydration defaults', () => {
    expect(HYDRATION_DEFAULTS.defaultCupSizeMl).toBe(250);
    expect(HYDRATION_DEFAULTS.standardPresetsMl).toContain(250);
  });
});
