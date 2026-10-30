/**
 * RiaDuplicateChecker.ts
 *
 * Prevents double-logging by detecting if a meal with similar name
 * was logged in the same slot within the duplicate window (10 minutes).
 */

import { LoggedMealItem } from '@/types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  minutesAgo?: number;
  matchedMealName?: string;
}

export class RiaDuplicateChecker {
  private static readonly DUPLICATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  static check(
    proposedName: string,
    existingMeals: LoggedMealItem[],
    slot?: string,
    now: number = Date.now()
  ): DuplicateCheckResult {
    if (!proposedName || !existingMeals || existingMeals.length === 0) {
      return { isDuplicate: false };
    }

    const normalizedProposed = proposedName.toLowerCase().trim();

    for (const meal of existingMeals) {
      if (!meal.name || !meal.loggedAt) continue;

      // Slot check if specified
      if (slot && meal.mealType && meal.mealType.toLowerCase() !== slot.toLowerCase()) {
        continue;
      }

      const loggedTime = new Date(meal.loggedAt).getTime();
      if (isNaN(loggedTime)) continue;

      const deltaMs = now - loggedTime;
      if (deltaMs >= 0 && deltaMs <= this.DUPLICATE_WINDOW_MS) {
        const normalizedExisting = meal.name.toLowerCase().trim();
        if (
          normalizedExisting === normalizedProposed ||
          normalizedExisting.includes(normalizedProposed) ||
          normalizedProposed.includes(normalizedExisting)
        ) {
          const minutesAgo = Math.max(1, Math.round(deltaMs / 60000));
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
}
