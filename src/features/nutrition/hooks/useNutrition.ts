import { useCallback, useMemo } from 'react';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { LoggedMealItem, MealType, FoodItem } from '@/types';

export interface UseNutritionReturn {
  date: string;
  calorieBudget: number;
  caloriesConsumed: number;
  caloriesBurned: number;
  remainingCalories: number;
  netCalories: number;
  caloriePercentage: number;
  isOverBudget: boolean;
  consumedCarbs: number;
  consumedProtein: number;
  consumedFat: number;
  consumedFiber: number;
  targetCarbs: number;
  targetProtein: number;
  targetFat: number;
  targetFiber: number;
  carbsPercent: number;
  proteinPercent: number;
  fatPercent: number;
  fiberPercent: number;
  meals: LoggedMealItem[];
  mealsByType: Record<MealType, LoggedMealItem[]>;
  mealCalories: Record<MealType, number>;
  addMealItem: (mealType: MealType, food: FoodItem, quantity: number) => LoggedMealItem;
  removeMealItem: (mealId: string) => void;
  updateMealQuantity: (mealId: string, quantity: number) => void;
  setCalorieBudget: (budget: number) => void;
  setMacroTargets: (targets: {
    targetCarbs?: number;
    targetProtein?: number;
    targetFat?: number;
    targetFiber?: number;
  }) => void;
}

/**
 * Domain-specific hook encapsulating calorie tracking, macro distribution,
 * remaining allowance math, and meal item mutations.
 */
export function useNutrition(): UseNutritionReturn {
  const {
    currentLog,
    dailyLogs,
    selectedDate,
    totalConsumed,
    totalBurned,
    remainingCalories: contextRemainingCalories,
    totalCarbs,
    totalProtein,
    totalFat,
    totalFiber,
    mealsByType,
    mealCalories,
    addMealItem: contextAddMealItem,
    removeMealItem: contextRemoveMealItem,
    updateMealQuantity: contextUpdateMealQuantity,
  } = useDailyLog();

  const goalsContext = typeof useGoals === 'function' ? useGoals() : undefined;
  const userGoals = goalsContext?.userGoals;
  const updateGoals = goalsContext?.updateGoals || (() => {});

  const logForDate = dailyLogs?.[selectedDate] || currentLog;
  const calorieBudget = userGoals?.dailyCalorieBudget || 2000;
  const caloriesConsumed = totalConsumed ?? 0;
  const caloriesBurned = totalBurned ?? 0;
  const remainingCalories = contextRemainingCalories ?? (calorieBudget - caloriesConsumed + caloriesBurned);
  const netCalories = caloriesConsumed - caloriesBurned;

  const caloriePercentage = useMemo(() => {
    if (calorieBudget <= 0) return 0;
    return Math.min(100, Math.round((caloriesConsumed / calorieBudget) * 100));
  }, [caloriesConsumed, calorieBudget]);

  const isOverBudget = useMemo(() => {
    return caloriesConsumed > calorieBudget + caloriesBurned;
  }, [caloriesConsumed, calorieBudget, caloriesBurned]);

  const consumedCarbs = totalCarbs ?? 0;
  const consumedProtein = totalProtein ?? 0;
  const consumedFat = totalFat ?? 0;
  const consumedFiber = totalFiber ?? 0;

  const targetCarbs = userGoals?.targetCarbs || 250;
  const targetProtein = userGoals?.targetProtein || 65;
  const targetFat = userGoals?.targetFat || 65;
  const targetFiber = userGoals?.targetFiber || 30;

  const carbsPercent = useMemo(() => {
    if (targetCarbs <= 0) return 0;
    return Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100));
  }, [consumedCarbs, targetCarbs]);

  const proteinPercent = useMemo(() => {
    if (targetProtein <= 0) return 0;
    return Math.min(100, Math.round((consumedProtein / targetProtein) * 100));
  }, [consumedProtein, targetProtein]);

  const fatPercent = useMemo(() => {
    if (targetFat <= 0) return 0;
    return Math.min(100, Math.round((consumedFat / targetFat) * 100));
  }, [consumedFat, targetFat]);

  const fiberPercent = useMemo(() => {
    if (targetFiber <= 0) return 0;
    return Math.min(100, Math.round((consumedFiber / targetFiber) * 100));
  }, [consumedFiber, targetFiber]);

  const meals = useMemo(() => {
    return Array.isArray(logForDate?.meals) ? logForDate.meals : [];
  }, [logForDate?.meals]);

  const addMealItem = useCallback(
    (mealType: MealType, food: FoodItem, quantity: number) => {
      return contextAddMealItem(mealType, food, quantity);
    },
    [contextAddMealItem]
  );

  const removeMealItem = useCallback(
    (mealId: string) => {
      contextRemoveMealItem(mealId);
    },
    [contextRemoveMealItem]
  );

  const updateMealQuantity = useCallback(
    (mealId: string, quantity: number) => {
      contextUpdateMealQuantity(mealId, quantity);
    },
    [contextUpdateMealQuantity]
  );

  const setCalorieBudget = useCallback(
    (budget: number) => {
      updateGoals({ dailyCalorieBudget: Math.max(500, budget) });
    },
    [updateGoals]
  );

  const setMacroTargets = useCallback(
    (targets: {
      targetCarbs?: number;
      targetProtein?: number;
      targetFat?: number;
      targetFiber?: number;
    }) => {
      updateGoals(targets);
    },
    [updateGoals]
  );

  return {
    date: selectedDate,
    calorieBudget,
    caloriesConsumed,
    caloriesBurned,
    remainingCalories,
    netCalories,
    caloriePercentage,
    isOverBudget,
    consumedCarbs,
    consumedProtein,
    consumedFat,
    consumedFiber,
    targetCarbs,
    targetProtein,
    targetFat,
    targetFiber,
    carbsPercent,
    proteinPercent,
    fatPercent,
    fiberPercent,
    meals,
    mealsByType,
    mealCalories,
    addMealItem,
    removeMealItem,
    updateMealQuantity,
    setCalorieBudget,
    setMacroTargets,
  };
}
