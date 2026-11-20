import { buildWeekBalance, WeekBalanceInput } from '../weekBalance';

const base: WeekBalanceInput = {
  calorieHits: 4,
  elapsed: 5,
  proteinAvg: 62,
  proteinTarget: 100,
  waterAvg: 2400,
  waterGoal: 2500,
  stepAvg: 6400,
  stepGoal: 8000,
  weighInDays: 2,
  hasData: true,
};

describe('buildWeekBalance', () => {
  it('computes each axis as a goal ratio', () => {
    const { axes } = buildWeekBalance(base);
    const v = Object.fromEntries(axes.map(a => [a.id, a.value]));
    expect(v.calories).toBeCloseTo(0.8);
    expect(v.protein).toBeCloseTo(0.62);
    expect(v.water).toBeCloseTo(0.96);
    expect(v.steps).toBeCloseTo(0.8);
    expect(v.weighIns).toBeCloseTo(2 / 3);
  });

  it('clamps to 0-1 and survives zero denominators', () => {
    const { axes } = buildWeekBalance({
      ...base,
      proteinAvg: 300,
      elapsed: 0,
      stepGoal: 0,
      weighInDays: 9,
    });
    const v = Object.fromEntries(axes.map(a => [a.id, a.value]));
    expect(v.protein).toBe(1);
    expect(v.calories).toBe(0);
    expect(v.steps).toBe(0);
    expect(v.weighIns).toBe(1);
  });

  it('names the strongest and weakest axis', () => {
    const b = buildWeekBalance(base);
    expect(b.strongest.id).toBe('water');
    expect(b.weakest.id).toBe('protein');
  });

  it('passes hasData through', () => {
    expect(buildWeekBalance({ ...base, hasData: false }).hasData).toBe(false);
  });
});
