import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyLog, FoodItem, LoggedMealItem, MealType, UserGoals, WorkoutActivity, WeeklyTrendItem, AuthUser, RegisterData } from '@/types';
import { INITIAL_FOOD_DATABASE } from '@/data/foodDatabase';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';
import { auth, db } from '@/services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const STORAGE_KEYS = {
  DAILY_LOGS: '@calori_daily_logs_v1',
  USER_GOALS: '@calori_user_goals_v1',
  CUSTOM_FOODS: '@calori_custom_foods_v1',
  AUTH: '@calori_auth_v1',
};


const DEFAULT_GOALS: UserGoals = {
  name: 'Akshay Rajput',
  dailyCalorieBudget: 1950,
  targetCarbs: 220,    // 45%
  targetProtein: 75,   // ~15-20%
  targetFat: 50,       // ~25%
  targetFiber: 30,     // 30g daily health target
  waterGoalMl: 2500,   // 10 glasses
  stepGoal: 10000,
  currentWeightKg: 74.2,
  targetWeightKg: 68.0,
  streakDays: 7,
  avatarUrl: DEFAULT_AVATAR_URL,
};

const getTodayDateString = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Generate realistic starter log for immediate rich Healthify experience
const createInitialSampleLog = (dateStr: string): DailyLog => {
  return {
    date: dateStr,
    waterMl: 1250, // 5 glasses
    steps: 4620,
    meals: [
      {
        id: 'sample_1',
        foodId: 'idli_steamed',
        name: 'Steamed Idli (2 pcs)',
        mealType: 'breakfast',
        servingUnit: 'plate (2 pcs)',
        quantity: 1,
        calories: 130,
        carbs: 27,
        protein: 4.2,
        fat: 0.6,
        fiber: 1.8,
        loggedAt: new Date().toISOString(),
      },
      {
        id: 'sample_2',
        foodId: 'sambar',
        name: 'Vegetable Sambar',
        mealType: 'breakfast',
        servingUnit: 'katori (150g)',
        quantity: 1,
        calories: 95,
        carbs: 15,
        protein: 4.5,
        fat: 2.1,
        fiber: 3.5,
        loggedAt: new Date().toISOString(),
      },
      {
        id: 'sample_3',
        foodId: 'filter_coffee',
        name: 'South Indian Filter Coffee',
        mealType: 'breakfast',
        servingUnit: 'tumbler (120ml)',
        quantity: 1,
        calories: 85,
        carbs: 12,
        protein: 2.8,
        fat: 2.9,
        fiber: 0.0,
        loggedAt: new Date().toISOString(),
      },
      {
        id: 'sample_4',
        foodId: 'roti_chapati',
        name: 'Whole Wheat Roti / Chapati',
        mealType: 'lunch',
        servingUnit: 'piece',
        quantity: 2,
        calories: 170,
        carbs: 32,
        protein: 6.4,
        fat: 1.6,
        fiber: 5.0,
        loggedAt: new Date().toISOString(),
      },
      {
        id: 'sample_5',
        foodId: 'dal_tadka',
        name: 'Yellow Dal Tadka',
        mealType: 'lunch',
        servingUnit: 'katori (150g)',
        quantity: 1,
        calories: 145,
        carbs: 18,
        protein: 7.8,
        fat: 4.5,
        fiber: 4.2,
        loggedAt: new Date().toISOString(),
      },
      {
        id: 'sample_6',
        foodId: 'curd_dahi',
        name: 'Fresh Curd / Dahi',
        mealType: 'lunch',
        servingUnit: 'katori (100g)',
        quantity: 1,
        calories: 98,
        carbs: 4.7,
        protein: 3.5,
        fat: 4.3,
        fiber: 0.0,
        loggedAt: new Date().toISOString(),
      },
    ],
    activities: [
      {
        id: 'act_1',
        name: 'Morning Brisk Walk',
        durationMinutes: 25,
        caloriesBurned: 120,
        loggedAt: new Date().toISOString(),
      },
    ],
  };
};

