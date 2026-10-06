import { useCallback, useMemo } from 'react';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { WorkoutActivity, StepLogEntry } from '@/types';

export interface UseMovementReturn {
  date: string;
  steps: number;
  stepGoal: number;
  barPercent: number;
  actualStepPercent: number;
  isGoalReached: boolean;
  distanceKm: string;
  stepBurnKcal: number;
  activeMinutes: number;
  workoutBurnKcal: number;
  totalBurnKcal: number;
  activities: WorkoutActivity[];
  stepEntries: StepLogEntry[];
  addSteps: (stepsCount: number) => void;
  removeStepEntry: (id: string, date?: string) => void;
  batchUpdateDailySteps: (
    updates: Array<{ dateStr: string; steps: number; records?: any[] }>
  ) => void;
  addWorkout: (name: string, durationMinutes: number, caloriesBurned: number) => void;
  removeWorkout: (id: string) => void;
  setStepGoal: (targetSteps: number) => void;
}

/**
 * Domain-specific hook encapsulating all physical movement tracking,
 * step metrics, burn estimations, workouts, and Health Connect synchronization.
 */
export function useMovement(): UseMovementReturn {
  const {
    currentLog,
    dailyLogs,
    selectedDate,
    addSteps: contextAddSteps,
    removeStepEntry: contextRemoveStepEntry,
    batchUpdateDailySteps: contextBatchUpdateDailySteps,
    addWorkout: contextAddWorkout,
    removeWorkout: contextRemoveWorkout,
  } = useDailyLog();

  const { userGoals, updateGoals } = useGoals();

  const logForDate = dailyLogs?.[selectedDate] || currentLog;
  const steps = logForDate?.steps || 0;
  const stepGoal = userGoals?.stepGoal || 10000;

  const actualStepPercent = useMemo(() => {
    if (stepGoal <= 0) return 0;
    return Math.round((steps / stepGoal) * 100);
  }, [steps, stepGoal]);

  const barPercent = useMemo(() => {
    return Math.min(100, Math.max(0, actualStepPercent));
  }, [actualStepPercent]);

  const isGoalReached = useMemo(() => {
    return steps >= stepGoal && stepGoal > 0;
  }, [steps, stepGoal]);

  const distanceKm = useMemo(() => {
    return (steps * 0.00076).toFixed(1);
  }, [steps]);

  const stepBurnKcal = useMemo(() => {
    return Math.round(steps * 0.04);
  }, [steps]);

  const activeMinutes = useMemo(() => {
    return Math.round(steps / 100);
  }, [steps]);

  const activities = useMemo(() => {
    return Array.isArray(logForDate?.activities) ? logForDate.activities : [];
  }, [logForDate?.activities]);

  const stepEntries = useMemo(() => {
    return Array.isArray(logForDate?.stepEntries) ? logForDate.stepEntries : [];
  }, [logForDate?.stepEntries]);

  const workoutBurnKcal = useMemo(() => {
    return activities.reduce((sum, act) => sum + (act.caloriesBurned || 0), 0);
  }, [activities]);

  const totalBurnKcal = useMemo(() => {
    return stepBurnKcal + workoutBurnKcal;
  }, [stepBurnKcal, workoutBurnKcal]);

  const addSteps = useCallback(
    (stepsCount: number) => {
      contextAddSteps(stepsCount);
    },
    [contextAddSteps]
  );

  const removeStepEntry = useCallback(
    (id: string, date?: string) => {
      contextRemoveStepEntry(id, date ?? selectedDate);
    },
    [contextRemoveStepEntry, selectedDate]
  );

  const batchUpdateDailySteps = useCallback(
    (updates: Array<{ dateStr: string; steps: number; records?: any[] }>) => {
      contextBatchUpdateDailySteps(updates);
    },
    [contextBatchUpdateDailySteps]
  );

  const addWorkout = useCallback(
    (name: string, durationMinutes: number, caloriesBurned: number) => {
      contextAddWorkout(name, durationMinutes, caloriesBurned);
    },
    [contextAddWorkout]
  );

  const removeWorkout = useCallback(
    (id: string) => {
      contextRemoveWorkout(id);
    },
    [contextRemoveWorkout]
  );

  const setStepGoal = useCallback(
    (targetSteps: number) => {
      updateGoals({ stepGoal: Math.max(1000, targetSteps) });
    },
    [updateGoals]
  );

  return {
    date: selectedDate,
    steps,
    stepGoal,
    barPercent,
    actualStepPercent,
    isGoalReached,
    distanceKm,
    stepBurnKcal,
    activeMinutes,
    workoutBurnKcal,
    totalBurnKcal,
    activities,
    stepEntries,
    addSteps,
    removeStepEntry,
    batchUpdateDailySteps,
    addWorkout,
    removeWorkout,
    setStepGoal,
  };
}
