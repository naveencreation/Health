/**
 * RiaCardParser.ts
 *
 * Extracts, validates, and builds Action Cards from Ria AI responses.
 * Implements thermodynamic Atwater consistency, 10-minute duplicate checks,
 * clinical safety floors, and fences stripping per RIA_Chat.md sections 7, 10, 11, 12.
 */

import { DailyLog, UserGoals } from '@/types';
import {
  RiaCard,
  MealCardData,
  MealCardItem,
  MealCardSlot,
  SuggestionCardData,
  WaterCardData,
  WeightCardData,
  DayReviewCardData,
  PlanChangeCardData,
} from '../types/ai.types';
import { RiaDuplicateChecker } from './RiaDuplicateChecker';
import { AI_CONFIG } from '../config/AIConfig';

export interface ParseMessageResult {
  cleanText: string;
  card?: RiaCard;
}

export class RiaCardParser {
  private static readonly ACTION_REGEX =
    /```(?:ria_action|json:ria_action)\s*([\s\S]*?)```/i;

  private static readonly FALLBACK_JSON_REGEX =
    /```json\s*(\{[\s\S]*?"(?:type|action)"\s*:\s*"(?:propose_meal_log|suggest_meals|propose_water|propose_weight|day_review|propose_plan_change)"[\s\S]*?\})\s*```/i;

  /**
   * Parses raw LLM text, extracts structured action blocks, validates metrics,
   * runs duplicate detection, and returns the displayable text alongside any constructed RiaCard.
   */
  public static parseMessage(
    rawText: string,
    currentLog?: DailyLog,
    userGoals?: Partial<UserGoals>,
    now: number = Date.now()
  ): ParseMessageResult {
    if (!rawText || typeof rawText !== 'string') {
      return { cleanText: '' };
    }

    let actionJsonStr: string | null = null;
    let cleanText = rawText;

    // 1. Try explicit ```ria_action block
    const match = this.ACTION_REGEX.exec(rawText);
    if (match) {
      actionJsonStr = match[1].trim();
      cleanText = rawText.replace(match[0], '').trim();
    } else {
      // 2. Try generic JSON fence matching recognized action type
      const fallbackMatch = this.FALLBACK_JSON_REGEX.exec(rawText);
      if (fallbackMatch) {
        actionJsonStr = fallbackMatch[1].trim();
        cleanText = rawText.replace(fallbackMatch[0], '').trim();
      }
    }

    if (!actionJsonStr) {
      return { cleanText };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(actionJsonStr);
    } catch {
      // Malformed JSON: per Section 10/12, drop card, keep clean text
      return { cleanText };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { cleanText };
    }

    const actionType = String(parsed.type || parsed.action || '').toLowerCase();
    const card = this.buildCard(actionType, parsed, currentLog, userGoals, now);

    return {
      cleanText,
      card: card || undefined,
    };
  }

  private static buildCard(
    actionType: string,
    data: any,
    currentLog?: DailyLog,
    userGoals?: Partial<UserGoals>,
    now: number = Date.now()
  ): RiaCard | null {
    switch (actionType) {
      case 'propose_meal_log':
        return this.buildMealCard(data, currentLog, now);

      case 'suggest_meals':
        return this.buildSuggestionCard(data);

      case 'propose_water':
        return this.buildWaterCard(data);

      case 'propose_weight':
        return this.buildWeightCard(data, userGoals);

      case 'day_review':
        return this.buildDayReviewCard(data, currentLog, userGoals);

      case 'propose_plan_change':
        return this.buildPlanChangeCard(data, userGoals);

      default:
        return null;
    }
  }