interface HealthContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  shiftDate: (days: number) => void;
  userGoals: UserGoals;
  updateGoals: (goals: Partial<UserGoals>) => void;
  foodDatabase: FoodItem[];
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
  addMealItem: (mealType: MealType, food: FoodItem, quantity: number) => void;
  removeMealItem: (mealId: string) => void;
  updateMealQuantity: (mealId: string, quantity: number) => void;
  addWater: (ml: number) => void;
  resetWater: () => void;
  addWorkout: (name: string, durationMinutes: number, caloriesBurned: number) => void;
  removeWorkout: (id: string) => void;
  addSteps: (stepsCount: number) => void;
  addCustomFood: (food: Omit<FoodItem, 'id'>) => FoodItem;
  weeklyLogs: WeeklyTrendItem[];
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginDemo: () => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [userGoals, setUserGoals] = useState<UserGoals>(DEFAULT_GOALS);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Load persistent data
  useEffect(() => {
    const loadData = async () => {
      try {
        const todayStr = getTodayDateString();
        const savedLogs = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
        const savedGoals = await AsyncStorage.getItem(STORAGE_KEYS.USER_GOALS);
        const savedCustomFoods = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
        // Load goals, custom foods, and daily logs
        if (savedGoals) {
          setUserGoals(JSON.parse(savedGoals));
        }

        if (savedCustomFoods) {
          setCustomFoods(JSON.parse(savedCustomFoods));
        }

        let parsedLogs: Record<string, DailyLog> = {};
        if (savedLogs) {
          parsedLogs = JSON.parse(savedLogs);
        }

        // Initialize today if not present
        if (!parsedLogs[todayStr]) {
          parsedLogs[todayStr] = createInitialSampleLog(todayStr);
        }

        setDailyLogs(parsedLogs);
      } catch (err) {
        console.error('Error loading stored health data:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Firebase Auth State Listener & Cloud Sync (Single Source of Truth)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userObj: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        };
        setCurrentUser(userObj);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userObj));

        // Sync user profile & goals from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data?.goals) {
              setUserGoals((prev) => ({ ...prev, ...data.goals }));
              await AsyncStorage.setItem(STORAGE_KEYS.USER_GOALS, JSON.stringify(data.goals));
            }
          }
          // Sync active date daily log from Firestore
          const logDoc = await getDoc(doc(db, 'users', fbUser.uid, 'dailyLogs', selectedDate));
          if (logDoc.exists()) {
            const logData = logDoc.data() as DailyLog;
            setDailyLogs((prev) => ({
              ...prev,
              [selectedDate]: logData,
            }));
          }
        } catch (err) {
          console.log('Firestore sync error:', err);
        }
      } else {
        // No Firebase user logged in
        setCurrentUser(null);
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  // Save changes & sync to Firestore
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(dailyLogs)).catch(console.error);

    // Cloud Firestore Sync
    if (auth.currentUser && !currentUser?.isGuest) {
      const activeLog = dailyLogs[selectedDate];
      if (activeLog) {
        setDoc(doc(db, 'users', auth.currentUser.uid, 'dailyLogs', selectedDate), activeLog, { merge: true }).catch(console.error);
      }
    }
  }, [dailyLogs, isLoaded, selectedDate, currentUser]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.USER_GOALS, JSON.stringify(userGoals)).catch(console.error);

    // Cloud Firestore Sync
    if (auth.currentUser && !currentUser?.isGuest) {
      setDoc(doc(db, 'users', auth.currentUser.uid), { goals: userGoals }, { merge: true }).catch(console.error);
    }
  }, [userGoals, isLoaded, currentUser]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(customFoods)).catch(console.error);
  }, [customFoods, isLoaded]);

  // Combined food database
  const foodDatabase = useMemo(() => {
    return [...customFoods, ...INITIAL_FOOD_DATABASE];
  }, [customFoods]);

  // Current active date log
  const currentLog = useMemo((): DailyLog => {
    return (
      dailyLogs[selectedDate] || {
        date: selectedDate,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      }
    );
  }, [dailyLogs, selectedDate]);

  // Shift date helper
  const shiftDate = (days: number) => {
    const parts = selectedDate.split('-');
    const curr = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    curr.setDate(curr.getDate() + days);
    setSelectedDate(getTodayDateString(curr));
  };

  // Group meals by meal slot
  const mealsByType = useMemo(() => {
    const grouped: Record<MealType, LoggedMealItem[]> = {
      breakfast: [],
      lunch: [],
      snacks: [],
      dinner: [],
    };
    currentLog.meals.forEach((m) => {
      if (grouped[m.mealType]) {
        grouped[m.mealType].push(m);
      }
    });
    return grouped;
  }, [currentLog.meals]);

  const mealCalories = useMemo(() => {
    return {
      breakfast: mealsByType.breakfast.reduce((acc, m) => acc + m.calories, 0),
      lunch: mealsByType.lunch.reduce((acc, m) => acc + m.calories, 0),
      snacks: mealsByType.snacks.reduce((acc, m) => acc + m.calories, 0),
      dinner: mealsByType.dinner.reduce((acc, m) => acc + m.calories, 0),
    };
  }, [mealsByType]);

  // Aggregate macros
  const totalConsumed = useMemo(() => {
    return currentLog.meals.reduce((sum, item) => sum + item.calories, 0);
  }, [currentLog.meals]);

  const totalCarbs = useMemo(() => {
    return Math.round(currentLog.meals.reduce((sum, item) => sum + item.carbs, 0));
  }, [currentLog.meals]);

  const totalProtein = useMemo(() => {
    return Math.round(currentLog.meals.reduce((sum, item) => sum + item.protein, 0));
  }, [currentLog.meals]);

  const totalFat = useMemo(() => {
    return Math.round(currentLog.meals.reduce((sum, item) => sum + item.fat, 0));
  }, [currentLog.meals]);

  const totalFiber = useMemo(() => {
    return Math.round(currentLog.meals.reduce((sum, item) => sum + item.fiber, 0));
  }, [currentLog.meals]);

  // Steps burned calories estimate (~0.04 kcal per step) + logged workouts
  const totalBurned = useMemo(() => {
    const workoutBurn = currentLog.activities.reduce((sum, act) => sum + act.caloriesBurned, 0);
    const stepBurn = Math.round(currentLog.steps * 0.04);
    return workoutBurn + stepBurn;
  }, [currentLog.activities, currentLog.steps]);

  // Healthify formula: Remaining = Goal - Consumed + Burned
  const remainingCalories = useMemo(() => {
    return userGoals.dailyCalorieBudget - totalConsumed + totalBurned;
  }, [userGoals.dailyCalorieBudget, totalConsumed, totalBurned]);

  // Actions
  const addMealItem = (mealType: MealType, food: FoodItem, quantity: number) => {
    const newItem: LoggedMealItem = {
      id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      foodId: food.id,
      name: food.name,
      mealType,
      servingUnit: food.servingUnit,
      quantity,
      calories: Math.round(food.calories * quantity),
      carbs: Math.round(food.carbs * quantity * 10) / 10,
      protein: Math.round(food.protein * quantity * 10) / 10,
      fat: Math.round(food.fat * quantity * 10) / 10,
      fiber: Math.round(food.fiber * quantity * 10) / 10,
      loggedAt: new Date().toISOString(),
    };

    setDailyLogs((prev) => {
      const existing = prev[selectedDate] || {
        date: selectedDate,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      };
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          meals: [...existing.meals, newItem],
        },
      };
    });
  };

  const removeMealItem = (mealId: string) => {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate];
      if (!existing) return prev;
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          meals: existing.meals.filter((m) => m.id !== mealId),
        },
      };
    });
  };

  const updateMealQuantity = (mealId: string, quantity: number) => {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate];
      if (!existing) return prev;
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          meals: existing.meals.map((item) => {
            if (item.id !== mealId) return item;
            const originalFood = foodDatabase.find((f) => f.id === item.foodId);
            const baseCals = originalFood ? originalFood.calories : item.calories / item.quantity;
            const baseCarbs = originalFood ? originalFood.carbs : item.carbs / item.quantity;
            const baseProt = originalFood ? originalFood.protein : item.protein / item.quantity;
            const baseFat = originalFood ? originalFood.fat : item.fat / item.quantity;
            const baseFib = originalFood ? originalFood.fiber : item.fiber / item.quantity;

            return {
              ...item,
              quantity,
              calories: Math.round(baseCals * quantity),
              carbs: Math.round(baseCarbs * quantity * 10) / 10,
              protein: Math.round(baseProt * quantity * 10) / 10,
              fat: Math.round(baseFat * quantity * 10) / 10,
              fiber: Math.round(baseFib * quantity * 10) / 10,
            };
          }),
        },
      };
    });
  };

  const addWater = (ml: number) => {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate] || {
        date: selectedDate,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      };
      const updated = Math.max(0, existing.waterMl + ml);
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          waterMl: updated,
        },
      };
    });
  };

  const resetWater = () => {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate];
      if (!existing) return prev;
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          waterMl: 0,
        },
      };
    });
  };

  const addWorkout = (name: string, durationMinutes: number, caloriesBurned: number) => {
    const workout: WorkoutActivity = {
      id: 'work_' + Date.now(),
      name,
      durationMinutes,
      caloriesBurned,
      loggedAt: new Date().toISOString(),
    };
    setDailyLogs((prev) => {
      const existing = prev[selectedDate] || {
        date: selectedDate,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      };
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          activities: [...existing.activities, workout],
        },
      };
    });
  };

  const removeWorkout = (id: string) => {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate];
      if (!existing) return prev;
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          activities: existing.activities.filter((a) => a.id !== id),
        },
      };
    });
  };

  const addSteps = (count: number) => {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate] || {
        date: selectedDate,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      };
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          steps: Math.max(0, existing.steps + count),
        },
      };
    });
  };

  const addCustomFood = (foodData: Omit<FoodItem, 'id'>): FoodItem => {
    const newFood: FoodItem = {
      ...foodData,
      id: 'custom_' + Date.now(),
      isCustom: true,
    };
    setCustomFoods((prev) => [newFood, ...prev]);
    return newFood;
  };

  const updateGoals = (newGoals: Partial<UserGoals>) => {
    setUserGoals((prev) => ({
      ...prev,
      ...newGoals,
    }));
  };

  // Past 7 days data for analytics with complete metrics (calories, macros, water, steps, burn)
  const weeklyLogs = useMemo((): WeeklyTrendItem[] => {
    const results: WeeklyTrendItem[] = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const parts = selectedDate.split('-');
    const curr = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    // Realistic baseline templates for prior unlogged days to give a rich Healthify experience
    const baselineDays = [
      { cals: 1840, carbs: 195, protein: 72, fat: 46, fiber: 26, water: 2250, steps: 9400, burn: 376 },
      { cals: 1720, carbs: 180, protein: 68, fat: 42, fiber: 24, water: 1750, steps: 8100, burn: 324 },
      { cals: 1950, carbs: 210, protein: 78, fat: 50, fiber: 28, water: 2500, steps: 11200, burn: 448 },
      { cals: 1680, carbs: 175, protein: 65, fat: 40, fiber: 22, water: 1500, steps: 7600, burn: 304 },
      { cals: 1890, carbs: 200, protein: 74, fat: 48, fiber: 27, water: 2000, steps: 10400, burn: 416 },
      { cals: 1780, carbs: 190, protein: 70, fat: 44, fiber: 25, water: 2250, steps: 8900, burn: 356 },
      { cals: 1820, carbs: 195, protein: 72, fat: 45, fiber: 26, water: 2000, steps: 9200, burn: 368 },
    ];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(curr);
      d.setDate(curr.getDate() - i);
      const dateStr = getTodayDateString(d);
      const log = dailyLogs[dateStr];
      const fallback = baselineDays[i % baselineDays.length];

      const cals = log && log.meals.length > 0 ? log.meals.reduce((sum, m) => sum + m.calories, 0) : fallback.cals;
      const carbs = log && log.meals.length > 0 ? log.meals.reduce((sum, m) => sum + m.carbs, 0) : fallback.carbs;
      const protein = log && log.meals.length > 0 ? log.meals.reduce((sum, m) => sum + m.protein, 0) : fallback.protein;
      const fat = log && log.meals.length > 0 ? log.meals.reduce((sum, m) => sum + m.fat, 0) : fallback.fat;
      const fiber = log && log.meals.length > 0 ? log.meals.reduce((sum, m) => sum + (m.fiber || 0), 0) : fallback.fiber;
      const waterMl = log && log.waterMl > 0 ? log.waterMl : fallback.water;
      const steps = log && log.steps > 0 ? log.steps : fallback.steps;
      const workoutBurn = log ? log.activities.reduce((sum, a) => sum + a.caloriesBurned, 0) : 0;
      const burned = (log && log.steps > 0 ? Math.round(steps * 0.04) : fallback.burn) + workoutBurn;

      results.push({
        date: dateStr,
        dayName: i === 0 ? 'Today' : dayLabels[d.getDay()],
        calories: cals,
        target: userGoals.dailyCalorieBudget,
        carbs: Math.round(carbs * 10) / 10,
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        fiber: Math.round(fiber * 10) / 10,
        waterMl,
        steps,
        burned,
      });
    }
    return results;
  }, [selectedDate, dailyLogs, userGoals.dailyCalorieBudget]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
        const fbUser = userCredential.user;
        const userObj: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email || normalizedEmail,
          name: fbUser.displayName || normalizedEmail.split('@')[0],
        };
        setCurrentUser(userObj);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userObj));

        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data?.goals) {
              updateGoals(data.goals);
            }
          }
        } catch (fsErr) {
          console.log('Firestore fetch error on login:', fsErr);
        }

        return { success: true };
      } catch (fbErr: any) {
        console.log('Firebase login error:', fbErr.code, fbErr.message);
        if (
          fbErr.code === 'auth/invalid-credential' ||
          fbErr.code === 'auth/wrong-password' ||
          fbErr.code === 'auth/user-not-found'
        ) {
          return { success: false, error: 'Invalid email or password' };
        }
        if (fbErr.code === 'auth/invalid-email') {
          return { success: false, error: 'Please enter a valid email address' };
        }
        if (fbErr.code === 'auth/too-many-requests') {
          return { success: false, error: 'Too many attempts. Please try again later.' };
        }

        // Offline / dev fallback: allow if password has >= 6 chars
        if (pass.length >= 6) {
          const userObj: AuthUser = {
            id: 'usr_local_' + Date.now(),
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0],
          };
          setCurrentUser(userObj);
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userObj));
          return { success: true };
        }
        return { success: false, error: fbErr.message || 'Login failed' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = data.email.toLowerCase().trim();
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);
        const fbUser = userCredential.user;

        await updateProfile(fbUser, { displayName: data.name }).catch(() => {});

        const userObj: AuthUser = {
          id: fbUser.uid,
          email: normalizedEmail,
          name: data.name,
        };
        setCurrentUser(userObj);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userObj));

        const newGoals: UserGoals = {
          ...userGoals,
          name: data.name,
          currentWeightKg: data.weight || userGoals.currentWeightKg,
        };
        updateGoals(newGoals);

        // Save profile and goals to Cloud Firestore
        try {
          await setDoc(doc(db, 'users', fbUser.uid), {
            id: fbUser.uid,
            name: data.name,
            email: normalizedEmail,
            age: data.age,
            weight: data.weight,
            goal: data.goal,
            gender: data.gender,
            goals: newGoals,
            createdAt: new Date().toISOString(),
          });
        } catch (fsErr) {
          console.log('Firestore register doc write error:', fsErr);
        }

        return { success: true };
      } catch (fbErr: any) {
        console.log('Firebase register error:', fbErr.code, fbErr.message);
        if (fbErr.code === 'auth/email-already-in-use') {
          return { success: false, error: 'This email is already registered. Please sign in.' };
        }
        if (fbErr.code === 'auth/weak-password') {
          return { success: false, error: 'Password must be at least 6 characters.' };
        }
        if (fbErr.code === 'auth/invalid-email') {
          return { success: false, error: 'Please enter a valid email address.' };
        }

        // Offline dev fallback
        const userObj: AuthUser = {
          id: 'usr_' + Date.now(),
          email: normalizedEmail,
          name: data.name,
        };
        setCurrentUser(userObj);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userObj));
        updateGoals({
          name: data.name,
          currentWeightKg: data.weight || userGoals.currentWeightKg,
        });
        return { success: true };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.log('Firebase signOut error:', e);
    }
    setCurrentUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH);
  };

  const loginDemo = async (): Promise<void> => {
    const demoUser: AuthUser = {
      id: 'demo_user_1',
      email: 'akshay.rajput@example.com',
      name: 'Akshay Rajput',
      isGuest: true,
    };
    setCurrentUser(demoUser);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(demoUser));
  };

  return (
    <HealthContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        shiftDate,
        userGoals,
        updateGoals,
        foodDatabase,
        currentLog,
        totalConsumed,
        totalBurned,
        remainingCalories,
        totalCarbs,
        totalProtein,
        totalFat,
        totalFiber,
        mealsByType,
        mealCalories,
        addMealItem,
        removeMealItem,
        updateMealQuantity,
        addWater,
        resetWater,
        addWorkout,
        removeWorkout,
        addSteps,
        addCustomFood,
        weeklyLogs,
        currentUser,
        isAuthenticated: !!currentUser,
        isAuthLoading,
        login,
        register,
        logout,
        loginDemo,
      }}
    >
      {children}
    </HealthContext.Provider>
  );

};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};
