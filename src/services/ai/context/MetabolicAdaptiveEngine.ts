import { DailyLog, UserGoals } from '@/types';
import { MetabolicInsight } from '../types/ai.types';

export class MetabolicAdaptiveEngineService {
  /**
   * Calculates baseline standard TDEE using Mifflin-St Jeor formula with activity multiplier.
   */
  calculateStandardTdee(goals?: Partial<UserGoals>): number {
    const weight = goals?.currentWeightKg || 70;
    const height = goals?.heightCm || 170;
    const age = goals?.age || 28;
    const isFemale = goals?.gender?.toLowerCase() === 'female';

    // Mifflin-St Jeor BMR
    const bmr = isFemale
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

    // Default moderate activity factor (1.35)
    return Math.round(bmr * 1.35);
  }

  /**
   * Analyzes 7–14 days of intake logs and weight trajectory to compute observed TDEE
   * and detect metabolic plateaus, rapid loss, or healthy adaptation.
   */
  analyzeMetabolism(
    dailyLogs: DailyLog[],
    userGoals?: Partial<UserGoals>
  ): MetabolicInsight {
    const standardTdee = this.calculateStandardTdee(userGoals);
    const currentCalorieTarget = userGoals?.dailyCalorieBudget || standardTdee;
    const isFemale = userGoals?.gender?.toLowerCase() === 'female';
    const clinicalFloor = isFemale ? 1200 : 1500;

    // Filter to valid logged days in the last 14 days
    const validDays = dailyLogs.filter(d => {
      const dayKcal = d.meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
      return dayKcal >= 500;
    });

    // If insufficient data logged (< 4 days), return preliminary estimate
    if (validDays.length < 4) {
      return {
        observedTdee: standardTdee,
        standardTdeeEstimate: standardTdee,
        differenceKcal: 0,
        confidence: 'preliminary',
        status: 'maintenance',
        adaptationRatePct: 0,
        recommendedCalorieBudget: currentCalorieTarget,
        recommendationReason:
          'Log consistently for at least 5 to 7 days so Ria can measure your personal metabolic rate.',
      };
    }

    // Compute average intake over valid days
    const totalLoggedKcal = validDays.reduce((sum, d) => {
      const dayKcal = d.meals?.reduce((mSum, m) => mSum + (m.calories || 0), 0) || 0;
      return sum + dayKcal;
    }, 0);
    const avgIntake = Math.round(totalLoggedKcal / validDays.length);

    // Extract weight points
    const weightPoints: Array<{ date: string; weightKg: number }> = [];
    for (const d of dailyLogs) {
      if (d.weightKg && d.weightKg > 30 && d.weightKg < 300) {
        weightPoints.push({ date: d.date, weightKg: d.weightKg });
      } else if (d.weightEntries && d.weightEntries.length > 0) {
        const lastEntry = d.weightEntries[d.weightEntries.length - 1];
        if (lastEntry.weightKg) {
          weightPoints.push({ date: d.date, weightKg: lastEntry.weightKg });
        }
      }
    }

    // Sort weight points by date
    weightPoints.sort((a, b) => a.date.localeCompare(b.date));

    // If fewer than 2 distinct weight logs across the window, assume intake-based estimate
    if (weightPoints.length < 2) {
      return {
        observedTdee: standardTdee,
        standardTdeeEstimate: standardTdee,
        differenceKcal: 0,
        confidence: 'preliminary',
        status: 'maintenance',
        adaptationRatePct: 0,
        recommendedCalorieBudget: currentCalorieTarget,
        recommendationReason:
          'We need at least two scale weigh-ins to compare energy intake with actual body mass delta.',
      };
    }

    const startWeight = weightPoints[0].weightKg;
    const endWeight = weightPoints[weightPoints.length - 1].weightKg;
    const weightDeltaKg = startWeight - endWeight; // Positive if lost weight, negative if gained

    // Days span between first and last weight
    const startDate = new Date(weightPoints[0].date).getTime();
    const endDate = new Date(weightPoints[weightPoints.length - 1].date).getTime();
    const daysSpan = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))) || validDays.length;

    // Energy equivalence of 1 kg human adipose tissue / body mass is ~7700 kcal
    const totalEnergyDelta = weightDeltaKg * 7700;
    const dailyEnergyDelta = totalEnergyDelta / daysSpan;

    // Observed TDEE = Average daily calorie intake + daily energy deficit
    const observedTdee = Math.round(avgIntake + dailyEnergyDelta);
    const diffKcal = observedTdee - standardTdee;
    const adaptationRatePct = Math.round((diffKcal / standardTdee) * 100);

    const confidence: 'moderate' | 'high' = validDays.length >= 8 && daysSpan >= 7 ? 'high' : 'moderate';

    // Body weight loss percentage per week
    const currentWeight = userGoals?.currentWeightKg || endWeight;
    const weeklyLossKg = (weightDeltaKg / daysSpan) * 7;
    const weeklyLossPct = currentWeight > 0 ? (weeklyLossKg / currentWeight) * 100 : 0;

    let status: 'plateau' | 'healthy_progress' | 'rapid_loss' | 'surplus_gain' | 'maintenance' = 'healthy_progress';
    let recommendedBudget = currentCalorieTarget;
    let recommendationReason = '';

    if (weeklyLossPct > 1.2) {
      // Losing faster than 1.2% body weight per week -> Muscle wasting / metabolic slowdown risk
      status = 'rapid_loss';
      recommendedBudget = Math.round(currentCalorieTarget + 180);
      recommendationReason =
        'Weight is dropping faster than 1.2%/week. Increasing calories slightly protects lean muscle mass and thyroid function.';
    } else if (weightDeltaKg <= 0.1 && validDays.length >= 7) {
      // Weight has stalled or gained despite logged intake
      status = 'plateau';
      // Step down calories by 120 kcal, but clamp to clinical safety floor
      const proposed = Math.max(clinicalFloor, Math.round(currentCalorieTarget - 120));
      recommendedBudget = proposed;
      recommendationReason =
        proposed > clinicalFloor
          ? 'Metabolic plateau detected over past 7-14 days. Adjusting target by -120 kcal breaks through the stall.'
          : `Metabolic plateau detected. Calorie target is already at the clinical safety floor (${clinicalFloor} kcal). Suggest increasing daily step count by 1,500-2,000 steps rather than reducing food intake.`;
    } else if (weeklyLossPct >= 0.3 && weeklyLossPct <= 1.2) {
      status = 'healthy_progress';
      recommendedBudget = currentCalorieTarget;
      recommendationReason =
        `Healthy steady progress: losing ~${weeklyLossKg.toFixed(2)} kg/week (${weeklyLossPct.toFixed(1)}% body mass). Current target is optimized.`;
    } else if (weightDeltaKg < -0.3) {
      status = 'surplus_gain';
      const proposed = Math.max(clinicalFloor, Math.round(currentCalorieTarget - 150));
      recommendedBudget = proposed;
      recommendationReason =
        'Weight trend shows a slight surplus. Dialing in calorie target to restore fat loss deficit.';
    } else {
      status = 'maintenance';
      recommendedBudget = currentCalorieTarget;
      recommendationReason = 'Energy balance is maintaining steady weight.';
    }

    return {
      observedTdee,
      standardTdeeEstimate: standardTdee,
      differenceKcal: diffKcal,
      confidence,
      status,
      adaptationRatePct,
      recommendedCalorieBudget: recommendedBudget,
      recommendationReason,
    };
  }
}

export const MetabolicAdaptiveEngine = new MetabolicAdaptiveEngineService();