  /**
   * Builds and validates MealCardData with thermodynamic checks and 10-minute duplicate detection.
   */
  private static buildMealCard(
    data: any,
    currentLog?: DailyLog,
    now: number = Date.now()
  ): RiaCard | null {
    const rawSlot = String(data.slot || 'lunch').toLowerCase().trim();
    let slot: MealCardSlot = 'lunch';
    if (rawSlot.startsWith('break')) slot = 'breakfast';
    else if (rawSlot.startsWith('snack')) slot = 'snack';
    else if (rawSlot.startsWith('din')) slot = 'dinner';
    else if (rawSlot.startsWith('lunch')) slot = 'lunch';

    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (rawItems.length === 0) return null;

    const validatedItems: MealCardItem[] = [];
    let duplicateWarning: string | undefined = undefined;

    for (const item of rawItems) {
      if (!item || !item.name) continue;

      const name = String(item.name).trim().slice(0, 80);
      const qty = Math.max(0.1, Math.min(20, Number(item.qty) || 1));
      const unit = String(item.unit || 'portion').trim().slice(0, 30);

      let carbs = Math.max(0, Math.min(300, Math.round(Number(item.carbs) || 0)));
      let protein = Math.max(0, Math.min(200, Math.round(Number(item.protein) || 0)));
      let fat = Math.max(0, Math.min(200, Math.round(Number(item.fat) || 0)));
      let reportedKcal = Math.max(5, Math.min(3000, Math.round(Number(item.kcal) || 0)));

      // Atwater Thermodynamic Consistency Check
      const expectedKcal = carbs * 4 + protein * 4 + fat * 9;
      if (expectedKcal > 0 && reportedKcal > 0) {
        const discrepancy = Math.abs(reportedKcal - expectedKcal) / reportedKcal;
        if (discrepancy > AI_CONFIG.ATWATER.MAX_DISCREPANCY_TOLERANCE_PERCENT / 100) {
          reportedKcal = expectedKcal;
        }
      } else if (reportedKcal > 0 && expectedKcal === 0) {
        carbs = Math.round((reportedKcal * 0.5) / 4);
        protein = Math.round((reportedKcal * 0.25) / 4);
        fat = Math.round((reportedKcal * 0.25) / 9);
      }

      // Check 10-minute duplicate
      if (!duplicateWarning && currentLog?.meals) {
        const dupCheck = RiaDuplicateChecker.check(name, currentLog.meals, slot, now);
        if (dupCheck.isDuplicate) {
          duplicateWarning = `You logged ${dupCheck.matchedMealName} ${dupCheck.minutesAgo}m ago. Add again?`;
        }
      }

      validatedItems.push({
        id: `meal_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        qty,
        unit,
        kcal: reportedKcal,
        protein,
        carbs,
        fat,
        source: item.source === 'catalog' ? 'catalog' : 'estimate',
      });
    }

    if (validatedItems.length === 0) return null;

    const assumption = data.assumption ? String(data.assumption).trim().slice(0, 100) : undefined;

    const mealCard: MealCardData = {
      slot,
      items: validatedItems,
      assumption,
      state: 'proposed',
      duplicateWarning,
    };

    return { type: 'meal', data: mealCard };
  }

  /**
   * Builds and validates SuggestionCardData.
   */
  private static buildSuggestionCard(data: any): RiaCard | null {
    const rawOptions = Array.isArray(data.options) ? data.options : [];
    if (rawOptions.length === 0) return null;

    const validated = rawOptions.slice(0, 3).map((opt: any) => ({
      name: String(opt.name || 'Nutritious Option').trim().slice(0, 60),
      kcal: Math.max(10, Math.min(2000, Math.round(Number(opt.kcal) || 0))),
      protein: Math.max(0, Math.min(150, Math.round(Number(opt.protein) || 0))),
      carbs: Math.max(0, Math.min(250, Math.round(Number(opt.carbs) || 0))),
      fat: Math.max(0, Math.min(150, Math.round(Number(opt.fat) || 0))),
      portion: opt.portion ? String(opt.portion).trim().slice(0, 30) : undefined,
      tag: opt.tag ? String(opt.tag).trim().slice(0, 25) : undefined,
    }));

    if (validated.length === 0) return null;

    const cardData: SuggestionCardData = { options: validated };
    return { type: 'suggestion', data: cardData };
  }

  /**
   * Builds and validates WaterCardData.
   */
  private static buildWaterCard(data: any): RiaCard | null {
    const rawAmount = Number(data.amountMl ?? data.ml ?? 250);
    const amountMl = Math.max(50, Math.min(2000, Math.round(rawAmount)));

    const cardData: WaterCardData = {
      amountMl,
      state: 'proposed',
    };

    return { type: 'water', data: cardData };
  }

  /**
   * Builds and validates WeightCardData with sanity delta check (>3 kg).
   */
  private static buildWeightCard(
    data: any,
    userGoals?: Partial<UserGoals>
  ): RiaCard | null {
    const rawWeight = Number(data.weightKg ?? data.kg);
    if (isNaN(rawWeight) || rawWeight < 30 || rawWeight > 300) {
      return null;
    }

    const weightKg = Math.round(rawWeight * 10) / 10;
    const previousWeightKg = userGoals?.currentWeightKg;
    let deltaKg: number | undefined = undefined;
    let needsSanityConfirm = false;

    if (previousWeightKg !== undefined) {
      deltaKg = Math.round((weightKg - previousWeightKg) * 10) / 10;
      if (Math.abs(deltaKg) > 3.0) {
        needsSanityConfirm = true;
      }
    }

    const cardData: WeightCardData = {
      weightKg,
      previousWeightKg,
      deltaKg,
      needsSanityConfirm,
      state: 'proposed',
    };

    return { type: 'weight', data: cardData };
  }

  /**
   * Builds DayReviewCardData with targets and model win/focus observations.
   */
  private static buildDayReviewCard(
    data: any,
    currentLog?: DailyLog,
    userGoals?: Partial<UserGoals>
  ): RiaCard | null {
    const meals = currentLog?.meals || [];
    const caloriesConsumed = Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0));
    const proteinConsumed = Math.round(meals.reduce((sum, m) => sum + (m.protein || 0), 0));
    const carbsConsumed = Math.round(meals.reduce((sum, m) => sum + (m.carbs || 0), 0));
    const fatConsumed = Math.round(meals.reduce((sum, m) => sum + (m.fat || 0), 0));

    const calorieTarget = Math.round(userGoals?.dailyCalorieBudget || 2000);
    const proteinTarget = Math.round(userGoals?.targetProtein || 120);
    const carbsTarget = Math.round(userGoals?.targetCarbs || 220);
    const fatTarget = Math.round(userGoals?.targetFat || 65);

    const win = data.win
      ? String(data.win).trim().slice(0, 160)
      : 'Solid commitment to tracking and mindful choices today.';
    const focus = data.focus
      ? String(data.focus).trim().slice(0, 160)
      : 'Aim for a balanced whole-food source to hit your upcoming targets.';

    const cardData: DayReviewCardData = {
      caloriesConsumed,
      calorieTarget,
      proteinConsumed,
      proteinTarget,
      carbsConsumed,
      carbsTarget,
      fatConsumed,
      fatTarget,
      win,
      focus,
    };

    return { type: 'day_review', data: cardData };
  }

  /**
   * Builds PlanChangeCardData enforcing clinical safety floor and minor protection.
   */
  private static buildPlanChangeCard(
    data: any,
    userGoals?: Partial<UserGoals>
  ): RiaCard | null {
    // 1. Minors (13 to 17) must NEVER get plan change cards (RIA_Chat.md section 10, 11)
    const age = userGoals?.age;
    if (typeof age === 'number' && age < 18) {
      return null;
    }

    const currentCalories = Math.round(userGoals?.dailyCalorieBudget || 2000);
    const currentProtein = Math.round(userGoals?.targetProtein || 120);
    const currentCarbs = Math.round(userGoals?.targetCarbs || 220);
    const currentFat = Math.round(userGoals?.targetFat || 65);

    const isFemale = userGoals?.gender?.toLowerCase() === 'female';
    const floor = isFemale ? 1200 : 1500;

    let targetCalories = Math.round(Number(data.calories) || currentCalories);

    // 2. Calorie Safety Floor Check
    if (targetCalories < floor) {
      return null; // Reject sub-floor proposals completely
    }

    // 3. Max 15% change per step guardrail
    const maxChange = currentCalories * 0.15;
    if (Math.abs(targetCalories - currentCalories) > maxChange) {
      targetCalories =
        targetCalories > currentCalories
          ? Math.round(currentCalories + maxChange)
          : Math.round(currentCalories - maxChange);
    }

    const protein = Math.round(Number(data.protein) || currentProtein);
    const carbs = Math.round(Number(data.carbs) || currentCarbs);
    const fat = Math.round(Number(data.fat) || currentFat);
    const reason = String(data.reason || 'Personalized plan optimization').trim().slice(0, 140);

    const cardData: PlanChangeCardData = {
      calories: targetCalories,
      protein,
      carbs,
      fat,
      currentCalories,
      currentProtein,
      currentCarbs,
      currentFat,
      reason,
      state: 'proposed',
    };

    return { type: 'plan_change', data: cardData };
  }
}
