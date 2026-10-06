import { useState, useCallback, useMemo } from 'react';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { WaterLogEntry } from '@/types';

export interface UseHydrationReturn {
  date: string;
  currentWaterMl: number;
  targetWaterMl: number;
  remainingWaterMl: number;
  percentage: number;
  cupSizeMl: number;
  waterEntries: WaterLogEntry[];
  addWater: (amountMl: number, beverageType?: string) => void;
  removeWaterEntry: (entryId: string, date?: string) => void;
  updateWaterEntry: (
    entryId: string,
    updates: Partial<WaterLogEntry> | number,
    date?: string
  ) => void;
  resetWater: () => void;
  setDailyGoal: (targetMl: number) => void;
  setCupSize: (cupMl: number) => void;
}

/**
 * Domain-specific hook encapsulating all hydration tracking,
 * calculations, container volumes, and goal progress.
 */
export function useHydration(): UseHydrationReturn {
  const {
    currentLog,
    dailyLogs,
    selectedDate,
    addWater: contextAddWater,
    removeWaterEntry: contextRemoveWaterEntry,
    updateWaterEntry: contextUpdateWaterEntry,
    resetWater: contextResetWater,
  } = useDailyLog();

  const { userGoals, updateGoals } = useGoals();
  const [cupSizeMl, setCupSizeState] = useState<number>(250);

  const logForDate = dailyLogs?.[selectedDate] || currentLog;
  const currentWaterMl = logForDate?.waterMl || 0;
  const targetWaterMl = userGoals?.waterGoalMl || 2500;

  const percentage = useMemo(() => {
    if (targetWaterMl <= 0) return 0;
    return Math.min(100, Math.round((currentWaterMl / targetWaterMl) * 100));
  }, [currentWaterMl, targetWaterMl]);

  const remainingWaterMl = useMemo(() => {
    return Math.max(0, targetWaterMl - currentWaterMl);
  }, [currentWaterMl, targetWaterMl]);

  const waterEntries = useMemo(() => {
    return logForDate?.waterEntries || [];
  }, [logForDate?.waterEntries]);

  const addWater = useCallback(
    (amountMl: number, beverageType?: string) => {
      contextAddWater(amountMl, beverageType);
    },
    [contextAddWater]
  );

  const removeWaterEntry = useCallback(
    (entryId: string, date?: string) => {
      contextRemoveWaterEntry(entryId, date ?? selectedDate);
    },
    [contextRemoveWaterEntry, selectedDate]
  );

  const updateWaterEntry = useCallback(
    (entryId: string, updates: Partial<WaterLogEntry> | number, date?: string) => {
      const payload: Partial<WaterLogEntry> =
        typeof updates === 'number' ? { amountMl: updates } : updates;
      contextUpdateWaterEntry(entryId, payload, date ?? selectedDate);
    },
    [contextUpdateWaterEntry, selectedDate]
  );

  const resetWater = useCallback(() => {
    contextResetWater();
  }, [contextResetWater]);

  const setDailyGoal = useCallback(
    (targetMl: number) => {
      updateGoals({ waterGoalMl: Math.max(500, targetMl) });
    },
    [updateGoals]
  );

  const setCupSize = useCallback((cupMl: number) => {
    setCupSizeState(Math.max(50, cupMl));
  }, []);

  return {
    date: selectedDate,
    currentWaterMl,
    targetWaterMl,
    remainingWaterMl,
    percentage,
    cupSizeMl,
    waterEntries,
    addWater,
    removeWaterEntry,
    updateWaterEntry,
    resetWater,
    setDailyGoal,
    setCupSize,
  };
}
