export type BalanceAxisId = 'calories' | 'protein' | 'water' | 'steps' | 'weighIns';

export interface BalanceAxis {
  id: BalanceAxisId;
  label: string;
  /** 0-1 */
  value: number;
}

export interface WeekBalanceInput {
  /** Days inside the calorie zone and days elapsed so far */
  calorieHits: number;
  elapsed: number;
  proteinAvg: number;
  proteinTarget: number;
  waterAvg: number;
  waterGoal: number;
  stepAvg: number;
  stepGoal: number;
  weighInDays: number;
  /** Anything logged at all this week */
  hasData: boolean;
}

export interface WeekBalance {
  hasData: boolean;
  axes: BalanceAxis[];
  strongest: BalanceAxis;
  weakest: BalanceAxis;
}

const ratio = (num: number, den: number) =>
  den > 0 && Number.isFinite(num) ? Math.min(1, Math.max(0, num / den)) : 0;

/** Five goal-completion ratios (each clamped to 0-1) for the week balance radar. */
export function buildWeekBalance(i: WeekBalanceInput): WeekBalance {
  const axes: BalanceAxis[] = [
    { id: 'calories', label: 'Calories', value: ratio(i.calorieHits, i.elapsed) },
    { id: 'protein', label: 'Protein', value: ratio(i.proteinAvg, i.proteinTarget) },
    { id: 'water', label: 'Water', value: ratio(i.waterAvg, i.waterGoal) },
    { id: 'steps', label: 'Steps', value: ratio(i.stepAvg, i.stepGoal) },
    { id: 'weighIns', label: 'Weigh-ins', value: Math.min(1, Math.max(0, i.weighInDays / 3)) },
  ];
  let strongest = axes[0];
  let weakest = axes[0];
  axes.forEach(a => {
    if (a.value > strongest.value) strongest = a;
    if (a.value < weakest.value) weakest = a;
  });
  return { hasData: i.hasData, axes, strongest, weakest };
}
