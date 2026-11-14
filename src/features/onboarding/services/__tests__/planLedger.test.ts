import { buildPlanLedger, formatSignedKcal } from '../planLedger';
import type { CalculatedHealthPlan } from '../onboardingCalculator';

const base: CalculatedHealthPlan = {
  bmr: 1500,
  tdee: 2000,
  dailyCalorieBudget: 1650,
  targetProteinG: 0,
  targetCarbsG: 0,
  targetFatG: 0,
  targetFiberG: 0,
  targetWaterMl: 0,
  stepGoal: 0,
};
const o = { activityLabel: 'Mostly sitting', weightUnit: 'kg' as const };

describe('buildPlanLedger', () => {
  it('lose with target and goal date', () => {
    const l = buildPlanLedger(
      { ...base, weeklyChangeKg: -0.5, goalDate: 'Mar 3' },
      { ...o, pace: 'steady', targetWeightKg: 70.4 }
    );
    expect(l.rows[0]).toEqual({
      title: 'Resting burn',
      sub: 'What your body uses at rest',
      value: 1500,
    });
    expect(l.rows[1]).toEqual({ title: 'Daily movement', sub: 'Mostly sitting', value: 500 });
    expect(l.rows[2]).toEqual({
      title: 'Pace',
      sub: 'Steady, for 70 kg by Mar 3',
      value: -350,
    });
    expect(l.totalSub).toBe('To lose 0.5 kg a week');
  });

  it('lose without goal date', () => {
    const l = buildPlanLedger(
      { ...base, weeklyChangeKg: -0.5 },
      { ...o, pace: 'gentle', targetWeightKg: 70 }
    );
    expect(l.rows[2].sub).toBe('Gentle pace');
  });

  it('lose with unknown pace', () => {
    expect(buildPlanLedger({ ...base, weeklyChangeKg: -0.5 }, o).rows[2].sub).toBe(
      'Your pace pace'
    );
  });

  it('gain', () => {
    const l = buildPlanLedger(
      { ...base, dailyCalorieBudget: 2250, weeklyChangeKg: 0.25 },
      { ...o, pace: 'faster' }
    );
    expect(l.rows[2].sub).toBe('Faster, to build muscle');
    expect(l.rows[2].value).toBe(250);
    expect(l.totalSub).toBe('To gain 0.3 kg a week');
  });

  it('maintain', () => {
    const l = buildPlanLedger({ ...base, dailyCalorieBudget: 2000 }, o);
    expect(l.rows[2].sub).toBe('No change, to maintain');
    expect(l.totalSub).toBe('To stay where you are');
  });

  it('safe floor', () => {
    const l = buildPlanLedger({ ...base, weeklyChangeKg: -0.5, isAtSafeFloor: true }, o);
    expect(l.rows[2].sub).toBe('Kept at a safe minimum');
  });

  it('converts to lbs', () => {
    const l = buildPlanLedger(
      { ...base, weeklyChangeKg: -0.5, goalDate: 'Mar 3' },
      { ...o, weightUnit: 'lbs', pace: 'steady', targetWeightKg: 70 }
    );
    expect(l.rows[2].sub).toBe('Steady, for 154 lb by Mar 3');
    expect(l.totalSub).toBe('To lose 1.1 lb a week');
  });

  it('rows sum to total', () => {
    const l = buildPlanLedger({ ...base, weeklyChangeKg: -0.5 }, o);
    expect(l.rows.reduce((s, r) => s + r.value, 0)).toBe(l.total);
    expect(l.total).toBe(1650);
  });
});

describe('formatSignedKcal', () => {
  it('formats signs and grouping', () => {
    expect(formatSignedKcal(271)).toBe('+271');
    expect(formatSignedKcal(-320)).toBe('−320');
    expect(formatSignedKcal(0)).toBe('0');
    expect(formatSignedKcal(1356)).toBe('+1,356');
  });
});
