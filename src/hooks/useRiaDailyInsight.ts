import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyLog, UserGoals, LoggedMealItem } from '@/types';
import { AIService } from '@/services/ai';
import { NutritionContextBuilder } from '@/services/ai/context/NutritionContextBuilder';

interface RiaDailyInsightParams {
  userId: string;
  selectedDate: string;
  userGoals: UserGoals;
  currentLog: DailyLog;
  totalProtein: number;
  remainingCalories: number;
}

interface CachedInsight {
  fingerprint: string;
  insight: string;
}

const DEBOUNCE_MS = 750;

const getCacheKey = (userId: string, selectedDate: string) =>
  `@calori_ria_daily_insight_${encodeURIComponent(userId)}_${selectedDate}`;

export const useRiaDailyInsight = ({
  userId,
  selectedDate,
  userGoals,
  currentLog,
  totalProtein,
  remainingCalories,
}: RiaDailyInsightParams): string | null => {
  const [insight, setInsight] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  // Water and step edits intentionally do not participate in this key. The local
  // fallback remains live, while AI generation is reserved for meaningful changes.
  const fingerprint = useMemo(
    () =>
      JSON.stringify({
        userId,
        selectedDate,
        name: userGoals.name || '',
        riaTone: userGoals.riaTone || 'supportive',
        dailyCalorieBudget: userGoals.dailyCalorieBudget,
        targetProtein: userGoals.targetProtein,
        targetCarbs: userGoals.targetCarbs,
        targetFat: userGoals.targetFat,
        targetWaterMl: userGoals.waterGoalMl,
        stepGoal: userGoals.stepGoal,
        struggles: userGoals.struggles,
        foodStyle: userGoals.foodStyle,
        pace: userGoals.pace,
        meals: currentLog.meals.map((meal: LoggedMealItem) => ({
          id: meal.id,
          name: meal.name,
          mealType: meal.mealType,
          calories: meal.calories,
          protein: meal.protein,
        })),
      }),
    [
      userId,
      selectedDate,
      userGoals.name,
      userGoals.riaTone,
      userGoals.dailyCalorieBudget,
      userGoals.targetProtein,
      userGoals.targetCarbs,
      userGoals.targetFat,
      userGoals.waterGoalMl,
      userGoals.stepGoal,
      userGoals.struggles,
      userGoals.foodStyle,
      userGoals.pace,
      currentLog.meals,
    ]
  );

  useEffect(() => {
    let disposed = false;
    const version = ++requestVersionRef.current;
    setInsight(null);
    const timer = setTimeout(async () => {
      const storageKey = getCacheKey(userId, selectedDate);
      try {
        const cachedRaw = await AsyncStorage.getItem(storageKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as CachedInsight;
          if (cached.fingerprint === fingerprint && cached.insight) {
            if (!disposed && version === requestVersionRef.current) setInsight(cached.insight);
            return;
          }
        }

        const isConfigured = await AIService.isKeyConfigured();
        if (!isConfigured || disposed || version !== requestVersionRef.current) return;

        const context = NutritionContextBuilder.createContext({
          userGoals,
          currentLog,
          remainingCalories,
          totalProtein,
        });

        const nextInsight = await AIService.getDailyInsight(
          context,
          `${userId}:${selectedDate}:${fingerprint}`
        );
        if (nextInsight && !disposed && version === requestVersionRef.current) {
          setInsight(nextInsight);
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify({ fingerprint, insight: nextInsight } satisfies CachedInsight)
          );
        }
      } catch {
        // Local fallback remains active when storage, configuration, or AI fails.
      }
    }, DEBOUNCE_MS);

    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [fingerprint]);

  return insight;
};
