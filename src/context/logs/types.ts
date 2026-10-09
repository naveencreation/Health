import {
  DailyLog,
  FoodItem,
  LoggedMealItem,
  MealType,
  WaterLogEntry,
  WeightLogEntry,
  WeeklyTrendItem,
} from '@/types';

export interface DailyLogContextValue {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  shiftDate: (days: number) => void;
  dailyLogs: Record<string, DailyLog>;
  currentLog: DailyLog;
  totalConsumed: number;
  totalBurned: number;
  remainingCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  mealsByType: Record<MealType, LoggedMealItem[]>;
  mealCalories: Record<MealType, number>;
  addMealItem: (mealType: MealType, food: FoodItem, quantity: number) => LoggedMealItem;
  removeMealItem: (mealId: string) => void;
  updateMealQuantity: (mealId: string, quantity: number) => void;
  addWater: (ml: number, beverageType?: string) => void;
  removeWaterEntry: (id: string, date?: string) => void;
  updateWaterEntry: (id: string, updates: Partial<WaterLogEntry>, date?: string) => void;
  resetWater: () => void;
  addWorkout: (name: string, durationMinutes: number, caloriesBurned: number) => void;
  removeWorkout: (id: string) => void;
  addSteps: (stepsCount: number) => void;
  removeStepEntry: (id: string, date?: string) => void;
  batchUpdateDailySteps: (
    updates: Array<{ dateStr: string; steps: number; records?: unknown[] }>
  ) => void;
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
}

export interface AnalyticsContextValue {
  weeklyLogs: WeeklyTrendItem[];
  dailyLogs: Record<string, DailyLog>;
}
