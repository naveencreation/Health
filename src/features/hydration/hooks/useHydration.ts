import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDailyLog, useGoals, useAuth } from '@/context/HealthContext';
import { WaterLogEntry } from '@/types';
import { BIOMETRIC_DEFAULTS, HYDRATION_DEFAULTS } from '@/constants/biometricDefaults';
import { ScopedStorage } from '@/services/storage/scopedStorage';

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
  const authContext = typeof useAuth === 'function' ? useAuth() : undefined;
  const currentUserId = authContext?.currentUser?.id;

  const [cupSizeMl, setCupSizeState] = useState<number>(HYDRATION_DEFAULTS.defaultCupSizeMl);

  useEffect(() => {
    let isMounted = true;
    ScopedStorage.getItem<number>(
      'water_cup_pref',
      currentUserId,
      HYDRATION_DEFAULTS.defaultCupSizeMl
    ).then(val => {
      if (isMounted && typeof val === 'number') {
        setCupSizeState(val);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const logForDate = dailyLogs?.[selectedDate] || currentLog;
  const currentWaterMl = logForDate?.waterMl || 0;
  const targetWaterMl = userGoals?.waterGoalMl || BIOMETRIC_DEFAULTS.waterGoalMl;

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

  const setCupSize = useCallback(
    (cupMl: number) => {
      const valid = Math.max(50, cupMl);
      setCupSizeState(valid);
      ScopedStorage.setItem('water_cup_pref', valid, currentUserId).catch(() => {});
    },
    [currentUserId]
  );

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
