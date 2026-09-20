export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export interface MacroNutrients {
  calories: number;
  carbs: number;   // grams
  protein: number; // grams
  fat: number;     // grams
  fiber: number;   // grams
}

export interface FoodItem extends MacroNutrients {
  id: string;
  name: string;
  category: 'breads' | 'curries' | 'south_indian' | 'rice' | 'snacks' | 'beverages' | 'fruits' | 'dairy';
  categoryLabel: string;
  servingUnit: string; // e.g., 'piece', 'katori', 'plate', 'cup', '100g'
  defaultServingSize: number;
  icon?: string;
  isCustom?: boolean;
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
}

export interface WorkoutActivity {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  loggedAt: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: LoggedMealItem[];
  waterMl: number;
  steps: number;
  activities: WorkoutActivity[];
}

export interface UserGoals {
  name: string;
  dailyCalorieBudget: number;
  targetCarbs: number;    // grams
  targetProtein: number;  // grams
  targetFat: number;      // grams
  targetFiber: number;    // grams
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


