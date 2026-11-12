import { DailyLog, MealType, UserGoals } from '@/types';
import { DayCalorieIntakeData, DayMacroRatioData } from '@/components/report';

export interface DayBucketItem {
  dateStr: string;
  dayNum: number;
  dayName: string;
  log?: DailyLog;
  bucketDates?: string[];
  monthDates?: string[];
}

export interface ExtractedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  burnedCalories: number;
}

/**
 * Extracts aggregate macronutrients and calories safely from a DailyLog.
 */
export function extractLogNutrition(log?: DailyLog): ExtractedNutrition {
  if (!log) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, burnedCalories: 0 };
  }
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    fiber = 0;
  if (Array.isArray(log.meals)) {
    log.meals.forEach(m => {
      calories += m.calories || 0;
      protein += m.protein || 0;
      carbs += m.carbs || 0;
      fat += m.fat || 0;
      fiber += m.fiber || 0;
    });
  }
  let burnedCalories = 0;
  if (Array.isArray(log.activities)) {
    log.activities.forEach(a => {
      burnedCalories += a.caloriesBurned || 0;
    });
  }
  return { calories, protein, carbs, fat, fiber, burnedCalories };
}

/**
 * Computes daily/bucketed calorie intake data against target budget.
 */
export function computeCalorieDays(
  days: DayBucketItem[],
  dailyCalorieGoal: number,
  dailyLogs: Record<string, DailyLog>
): DayCalorieIntakeData[] {
  return days.map(item => {
    if ('log' in item) {
      const nutrition = extractLogNutrition(item.log);
      return {
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        calories: nutrition.calories,
        goalCalories: dailyCalorieGoal,
      };
    }

    const dates = item.bucketDates || item.monthDates || [];
    let totalCal = 0;
    let activeDaysCount = 0;
    dates.forEach(d => {
      const nutrition = extractLogNutrition(dailyLogs[d]);
      if (nutrition.calories > 0) {
        totalCal += nutrition.calories;
        activeDaysCount++;
      }
    });

    const avgCal = activeDaysCount > 0 ? Math.round(totalCal / activeDaysCount) : 0;
    return {
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      calories: avgCal,
      goalCalories: dailyCalorieGoal,
    };
  });
}

/**
 * Computes 100% stacked macronutrient distribution percentages.
 */
export function computeMacroRatioDays(
  days: DayBucketItem[],
  userGoals: UserGoals,
  dailyLogs: Record<string, DailyLog>
): DayMacroRatioData[] {
  return days.map(item => {
    let proteinG = 0;
    let carbsG = 0;
    let fatG = 0;
    let fiberG = 0;

    if ('log' in item) {
      const nutrition = extractLogNutrition(item.log);
      proteinG = Math.round(nutrition.protein * 10) / 10;
      carbsG = Math.round(nutrition.carbs * 10) / 10;
      fatG = Math.round(nutrition.fat * 10) / 10;
      fiberG = Math.round(nutrition.fiber * 10) / 10;
    } else {
      const dates = item.bucketDates || item.monthDates || [];
      let pSum = 0,
        cSum = 0,
        fSum = 0,
        fibSum = 0,
        count = 0;
      dates.forEach(d => {
        const nutrition = extractLogNutrition(dailyLogs[d]);
        if (nutrition.calories > 0) {
          pSum += nutrition.protein;
          cSum += nutrition.carbs;
          fSum += nutrition.fat;
          fibSum += nutrition.fiber;
          count++;
        }
      });
      if (count > 0) {
        proteinG = Math.round((pSum / count) * 10) / 10;
        carbsG = Math.round((cSum / count) * 10) / 10;
        fatG = Math.round((fSum / count) * 10) / 10;
        fiberG = Math.round((fibSum / count) * 10) / 10;
      }
    }

    const cKcal = carbsG * 4;
    const pKcal = proteinG * 4;
    const fKcal = fatG * 9;
    const totalKcal = cKcal + pKcal + fKcal;

    let carbsPct = 0;
    let proteinPct = 0;
    let fatPct = 0;

    if (totalKcal > 0) {
      carbsPct = Math.round((cKcal / totalKcal) * 100);
      proteinPct = Math.round((pKcal / totalKcal) * 100);
      fatPct = Math.max(0, 100 - carbsPct - proteinPct);
    }

    return {
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      carbsPct,
      proteinPct,
      fatPct,
      carbsGrams: carbsG,
      proteinGrams: proteinG,
      fatGrams: fatG,
      fiberGrams: fiberG,
      carbs: carbsG,
      protein: proteinG,
      fat: fatG,
      fiber: fiberG,
    };
  });
}

/** Share of the day's calorie allowance each meal aims for. */
export const MEAL_SHARE: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  snacks: 0.12,
  dinner: 0.28,
};

/** Calorie target for one meal from the day's allowance (budget + burned). */
export function getMealTarget(allowance: number, meal: MealType): number {
  return Math.round(Math.max(0, allowance) * MEAL_SHARE[meal]);
}
