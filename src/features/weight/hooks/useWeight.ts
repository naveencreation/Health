import { useCallback, useMemo } from 'react';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { WeightLogEntry } from '@/types';
import { getTodayBMICategory, BMICategoryItem } from '../utils/bmiCalculator';

export interface UseWeightReturn {
  date: string;
  unit: 'kg' | 'lbs';
  currentWeightKg: number;
  startWeightKg: number;
  targetWeightKg: number;
  displayCurrentWeight: string;
  displayStartWeight: string;
  displayTargetWeight: string;
  displayDelta: string;
  progressPercent: number;
  deltaKg: number;
  isLoss: boolean;
  isGain: boolean;
  bmi: number;
  bmiCategory: BMICategoryItem;
  weightEntries: WeightLogEntry[];
  logWeight: (
    weightKg: number,
    date?: string,
    note?: string,
    customLoggedAt?: string,
    customId?: string
  ) => void;
  updateWeightEntry: (
    id: string,
    updates: Partial<WeightLogEntry>,
    date?: string,
    newDate?: string
  ) => void;
  deleteWeightEntry: (id: string, date?: string) => void;
  setTargetWeight: (weightKg: number) => void;
  setWeightUnit: (unit: 'kg' | 'lbs') => void;
}

const toDisplayWeight = (kg: number, unit: 'kg' | 'lbs') =>
  unit === 'kg' ? kg : Math.round(kg * 2.20462 * 10) / 10;

/**
 * Domain-specific hook encapsulating weight metrics, BMI calculation,
 * progress toward target weight, delta vs previous weigh-in, and logging actions.
 */
export function useWeight(): UseWeightReturn {
  const {
    currentLog,
    dailyLogs,
    selectedDate,
    logWeight: contextLogWeight,
    updateWeightEntry: contextUpdateWeightEntry,
    deleteWeightEntry: contextDeleteWeightEntry,
  } = useDailyLog();

  const { userGoals, updateGoals } = useGoals();

  const unit: 'kg' | 'lbs' = userGoals.weightUnit === 'lbs' ? 'lbs' : 'kg';

  const logForDate = dailyLogs?.[selectedDate] || currentLog;
  const currentWeightRaw = logForDate?.weightKg ?? userGoals.currentWeightKg ?? 68.0;
  const currentWeightKg = Math.round(currentWeightRaw * 10) / 10;

  const startWeightRaw = userGoals.startWeightKg
    ? userGoals.startWeightKg
    : userGoals.currentWeightKg || 68.0;
  const targetWeightRaw = userGoals.targetWeightKg ? userGoals.targetWeightKg : 65.0;

  const startWeightKg = Math.round(startWeightRaw * 10) / 10;
  const targetWeightKg = Math.round(targetWeightRaw * 10) / 10;

  const displayCurrentWeight = toDisplayWeight(currentWeightKg, unit).toFixed(1);
  const displayStartWeight = toDisplayWeight(startWeightKg, unit).toFixed(1);
  const displayTargetWeight = toDisplayWeight(targetWeightKg, unit).toFixed(1);

  const weightEntries = useMemo(() => {
    return Array.isArray(logForDate?.weightEntries) ? logForDate.weightEntries : [];
  }, [logForDate?.weightEntries]);

  // Delta calculation vs previous entry or previous logged day
  const deltaKg = useMemo(() => {
    if (weightEntries.length > 1) {
      const diff = weightEntries[0].weightKg - weightEntries[1].weightKg;
      return Math.round(diff * 10) / 10;
    }

    const sortedDates = Object.keys(dailyLogs || {})
      .filter(
        d =>
          d < selectedDate &&
          typeof dailyLogs[d]?.weightKg === 'number' &&
          dailyLogs[d]!.weightKg! > 0
      )
      .sort((a, b) => b.localeCompare(a));

    if (sortedDates.length > 0) {
      const prevDayWeight = dailyLogs[sortedDates[0]].weightKg!;
      const diff = currentWeightKg - prevDayWeight;
      return Math.round(diff * 10) / 10;
    }

    const diffFromStart = currentWeightKg - startWeightKg;
    return Math.round(diffFromStart * 10) / 10;
  }, [weightEntries, dailyLogs, selectedDate, currentWeightKg, startWeightKg]);

  const displayDelta = toDisplayWeight(Math.abs(deltaKg), unit).toFixed(1);
  const isLoss = deltaKg < 0;
  const isGain = deltaKg > 0;

  // Progress toward target weight percentage
  const progressPercent = useMemo(() => {
    const totalSpan = Math.abs(startWeightKg - targetWeightKg);
    if (totalSpan === 0) return 100;

    let completed = 0;
    if (startWeightKg >= targetWeightKg) {
      completed = startWeightKg - currentWeightKg;
    } else {
      completed = currentWeightKg - startWeightKg;
    }

    const pct = Math.round((completed / totalSpan) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [startWeightKg, targetWeightKg, currentWeightKg]);

  // BMI and WHO category
  const safeHeight = userGoals.heightCm ?? 178;
  const heightM = safeHeight / 100;
  const bmi = useMemo(() => {
    if (heightM <= 0) return 22.0;
    return Number((currentWeightKg / (heightM * heightM)).toFixed(1));
  }, [currentWeightKg, heightM]);

  const bmiCategory = useMemo(() => {
    return getTodayBMICategory(bmi);
  }, [bmi]);

  const logWeight = useCallback(
    (
      weightKg: number,
      date?: string,
      note?: string,
      customLoggedAt?: string,
      customId?: string
    ) => {
      contextLogWeight(weightKg, date ?? selectedDate, note, customLoggedAt, customId);
    },
    [contextLogWeight, selectedDate]
  );

  const updateWeightEntry = useCallback(
    (id: string, updates: Partial<WeightLogEntry>, date?: string, newDate?: string) => {
      contextUpdateWeightEntry(id, updates, date ?? selectedDate, newDate);
    },
    [contextUpdateWeightEntry, selectedDate]
  );

  const deleteWeightEntry = useCallback(
    (id: string, date?: string) => {
      contextDeleteWeightEntry(id, date ?? selectedDate);
    },
    [contextDeleteWeightEntry, selectedDate]
  );

  const setTargetWeight = useCallback(
    (weightKg: number) => {
      updateGoals({ targetWeightKg: weightKg });
    },
    [updateGoals]
  );

  const setWeightUnit = useCallback(
    (unit: 'kg' | 'lbs') => {
      updateGoals({ weightUnit: unit });
    },
    [updateGoals]
  );

  return {
    date: selectedDate,
    unit,
    currentWeightKg,
    startWeightKg,
    targetWeightKg,
    displayCurrentWeight,
    displayStartWeight,
    displayTargetWeight,
    displayDelta,
    progressPercent,
    deltaKg,
    isLoss,
    isGain,
    bmi,
    bmiCategory,
    weightEntries,
    logWeight,
    updateWeightEntry,
    deleteWeightEntry,
    setTargetWeight,
    setWeightUnit,
  };
}
