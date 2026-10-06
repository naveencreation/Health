/**
 * RiaDuplicateChecker.ts
 *
 * Implements the 10-minute recent meal duplicate check per RIA_Chat.md sections 7 & 12:
 * "Duplicate check against the last 10 minutes: 'You logged this 5 min ago. Add again?'."
 */

import { LoggedMealItem } from '@/types';
import { LoggedMealContextItem } from '../types/ai.types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  minutesAgo?: number;
  matchedMealName?: string;
}

export class RiaDuplicateChecker {
  /**
   * Checks whether a candidate meal item matches any meal logged within the last thresholdMinutes (default 10).
   *
   * @param candidateName Name of food being proposed (e.g. "Masala Dosa", "Filter Coffee")
   * @param recentMeals Meals from active DailyLog or recent meal context
   * @param slot Optional slot to check ('breakfast', 'lunch', 'dinner', 'snack')
   * @param now Current timestamp in ms (defaults to Date.now())
   * @param thresholdMinutes Max age in minutes to consider a duplicate (default 10)
   */
  public static check(
    candidateName: string,
    recentMeals: Array<LoggedMealItem | LoggedMealContextItem | any>,
    slot?: string,
    now: number = Date.now(),
    thresholdMinutes: number = 10
  ): DuplicateCheckResult {
    if (
      !candidateName ||
      !candidateName.trim() ||
      !Array.isArray(recentMeals) ||
      recentMeals.length === 0
    ) {
      return { isDuplicate: false };
    }

    const cleanCandidate = this.normalize(candidateName);
    if (!cleanCandidate) return { isDuplicate: false };

    const thresholdMs = thresholdMinutes * 60 * 1000;

    for (const meal of recentMeals) {
      if (!meal || !meal.name) continue;

      // Slot filter if provided (matching 'snack' with 'snacks')
      if (slot && meal.mealType) {
        const slotA = slot.toLowerCase().replace(/s$/, '');
        const slotB = meal.mealType.toLowerCase().replace(/s$/, '');
        if (slotA !== slotB) continue;
      }

      // Determine timestamp
      const mealTimestamp = this.resolveTimestamp(meal);
      if (!mealTimestamp) continue;

      const diffMs = now - mealTimestamp;
      if (diffMs >= 0 && diffMs <= thresholdMs) {
        const cleanExisting = this.normalize(meal.name);
        if (this.isMatch(cleanCandidate, cleanExisting)) {
          const minutesAgo = Math.max(1, Math.round(diffMs / (60 * 1000)));
          return {
            isDuplicate: true,
            minutesAgo,
            matchedMealName: meal.name,
          };
        }
      }
    }

    return { isDuplicate: false };
  }

  private static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static isMatch(a: string, b: string): boolean {
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
    const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return false;
    let common = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) common++;
    }
    return common >= Math.min(wordsA.size, wordsB.size);
  }

  private static resolveTimestamp(meal: any): number | null {
    if (typeof meal.loggedAt === 'number') return meal.loggedAt;
    if (typeof meal.loggedAt === 'string') {
      const parsed = new Date(meal.loggedAt).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    if (typeof meal.createdAt === 'number') return meal.createdAt;
    if (typeof meal.time === 'number') return meal.time;
    if (typeof meal.time === 'string') {
      const parsed = new Date(meal.time).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }
}
