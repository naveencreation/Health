import { SeriesSummary } from './seriesSummary';

export interface WeekVerdictInput {
  /** Calorie summary in 'band' mode (null when no meals are logged this week) */
  calorie: SeriesSummary | null;
  /** Steps per day, Mon-Sun (0 = nothing logged) */
  stepValues: number[];
  /** Full weekday names, Mon-Sun */
  dayNames: string[];
}

export interface WeekVerdict {
  eyebrow: string;
  headline: string;
  body: string;
}

/** Index of the single best step day, or null unless at least two days are logged and one wins. */
export function bestStepDayIndex(stepValues: number[]): number | null {
  const logged = stepValues.filter(v => v > 0);
  if (logged.length < 2) return null;
  const max = Math.max(...logged);
  if (logged.filter(v => v === max).length > 1) return null;
  return stepValues.indexOf(max);
}

/** The short, warm sentence at the top of Insights. No medical claims. */
export function buildWeekVerdict({ calorie, stepValues, dayNames }: WeekVerdictInput): WeekVerdict {
  const eyebrow = 'THIS WEEK';
  if (!calorie) {
    return {
      eyebrow,
      headline: 'Your week starts here',
      body: "Log a meal and I'll track your zone.",
    };
  }
  const { hits, elapsed } = calorie;
  const headline = `In your zone\n${hits} of ${elapsed} days`;
  const bestIdx = bestStepDayIndex(stepValues);

  let body: string;
  if (bestIdx !== null && dayNames[bestIdx]) {
    body = `${dayNames[bestIdx]} was your best step day.`;
  } else if (elapsed > 0 && hits === elapsed) {
    body = 'Perfect week so far!';
  } else if (hits >= elapsed / 2) {
    body = 'Nice rhythm! Keep it going.';
  } else {
    body = 'Small steps count. Tomorrow is a fresh start.';
  }
  return { eyebrow, headline, body };
}
