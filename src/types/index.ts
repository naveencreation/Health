export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export interface MacroNutrients {
  calories: number;
  carbs: number; // grams
  protein: number; // grams
  fat: number; // grams
  fiber: number; // grams
}

export interface FoodItem extends MacroNutrients {
  id: string;
  name: string;
  category:
    'breads' | 'curries' | 'south_indian' | 'rice' | 'snacks' | 'beverages' | 'fruits' | 'dairy';
  categoryLabel: string;
  servingUnit: string; // e.g., 'piece', 'katori', 'plate', 'cup', '100g'
  defaultServingSize: number;
  icon?: string;
  imageUrl?: string;
  isCustom?: boolean;
  description?: string;
  badge?: string;
}

export interface LoggedMealItem {
  id: string;
  foodId: string;
  name: string;
  mealType: MealType;
  servingUnit: string;
  quantity: number; // multiplier of defaultServingSize
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  loggedAt: string; // ISO string
  imageUrl?: string;
}

export interface WorkoutActivity {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  loggedAt: string;
}

export interface WaterLogEntry {
  id: string;
  amountMl: number;
  beverageType: string;
  loggedAt: string;
}

export interface WeightLogEntry {
  id: string;
  weightKg: number;
  loggedAt: string;
  note?: string;
}

export interface StepLogEntry {
  id: string;
  steps: number;
  durationMinutes: number;
  caloriesBurned: number;
  distanceKm: number;
  loggedAt: string; // ISO string
  startTime?: string;
  endTime?: string;
  source?: 'health_connect' | 'manual' | 'synthetic';
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: LoggedMealItem[];
  waterMl: number;
  steps: number;
  activities: WorkoutActivity[];
  waterEntries?: WaterLogEntry[];
  weightKg?: number;
  weightEntries?: WeightLogEntry[];
  stepEntries?: StepLogEntry[];
  fiberG?: number;
}

export interface UserGoals {
  name: string;
  dailyCalorieBudget: number;
  targetCarbs: number; // grams
  targetProtein: number; // grams
  targetFat: number; // grams
  targetFiber: number; // grams
  waterGoalMl: number;
  stepGoal: number;
  currentWeightKg: number;
  targetWeightKg: number;
  streakDays: number;
  avatarUrl?: string;
  age?: number;
  gender?: string;
  goal?: string;
  weightUnit?: 'kg' | 'lbs';
  heightCm?: number;
  startWeightKg?: number;
  riaTone?: 'supportive' | 'focused' | 'scientific';
  waterReminder?: boolean;
  mealReminder?: boolean;
  stepReminder?: boolean;
  struggles?: string[];
  foodStyle?: string;
  pace?: string;
  goalIntent?: string;
  activityLevel?: string;
  skipsBreakfast?: boolean;
  snacks?: boolean;
}

export interface WeeklyTrendItem {
  date: string;
  dayName: string;
  calories: number;
  target: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  waterMl: number;
  steps: number;
  burned: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isGuest?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  age?: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  goal?: string;
  gender?: string;
  heightCm?: number;
}
