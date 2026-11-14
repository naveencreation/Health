import { LBS_PER_KG } from './goalsForm';
import type { CalculatedHealthPlan, Pace } from './onboardingCalculator';

export interface LedgerRow {
  title: string;
  sub: string;
  /** Signed kcal. */
  value: number;
}

export interface PlanLedger {
  rows: [LedgerRow, LedgerRow, LedgerRow];
  total: number;
  totalSub: string;
}

const PACE_NAMES: Record<Pace, string> = { gentle: 'Gentle', steady: 'Steady', faster: 'Faster' };

export function formatSignedKcal(v: number): string {
  if (v === 0) return '0';
  const n = Math.abs(v).toLocaleString('en-US');
  return v > 0 ? `+${n}` : `−${n}`;
}

export function buildPlanLedger(
  plan: CalculatedHealthPlan,
  opts: {
    activityLabel: string;
    pace?: Pace;
    weightUnit: 'kg' | 'lbs';
    targetWeightKg?: number;
  }
): PlanLedger {
  const factor = opts.weightUnit === 'lbs' ? LBS_PER_KG : 1;
  const unit = opts.weightUnit === 'lbs' ? 'lb' : 'kg';
  const weekly = plan.weeklyChangeKg;
  const paceName = opts.pace ? PACE_NAMES[opts.pace] : 'Your pace';

  let paceSub: string;
  if (plan.isAtSafeFloor) {
    paceSub = 'Kept at a safe minimum';
  } else if (weekly === undefined) {
    paceSub = 'No change, to maintain';
  } else if (weekly < 0) {
    paceSub =
      opts.targetWeightKg && plan.goalDate
        ? `${paceName}, for ${Math.round(opts.targetWeightKg * factor)} ${unit} by ${plan.goalDate}`
        : `${paceName} pace`;
  } else {
    paceSub = `${paceName}, to build muscle`;
  }

  const totalSub =
    weekly === undefined
      ? 'To stay where you are'
      : `To ${weekly < 0 ? 'lose' : 'gain'} ${(Math.round(Math.abs(weekly) * factor * 10) / 10).toFixed(1)} ${unit} a week`;

  return {
    rows: [
      { title: 'Resting burn', sub: 'What your body uses at rest', value: plan.bmr },
      { title: 'Daily movement', sub: opts.activityLabel, value: plan.tdee - plan.bmr },
      { title: 'Pace', sub: paceSub, value: plan.dailyCalorieBudget - plan.tdee },
    ],
    total: plan.dailyCalorieBudget,
    totalSub,
  };
}
