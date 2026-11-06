import {
  parseDecimal,
  validateGoalsForm,
  toGoalsForm,
  balancedCarbs,
  planFor,
  calorieFloor,
  GoalsFormValues,
} from '../goalsForm';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';

const valid: GoalsFormValues = {
  budget: '2000',
  protein: '120',
  carbs: '230',
  fat: '64',
  fiber: '30',
  water: '2500',
  steps: '8000',
  weight: '74,5',
  target: '70',
  height: '178',
};

describe('goalsForm', () => {
  it('parses comma decimals and rejects negatives and blanks', () => {
    expect(parseDecimal('74,5')).toBe(74.5);
    expect(parseDecimal('-5')).toBeNaN();
    expect(parseDecimal('')).toBeNaN();
  });

  it('accepts a consistent form and converts to kg', () => {
    const res = validateGoalsForm(valid, { unit: 'kg', gender: 'male', age: 30 });
    expect(res.errors).toEqual({});
    expect(res.goals?.currentWeightKg).toBe(74.5);
    expect(res.goals?.heightCm).toBe(178);
  });

  it('converts pounds to kilograms', () => {
    const res = validateGoalsForm(
      { ...valid, weight: '165', target: '155' },
      { unit: 'lbs', gender: 'male', age: 30 }
    );
    expect(res.goals?.currentWeightKg).toBeCloseTo(74.84, 2);
  });

  it('blocks unsafe or impossible values', () => {
    const res = validateGoalsForm(
      { ...valid, budget: '900', water: '-1', height: '5.9' },
      { unit: 'kg', gender: 'female', age: 30 }
    );
    expect(res.goals).toBeUndefined();
    expect(res.errors.budget).toMatch(/1200/);
    expect(res.errors.water).toBeDefined();
    expect(res.errors.height).toMatch(/cm/);
  });

  it('applies the teen floor and flags macros that miss the budget', () => {
    expect(calorieFloor('female', 15)).toBe(1600);
    const res = validateGoalsForm({ ...valid, carbs: '100' }, { unit: 'kg', gender: 'male', age: 30 });
    expect(res.errors.macros).toMatch(/1456 kcal/);
  });

  it('balances carbs to the budget', () => {
    expect(balancedCarbs(2000, 120, 64)).toBe(236);
  });

  it('round-trips stored goals into the form in the user unit', () => {
    const form = toGoalsForm({ ...BIOMETRIC_DEFAULTS, currentWeightKg: 74.23456 }, 'lbs');
    expect(form.weight).toBe('163.7');
  });

  it('builds presets whose macros add up to their budget', () => {
    const plan = planFor({ ...BIOMETRIC_DEFAULTS }, 'lose_weight');
    const macroKcal = plan.targetProteinG * 4 + plan.targetCarbsG * 4 + plan.targetFatG * 9;
    expect(Math.abs(macroKcal - plan.dailyCalorieBudget)).toBeLessThanOrEqual(10);
  });
});
