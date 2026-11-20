import { buildWeekVerdict, bestStepDayIndex } from '../weekVerdict';
import { SeriesSummary } from '../seriesSummary';

const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const summary = (hits: number, elapsed: number): SeriesSummary => ({
  avg: 1800,
  diff: 0,
  hits,
  elapsed,
  max: 2000,
  min: 1500,
});

describe('buildWeekVerdict', () => {
  it('invites a first log when no meals are logged', () => {
    const v = buildWeekVerdict({
      calorie: null,
      stepValues: [9000, 0, 0, 0, 0, 0, 0],
      dayNames: NAMES,
    });
    expect(v).toEqual({
      eyebrow: 'THIS WEEK',
      headline: 'Your week starts here',
      body: "Log a meal and I'll track your zone.",
    });
  });

  it('names the best step day first', () => {
    const v = buildWeekVerdict({
      calorie: summary(4, 5),
      stepValues: [6200, 9400, 11240, 7300, 4100, 0, 0],
      dayNames: NAMES,
    });
    expect(v.headline).toBe('In your zone\n4 of 5 days');
    expect(v.body).toBe('Wednesday was your best step day.');
  });

  it('celebrates a perfect week', () => {
    const v = buildWeekVerdict({
      calorie: summary(3, 3),
      stepValues: [0, 0, 0, 0, 0, 0, 0],
      dayNames: NAMES,
    });
    expect(v.body).toBe('Perfect week so far!');
  });

  it('encourages a steady rhythm at half or more', () => {
    const v = buildWeekVerdict({ calorie: summary(2, 4), stepValues: [], dayNames: NAMES });
    expect(v.body).toBe('Nice rhythm! Keep it going.');
  });

  it('stays kind when the zone was missed', () => {
    const v = buildWeekVerdict({ calorie: summary(1, 5), stepValues: [], dayNames: NAMES });
    expect(v.body).toBe('Small steps count. Tomorrow is a fresh start.');
  });
});

describe('bestStepDayIndex', () => {
  it('needs two logged days and a single winner', () => {
    expect(bestStepDayIndex([0, 5000, 0])).toBeNull();
    expect(bestStepDayIndex([5000, 5000, 0])).toBeNull();
    expect(bestStepDayIndex([3000, 0, 8000])).toBe(2);
  });
});
