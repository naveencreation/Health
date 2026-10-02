import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyLog, FoodItem, LoggedMealItem, MealType, UserGoals, WorkoutActivity, WeeklyTrendItem, AuthUser, RegisterData, WaterLogEntry, WeightLogEntry } from '@/types';
import { INITIAL_FOOD_DATABASE } from '@/data/foodDatabase';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';
import { auth, db } from '@/services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import { SecureKeyStorage } from '@/services/ai/storage/SecureKeyStorage';
import {
  mapHealthConnectRecordsToStepEntries,
  synthesizeSessionsFromTotal,
} from '@/utils/stepHistoryUtils';

export const STORAGE_KEYS = {
  DAILY_LOGS: '@calori_daily_logs_v1',
  USER_GOALS: '@calori_user_goals_v1',
  CUSTOM_FOODS: '@calori_custom_foods_v1',
  AUTH: '@calori_auth_v1',
};

export const getUserLogsKey = (uid: string) => `@calori_daily_logs_${uid}`;
export const getUserGoalsKey = (uid: string) => `@calori_user_goals_${uid}`;
export const getUserCustomFoodsKey = (uid: string) => `@calori_custom_foods_${uid}`;

/**
 * Universal cleaner to purge any developer or sample mock data from a DailyLog.
 * Guarantees that real users never see injected sample meals (Idli, Sambar, etc.)
 * or fake 1,250ml water / 4,620 steps.
 */
export const cleanDailyLog = (log?: DailyLog): DailyLog => {
  if (!log) {
    return { date: '', meals: [], waterMl: 0, steps: 0, activities: [] };
  }
  const cleanMeals = (log.meals || []).filter(
    (m) =>
      !m.id.startsWith('sample_') &&
      m.id !== 'sample_1' &&
      m.id !== 'sample_2' &&
      m.id !== 'sample_3' &&
      m.id !== 'sample_4' &&
      m.id !== 'sample_5' &&
      m.id !== 'sample_6'
  );
  const cleanActivities = (log.activities || []).filter((a) => a.id !== 'act_1');
  const isMockLog =
    (log.activities || []).some((a) => a.id === 'act_1') ||
    (log.meals || []).some((m) => m.id.startsWith('sample_'));
  const cleanWater = isMockLog && log.waterMl === 1250 ? 0 : (log.waterMl || 0);
  const cleanSteps = isMockLog && log.steps === 4620 ? 0 : (log.steps || 0);
  return {
    ...log,
    meals: cleanMeals,
    activities: cleanActivities,
    waterMl: cleanWater,
    steps: cleanSteps,
    waterEntries: log.waterEntries || [],
    weightKg: log.weightKg,
    weightEntries: log.weightEntries || [],
    stepEntries: log.stepEntries || [],
  };
};

/**
 * Recursively strips any keys with `undefined` values from an object or array.
 * Firestore crashes if any property value is `undefined`.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

const DEFAULT_GOALS: UserGoals = {
  dailyCalorieBudget: 2213,
  targetProtein: 90,
  targetCarbs: 110,
  targetFat: 70,
  targetFiber: 30,
  waterGoalMl: 2500,
  stepGoal: 10000,
  currentWeightKg: 68.0,
  targetWeightKg: 65.0,
  streakDays: 1,
  avatarUrl: DEFAULT_AVATAR_URL,
  name: 'User',
  age: 24,
  gender: 'male',
  goal: 'maintain',
  weightUnit: 'kg',
  heightCm: 175,
  startWeightKg: 68.0,
  riaTone: 'supportive',
  waterReminder: true,
  mealReminder: true,
  stepReminder: false,
};

export const getTodayDateString = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Computes the current consecutive-day streak from dailyLogs.
 * A day counts as "active" if it has ≥1 meal, any water > 0, or any steps > 0.
 * Starts from today and walks backwards until a gap is found.
 * Pure function — no side-effects. Bounded to max 30 days for performance.
 */
export const computeStreak = (logs: Record<string, DailyLog>): number => {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getTodayDateString(d);
    const log = logs[dateStr];
    const isActive =
      log &&
      ((Array.isArray(log.meals) && log.meals.length > 0) ||
        (typeof log.waterMl === 'number' && log.waterMl > 0) ||
        (typeof log.steps === 'number' && log.steps > 0));
    if (isActive) {
      streak++;
    } else {
      break;
    }
  }
  return Math.max(streak, 1); // minimum streak of 1
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
        foodId: 'bread_omelette',
        name: 'Fluffy Bread Omelette',
        mealType: 'breakfast',
        servingUnit: '1 sandwich',
        quantity: 1,
        calories: 240,
        carbs: 26,
        protein: 12.0,
        fat: 10.0,
        fiber: 2.0,
        loggedAt: new Date().toISOString(),
      },
      {
        id: 'sample_3',
        foodId: 'apple_medium',
        name: 'Crisp Apple (Medium)',
        mealType: 'breakfast',
        servingUnit: 'piece (150g)',
        quantity: 1,
        calories: 80,
        carbs: 20,
        protein: 0.4,
        fat: 0.2,
        fiber: 4.0,
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
        foodId: 'paneer_butter_masala',
        name: 'Paneer Butter Masala',
        mealType: 'lunch',
        servingUnit: 'katori (150g)',
        quantity: 1,
        calories: 260,
        carbs: 12,
        protein: 9.5,
        fat: 19.5,
        fiber: 2.0,
        loggedAt: new Date().toISOString(),
      },
      {
        id: 'sample_6',
        foodId: 'curd_rice',
        name: 'Curd Rice (Thayir Sadam)',
        mealType: 'lunch',
        servingUnit: 'katori (150g)',
        quantity: 1,
        calories: 190,
        carbs: 28,
        protein: 5.2,
        fat: 6.5,
        fiber: 1.2,
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

export interface HealthContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  shiftDate: (days: number) => void;
  userGoals: UserGoals;
  updateGoals: (goals: Partial<UserGoals>) => void;
  foodDatabase: FoodItem[];
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
  batchUpdateDailySteps: (updates: Array<{ dateStr: string; steps: number; records?: any[] }>) => void;
  logWeight: (weightKg: number, date?: string, note?: string, customLoggedAt?: string, customId?: string) => void;
  updateWeightEntry: (id: string, updates: Partial<WeightLogEntry>, date?: string, newDate?: string) => void;
  deleteWeightEntry: (id: string, date?: string) => void;
  addCustomFood: (food: Omit<FoodItem, 'id'>) => FoodItem;
  deleteCustomFood: (foodId: string) => void;
  weeklyLogs: WeeklyTrendItem[];
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  loginDemo: () => Promise<void>;
}

export const HealthContext = createContext<HealthContextType | undefined>(undefined);

export type AuthContextValue = Pick<
  HealthContextType,
  'currentUser' | 'isAuthenticated' | 'isAuthLoading' | 'login' | 'register' | 'logout' | 'deleteAccount' | 'loginDemo'
>;

export type GoalsContextValue = Pick<HealthContextType, 'userGoals' | 'updateGoals'>;

export type DailyLogContextValue = Pick<
  HealthContextType,
  | 'selectedDate'
  | 'setSelectedDate'
  | 'shiftDate'
  | 'dailyLogs'
  | 'currentLog'
  | 'totalConsumed'
  | 'totalBurned'
  | 'remainingCalories'
  | 'totalCarbs'
  | 'totalProtein'
  | 'totalFat'
  | 'totalFiber'
  | 'mealsByType'
  | 'mealCalories'
  | 'addMealItem'
  | 'removeMealItem'
  | 'updateMealQuantity'
  | 'addWater'
  | 'removeWaterEntry'
  | 'updateWaterEntry'
  | 'resetWater'
  | 'addWorkout'
  | 'removeWorkout'
  | 'addSteps'
  | 'removeStepEntry'
  | 'batchUpdateDailySteps'
  | 'logWeight'
  | 'updateWeightEntry'
  | 'deleteWeightEntry'
>;

export type AnalyticsContextValue = Pick<HealthContextType, 'weeklyLogs' | 'dailyLogs'>;

export type FoodContextValue = Pick<HealthContextType, 'foodDatabase' | 'addCustomFood' | 'deleteCustomFood'>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const GoalsContext = createContext<GoalsContextValue | undefined>(undefined);
const DailyLogContext = createContext<DailyLogContextValue | undefined>(undefined);
const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);
const FoodContext = createContext<FoodContextValue | undefined>(undefined);

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [userGoals, setUserGoals] = useState<UserGoals>(DEFAULT_GOALS);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Synchronization and lifecycle protection refs
  const isLoggingOutRef = useRef(false);
  const authResolvedRef = useRef(false);
  const isHydratingRef = useRef(false);
  const hydratedUidRef = useRef<string | null>(null);
  const firestoreLogDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firestoreGoalsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedLogsRef = useRef<Record<string, string>>({});

  // Unified hydration function to load profile, goals, and dailyLogs from Firestore & user-scoped cache
  const fetchAndHydrateUserData = async (uid: string, _userObj?: AuthUser | null) => {
    if (!uid) return;
    isHydratingRef.current = true;
    try {
      const userLogsKey = getUserLogsKey(uid);
      const userGoalsKey = getUserGoalsKey(uid);

      // 1. Fast local cache load for this specific user
      let initialUserLogs: Record<string, DailyLog> = {};
      try {
        const [cachedLogsStr, cachedGoalsStr] = await Promise.all([
          AsyncStorage.getItem(userLogsKey),
          AsyncStorage.getItem(userGoalsKey),
        ]);

        if (cachedGoalsStr) {
          const parsedCachedGoals = JSON.parse(cachedGoalsStr);
          setUserGoals((prev) => ({ ...prev, ...parsedCachedGoals }));
        }

        if (cachedLogsStr) {
          const parsedCachedLogs = JSON.parse(cachedLogsStr);
          for (const [k, v] of Object.entries(parsedCachedLogs)) {
            initialUserLogs[k] = cleanDailyLog(v as DailyLog);
          }
          if (Object.keys(initialUserLogs).length > 0) {
            setDailyLogs(initialUserLogs);
          }
        }
      } catch (cacheErr) {
        console.warn('User cache read error:', cacheErr);
      }

      // 2. Fetch User Profile & Goals from Cloud Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data?.goals) {
            const mergedGoals: UserGoals = {
              ...DEFAULT_GOALS,
              ...data.goals,
              age: data.goals?.age ?? data.age,
              gender: data.goals?.gender ?? data.gender,
              goal: data.goals?.goal ?? data.goal,
              weightUnit: data.goals?.weightUnit ?? data.weightUnit ?? 'kg',
              startWeightKg: data.goals?.startWeightKg ?? data.startWeightKg ?? data.weight ?? 68.0,
              currentWeightKg: data.goals?.currentWeightKg ?? data.weight ?? 68.0,
              heightCm: data.goals?.heightCm ?? data.heightCm ?? 175,
            };
            setUserGoals(mergedGoals);
            AsyncStorage.setItem(userGoalsKey, JSON.stringify(mergedGoals)).catch(() => {});
            AsyncStorage.setItem(STORAGE_KEYS.USER_GOALS, JSON.stringify(mergedGoals)).catch(() => {});
          }
        }
      } catch (userDocErr) {
        console.warn('Firestore fetch user doc error:', userDocErr);
      }

      // 3. Fetch recent 30 DailyLogs subcollection from Cloud Firestore (Bounded for Cold Start Performance)
      const cloudLogs: Record<string, DailyLog> = {};
      try {
        const logsCollectionRef = collection(db, 'users', uid, 'dailyLogs');
        const boundedQuery = query(logsCollectionRef, orderBy('date', 'desc'), limit(30));
        const logsSnap = await getDocs(boundedQuery);

        for (const d of logsSnap.docs) {
          const rawLog = d.data() as DailyLog;
          const cleansed = cleanDailyLog(rawLog);
          cloudLogs[d.id] = cleansed;

          // If legacy document in cloud had mock data, sanitize and overwrite it
          const isMock =
            (rawLog.activities || []).some((a) => a.id === 'act_1') ||
            (rawLog.meals || []).some((m) => m.id.startsWith('sample_'));
          if (isMock) {
            const cleanPayload = sanitizeForFirestore({
              date: d.id,
              waterMl: typeof cleansed.waterMl === 'number' ? Math.max(0, cleansed.waterMl) : 0,
              steps: typeof cleansed.steps === 'number' ? Math.max(0, cleansed.steps) : 0,
              meals: Array.isArray(cleansed.meals) ? cleansed.meals : [],
              activities: Array.isArray(cleansed.activities) ? cleansed.activities : [],
              ...(Array.isArray(cleansed.waterEntries) ? { waterEntries: cleansed.waterEntries } : {}),
              ...(typeof cleansed.weightKg === 'number' ? { weightKg: cleansed.weightKg } : {}),
              ...(Array.isArray(cleansed.weightEntries) ? { weightEntries: cleansed.weightEntries } : {}),
              ...(Array.isArray(cleansed.stepEntries) ? { stepEntries: cleansed.stepEntries } : {}),
            });
            setDoc(doc(db, 'users', uid, 'dailyLogs', d.id), cleanPayload, { merge: true }).catch(() => {});
          }
        }
      } catch (colErr) {
        if (__DEV__) console.warn('Firestore dailyLogs collection query error:', colErr);
        // Fallback: try fetching today's document directly
        try {
          const todayKey = getTodayDateString();
          const logDoc = await getDoc(doc(db, 'users', uid, 'dailyLogs', todayKey));
          if (logDoc.exists()) {
            cloudLogs[todayKey] = cleanDailyLog(logDoc.data() as DailyLog);
          }
        } catch (todayErr) {
          console.warn('Firestore fetch today log fallback error:', todayErr);
        }
      }

      // 4. Merge cloud logs with any local logs
      const todayKey = getTodayDateString();
      const merged: Record<string, DailyLog> = { ...initialUserLogs };

      for (const [dateKey, cloudLog] of Object.entries(cloudLogs)) {
        const localLog = initialUserLogs[dateKey];
        if (!localLog) {
          merged[dateKey] = cloudLog;
        } else {
          const localWater = localLog.waterMl || 0;
          const cloudWater = cloudLog.waterMl || 0;
          const localEntries = localLog.waterEntries || [];
          const cloudEntries = cloudLog.waterEntries || [];

          merged[dateKey] = {
            ...cloudLog,
            meals: cloudLog.meals && cloudLog.meals.length > 0 ? cloudLog.meals : (localLog.meals || []),
            waterMl: Math.max(cloudWater, localWater),
            waterEntries: cloudEntries.length >= localEntries.length ? cloudEntries : localEntries,
            steps: Math.max(cloudLog.steps || 0, localLog.steps || 0),
            activities: cloudLog.activities && cloudLog.activities.length > 0 ? cloudLog.activities : (localLog.activities || []),
          };
        }
      }

      // Guarantee today has an entry if not present
      if (!merged[todayKey]) {
        merged[todayKey] = {
          date: todayKey,
          meals: [],
          waterMl: 0,
          steps: 0,
          activities: [],
        };
      }

      setDailyLogs(merged);

      // 5. Fetch User-Scoped CustomFoods from Cloud Firestore & user-scoped cache
      const userCustomFoodsKey = getUserCustomFoodsKey(uid);
      try {
        const cachedCustomStr = await AsyncStorage.getItem(userCustomFoodsKey);
        if (cachedCustomStr) {
          const parsedCustom = JSON.parse(cachedCustomStr);
          if (Array.isArray(parsedCustom)) {
            setCustomFoods(parsedCustom);
          }
        }
      } catch (cacheErr) {
        console.warn('User custom foods cache read error:', cacheErr);
      }

      try {
        const customColRef = collection(db, 'users', uid, 'customFoods');
        const customSnap = await getDocs(customColRef);
        if (!customSnap.empty) {
          const fetchedCustom: FoodItem[] = customSnap.docs.map((d) => {
            const raw = d.data();
            return {
              id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : d.id,
              name: typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : 'Unnamed Food',
              category: raw.category || 'snacks',
              categoryLabel: raw.categoryLabel || 'Custom Food',
              servingUnit: typeof raw.servingUnit === 'string' ? raw.servingUnit : 'serving',
              defaultServingSize: typeof raw.defaultServingSize === 'number' ? Math.max(1, raw.defaultServingSize) : 1,
              calories: Math.max(0, Math.round(Number(raw.calories) || 0)),
              carbs: Math.max(0, Math.round((Number(raw.carbs) || 0) * 10) / 10),
              protein: Math.max(0, Math.round((Number(raw.protein) || 0) * 10) / 10),
              fat: Math.max(0, Math.round((Number(raw.fat) || 0) * 10) / 10),
              fiber: Math.max(0, Math.round((Number(raw.fiber) || 0) * 10) / 10),
              icon: typeof raw.icon === 'string' ? raw.icon : '🍽️',
              imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
              isCustom: true,
            };
          });
          setCustomFoods(fetchedCustom);
          AsyncStorage.setItem(userCustomFoodsKey, JSON.stringify(fetchedCustom)).catch(() => {});
        }
      } catch (colErr) {
        console.warn('Firestore customFoods collection query error:', colErr);
      }

      // Persist to user-scoped storage & active storage
      await Promise.all([
        AsyncStorage.setItem(userLogsKey, JSON.stringify(merged)),
        AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(merged)),
      ]);

      // 6. Restore Gemini API key from Firestore backup (BYOK persistence across logout/login)
      SecureKeyStorage.restoreFromFirestore(uid).catch((err) => {
        console.warn('fetchAndHydrateUserData: Gemini key restore failed (non-fatal)', err);
      });

      hydratedUidRef.current = uid;

    } catch (err) {
      console.error('fetchAndHydrateUserData error:', err);
    } finally {
      isHydratingRef.current = false;
    }
  };

  // Load persistent data on cold start
  useEffect(() => {
    const loadData = async () => {
      try {
        const todayStr = getTodayDateString();
        const savedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH);
        const parsedAuth: AuthUser | null = savedAuth ? JSON.parse(savedAuth) : null;
        const isGuest = parsedAuth?.isGuest;

        // Optimistic restore: render from the cached user immediately.
        // onAuthStateChanged is authoritative and confirms/corrects this.
        if (parsedAuth?.id && !authResolvedRef.current) {
          setCurrentUser(parsedAuth);
          setIsAuthLoading(false);
        }

        const userScopedGoals = parsedAuth?.id && !isGuest
          ? await AsyncStorage.getItem(getUserGoalsKey(parsedAuth.id))
          : null;
        const savedGoals = userScopedGoals || (await AsyncStorage.getItem(STORAGE_KEYS.USER_GOALS));
        const savedCustomFoods = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);

        if (savedGoals) {
          try {
            const parsed = JSON.parse(savedGoals);
            const validUrls = ['asset:men', 'asset:women', 'asset:boy', 'asset:girl', 'asset:grandpa', 'asset:grandma'];
            if (!parsed.avatarUrl || !validUrls.includes(parsed.avatarUrl)) {
              parsed.avatarUrl = DEFAULT_AVATAR_URL;
            }
            setUserGoals(parsed);
          } catch (e) {}
        }

        // Load user-scoped custom foods if real user, else fallback to generic/guest
        if (parsedAuth && !isGuest && parsedAuth.id) {
          try {
            const userCustomStr = await AsyncStorage.getItem(getUserCustomFoodsKey(parsedAuth.id));
            if (userCustomStr) {
              setCustomFoods(JSON.parse(userCustomStr));
            }
          } catch (e) {}
        } else if (savedCustomFoods) {
          try {
            setCustomFoods(JSON.parse(savedCustomFoods));
          } catch (e) {}
        }

        let parsedLogs: Record<string, DailyLog> = {};

        // If a real user is already active, try their user-scoped logs first
        if (parsedAuth && !isGuest && parsedAuth.id) {
          const userLogs = await AsyncStorage.getItem(getUserLogsKey(parsedAuth.id));
          if (userLogs) {
            try {
              parsedLogs = JSON.parse(userLogs);
            } catch (e) {}
          }
        }

        if (Object.keys(parsedLogs).length === 0) {
          const savedLogs = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
          if (savedLogs) {
            try {
              parsedLogs = JSON.parse(savedLogs);
            } catch (e) {}
          }
        }

        // For non-guest users, thoroughly cleanse ALL historical dates of mock data
        if (!isGuest) {
          const cleaned: Record<string, DailyLog> = {};
          for (const [key, val] of Object.entries(parsedLogs)) {
            cleaned[key] = cleanDailyLog(val);
          }
          parsedLogs = cleaned;
        }

        // Initialize today if not present
        if (!parsedLogs[todayStr]) {
          parsedLogs[todayStr] = isGuest
            ? createInitialSampleLog(todayStr)
            : { date: todayStr, meals: [], waterMl: 0, steps: 0, activities: [] };
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
      authResolvedRef.current = true;
      if (fbUser) {
        const userObj: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        };
        setCurrentUser(userObj);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userObj));

        // Hydrate from cloud if not already hydrated for this user
        if (hydratedUidRef.current !== fbUser.uid) {
          await fetchAndHydrateUserData(fbUser.uid, userObj);
        }
      } else {
        // No Firebase user logged in
        if (!isLoggingOutRef.current) {
          const savedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH);
          const parsed = savedAuth ? JSON.parse(savedAuth) : null;
          if (!parsed?.isGuest) {
            setCurrentUser(null);
            hydratedUidRef.current = null;
          }
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save changes & sync dailyLogs to Firestore (1000ms Debounced Cloud Sync)
  useEffect(() => {
    if (!isLoaded) return;
    const targetKey = auth.currentUser && !currentUser?.isGuest
      ? getUserLogsKey(auth.currentUser.uid)
      : STORAGE_KEYS.DAILY_LOGS;

    AsyncStorage.setItem(targetKey, JSON.stringify(dailyLogs)).catch(() => {});

    // 1000ms Debounced Cloud Firestore Sync
    if (firestoreLogDebounceRef.current) {
      clearTimeout(firestoreLogDebounceRef.current);
    }

    firestoreLogDebounceRef.current = setTimeout(() => {
      if (
        !isLoggingOutRef.current &&
        !isHydratingRef.current &&
        auth.currentUser &&
        !currentUser?.isGuest &&
        hydratedUidRef.current === auth.currentUser.uid
      ) {
        const datesToSync = new Set<string>([selectedDate]);
        for (const dateKey of Object.keys(dailyLogs)) {
          const serialized = JSON.stringify(dailyLogs[dateKey]);
          if (lastSyncedLogsRef.current[dateKey] !== serialized) {
            datesToSync.add(dateKey);
          }
        }

        datesToSync.forEach((dKey) => {
          const log = dailyLogs[dKey];
          if (log) {
            try {
              const payload = sanitizeForFirestore({
                date: dKey,
                waterMl: typeof log.waterMl === 'number' ? Math.max(0, log.waterMl) : 0,
                steps: typeof log.steps === 'number' ? Math.max(0, log.steps) : 0,
                meals: Array.isArray(log.meals) ? log.meals : [],
                activities: Array.isArray(log.activities) ? log.activities : [],
                ...(Array.isArray(log.waterEntries) ? { waterEntries: log.waterEntries } : {}),
                ...(typeof log.weightKg === 'number' ? { weightKg: log.weightKg } : {}),
                ...(Array.isArray(log.weightEntries) ? { weightEntries: log.weightEntries } : {}),
                ...(Array.isArray(log.stepEntries) ? { stepEntries: log.stepEntries } : {}),
              });
              setDoc(doc(db, 'users', auth.currentUser!.uid, 'dailyLogs', dKey), payload, { merge: true })
                .then(() => {
                  lastSyncedLogsRef.current[dKey] = JSON.stringify(log);
                })
                .catch((err) => {
                  if (__DEV__) console.warn('dailyLogs setDoc async error:', err);
                });
            } catch (err) {
              if (__DEV__) console.warn('dailyLogs setDoc sync error:', err);
            }
          }
        });
      }
    }, 1000);
  }, [dailyLogs, isLoaded, selectedDate, currentUser]);

  // Save changes & sync userGoals to Firestore (1000ms Debounced Cloud Sync)
  useEffect(() => {
    if (!isLoaded) return;
    const targetKey = auth.currentUser && !currentUser?.isGuest
      ? getUserGoalsKey(auth.currentUser.uid)
      : STORAGE_KEYS.USER_GOALS;

    AsyncStorage.setItem(targetKey, JSON.stringify(userGoals)).catch(() => {});

    // 1000ms Debounced Cloud Firestore Sync
    if (firestoreGoalsDebounceRef.current) {
      clearTimeout(firestoreGoalsDebounceRef.current);
    }

    firestoreGoalsDebounceRef.current = setTimeout(() => {
      if (
        !isLoggingOutRef.current &&
        !isHydratingRef.current &&
        auth.currentUser &&
        !currentUser?.isGuest
      ) {
        try {
          const profileUpdates: Record<string, any> = {
            updatedAt: new Date().toISOString(),
            goals: userGoals,
          };
          if (typeof userGoals.currentWeightKg === 'number' && userGoals.currentWeightKg >= 10 && userGoals.currentWeightKg <= 500) {
            profileUpdates.weight = userGoals.currentWeightKg;
          }
          if (userGoals.weightUnit === 'kg' || userGoals.weightUnit === 'lbs') {
            profileUpdates.weightUnit = userGoals.weightUnit;
          }
          if (typeof userGoals.startWeightKg === 'number' && userGoals.startWeightKg >= 10 && userGoals.startWeightKg <= 500) {
            profileUpdates.startWeightKg = userGoals.startWeightKg;
          }
          if (typeof userGoals.heightCm === 'number' && userGoals.heightCm >= 50 && userGoals.heightCm <= 300) {
            profileUpdates.heightCm = userGoals.heightCm;
          }

          const payload = sanitizeForFirestore(profileUpdates);
          setDoc(doc(db, 'users', auth.currentUser.uid), payload, { merge: true }).catch((err) => {
            if (__DEV__) console.warn('userGoals setDoc async error:', err);
          });
        } catch (err) {
          if (__DEV__) console.warn('userGoals setDoc sync error:', err);
        }
      }
    }, 1000);
  }, [userGoals, isLoaded, currentUser]);

  useEffect(() => {
    if (!isLoaded) return;
    const uid = currentUser?.id || 'guest';
    AsyncStorage.setItem(getUserCustomFoodsKey(uid), JSON.stringify(customFoods)).catch(() => {});
  }, [customFoods, isLoaded, currentUser]);

  // Auto-compute streak from dailyLogs
  const userGoalsRef = useRef(userGoals);
  useEffect(() => {
    userGoalsRef.current = userGoals;
  }, [userGoals]);

  useEffect(() => {
    if (!isLoaded) return;
    const newStreak = computeStreak(dailyLogs);
    if (newStreak !== userGoalsRef.current.streakDays) {
      setUserGoals((prev) => ({ ...prev, streakDays: newStreak }));
    }
  }, [dailyLogs, isLoaded]);


  // Combined food database
  const foodDatabase = useMemo(() => {
    return [...customFoods, ...INITIAL_FOOD_DATABASE];
  }, [customFoods]);

  // Current active date log with safe fallback guarantees
  const currentLog = useMemo((): DailyLog => {
    const raw = dailyLogs[selectedDate];
    return {
      date: raw?.date || selectedDate,
      meals: Array.isArray(raw?.meals) ? raw.meals : [],
      waterMl: typeof raw?.waterMl === 'number' ? raw.waterMl : 0,
      steps: typeof raw?.steps === 'number' ? raw.steps : 0,
      activities: Array.isArray(raw?.activities) ? raw.activities : [],
    };
  }, [dailyLogs, selectedDate]);

  // Shift date helper
  const shiftDate = useCallback((days: number) => {
    setSelectedDate((prev) => {
      const parts = prev.split('-');
      const curr = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      curr.setDate(curr.getDate() + days);
      return getTodayDateString(curr);
    });
  }, []);

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
    const activities = Array.isArray(currentLog?.activities) ? currentLog.activities : [];
    const workoutBurn = activities.reduce((sum, act) => sum + (act.caloriesBurned || 0), 0);
    const stepBurn = Math.round((currentLog?.steps || 0) * 0.04);
    return workoutBurn + stepBurn;
  }, [currentLog?.activities, currentLog?.steps]);

  // Healthify formula: Remaining = Goal - Consumed + Burned
  const remainingCalories = useMemo(() => {
    return userGoals.dailyCalorieBudget - totalConsumed + totalBurned;
  }, [userGoals.dailyCalorieBudget, totalConsumed, totalBurned]);

  // Actions
  const addMealItem = useCallback((mealType: MealType, food: FoodItem, quantity: number) => {
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
      imageUrl: food.imageUrl,
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
    return newItem;
  }, [selectedDate]);

  const removeMealItem = useCallback((mealId: string) => {
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
  }, [selectedDate]);

  const updateMealQuantity = useCallback((mealId: string, quantity: number) => {
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
  }, [selectedDate, foodDatabase]);

  const addWater = useCallback((ml: number, beverageType: string = 'water') => {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate] || {
        date: selectedDate,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
        waterEntries: [],
      };
      const updated = Math.max(0, existing.waterMl + ml);
      let updatedEntries = existing.waterEntries ? [...existing.waterEntries] : [];

      if (ml > 0) {
        const now = new Date();
        const timePart = now.toTimeString().split(' ')[0];
        const todayStr = getTodayDateString();
        const loggedAt = selectedDate === todayStr
          ? now.toISOString()
          : `${selectedDate}T${timePart}.000Z`;

        const newEntry: WaterLogEntry = {
          id: 'water_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          amountMl: ml,
          beverageType,
          loggedAt,
        };
        updatedEntries = [newEntry, ...updatedEntries];
      } else if (ml < 0 && updatedEntries.length > 0) {
        let remainingToDeduct = Math.abs(ml);
        const targetType = (beverageType || 'water').toLowerCase();
        const hasMatching = updatedEntries.some(
          (e) => (e.beverageType || 'water').toLowerCase() === targetType
        );

        const nextEntries: WaterLogEntry[] = [];
        let actualDeducted = 0;

        for (const entry of updatedEntries) {
          const entryType = (entry.beverageType || 'water').toLowerCase();
          const isTarget = hasMatching ? entryType === targetType : true;

          if (!isTarget || remainingToDeduct <= 0) {
            nextEntries.push(entry);
          } else if (entry.amountMl <= remainingToDeduct) {
            remainingToDeduct -= entry.amountMl;
            actualDeducted += entry.amountMl;
          } else {
            nextEntries.push({
              ...entry,
              amountMl: entry.amountMl - remainingToDeduct,
            });
            actualDeducted += remainingToDeduct;
            remainingToDeduct = 0;
          }
        }
        updatedEntries = nextEntries;
        const effectiveDeducted = actualDeducted > 0 ? actualDeducted : Math.abs(ml);
        const recalculated = Math.max(0, existing.waterMl - effectiveDeducted);
        return {
          ...prev,
          [selectedDate]: {
            ...existing,
            waterMl: recalculated,
            waterEntries: recalculated === 0 ? [] : updatedEntries,
          },
        };
      }

      if (updated === 0) {
        updatedEntries = [];
      }

      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          waterMl: updated,
          waterEntries: updatedEntries,
        },
      };
    });
  }, [selectedDate]);

  const removeWaterEntry = useCallback((id: string, date?: string) => {
    const targetDate = date || selectedDate;
    setDailyLogs((prev) => {
      const existing = prev[targetDate];
      if (!existing) return prev;

      // Handle synthetic/legacy unitemized entries
      if (id.startsWith('synth') || id.startsWith('synthetic') || id === 'legacy_balance') {
        return {
          ...prev,
          [targetDate]: {
            ...existing,
            waterMl: 0,
            waterEntries: [],
          },
        };
      }

      if (!existing.waterEntries) return prev;
      const target = existing.waterEntries.find((e) => e.id === id);
      const amountDeducted = target ? target.amountMl : 0;
      return {
        ...prev,
        [targetDate]: {
          ...existing,
          waterMl: Math.max(0, existing.waterMl - amountDeducted),
          waterEntries: existing.waterEntries.filter((e) => e.id !== id),
        },
      };
    });
  }, [selectedDate]);

  const updateWaterEntry = useCallback((id: string, updates: Partial<WaterLogEntry>, date?: string) => {
    const targetDate = date || selectedDate;
    setDailyLogs((prev) => {
      const existing = prev[targetDate];
      if (!existing) return prev;
      let entries = existing.waterEntries ? [...existing.waterEntries] : [];

      // Handle synthetic/legacy unitemized entries
      if (id.startsWith('synth') || id.startsWith('synthetic') || id === 'legacy_balance') {
        const newAmount = updates.amountMl !== undefined ? updates.amountMl : existing.waterMl;
        const newType = updates.beverageType || 'water';
        return {
          ...prev,
          [targetDate]: {
            ...existing,
            waterMl: newAmount,
            waterEntries: [
              {
                id: 'water_' + Date.now(),
                amountMl: newAmount,
                beverageType: newType,
                loggedAt: `${targetDate}T08:00:00.000Z`,
              },
            ],
          },
        };
      }

      const updatedEntries = entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
      const recalculatedWater = updatedEntries.reduce((sum, e) => sum + (e.amountMl || 0), 0);
      return {
        ...prev,
        [targetDate]: {
          ...existing,
          waterMl: recalculatedWater,
          waterEntries: updatedEntries,
        },
      };
    });
  }, [selectedDate]);

  const resetWater = useCallback(() => {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate];
      if (!existing) return prev;
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          waterMl: 0,
          waterEntries: [],
        },
      };
    });
  }, [selectedDate]);

  const addWorkout = useCallback((name: string, durationMinutes: number, caloriesBurned: number) => {
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
  }, [selectedDate]);

  const removeWorkout = useCallback((id: string) => {
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
  }, [selectedDate]);

  const addSteps = useCallback((count: number) => {
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
  }, [selectedDate]);

  const removeStepEntry = useCallback((id: string, date?: string) => {
    const targetDate = date || selectedDate;
    setDailyLogs((prev) => {
      const existing = prev[targetDate];
      if (!existing) return prev;

      const currentEntries = existing.stepEntries || [];
      const entryToRemove = currentEntries.find((e) => e.id === id);
      const stepsToDeduct = entryToRemove ? entryToRemove.steps : 0;

      const updatedEntries = currentEntries.filter((e) => e.id !== id);
      const updatedSteps = Math.max(0, existing.steps - stepsToDeduct);

      return {
        ...prev,
        [targetDate]: {
          ...existing,
          steps: updatedSteps,
          stepEntries: updatedEntries,
        },
      };
    });
  }, [selectedDate]);

  const batchUpdateDailySteps = useCallback(
    (updates: Array<{ dateStr: string; steps: number; records?: any[] }>) => {
      if (!updates || updates.length === 0) return;

      setDailyLogs((prev) => {
        const nextLogs = { ...prev };

        updates.forEach(({ dateStr, steps, records }) => {
          if (!dateStr) return;
          const existing = nextLogs[dateStr] || {
            date: dateStr,
            meals: [],
            waterMl: 0,
            steps: 0,
            activities: [],
          };

          let stepEntries = existing.stepEntries;
          if (records && records.length > 0) {
            stepEntries = mapHealthConnectRecordsToStepEntries(records);
          } else if (steps > 0 && (!stepEntries || stepEntries.length === 0)) {
            stepEntries = synthesizeSessionsFromTotal(steps, dateStr);
          }

          nextLogs[dateStr] = {
            ...existing,
            steps,
            stepEntries,
          };
        });

        return nextLogs;
      });
    },
    []
  );

  const logWeight = useCallback((
    weightKg: number,
    date?: string,
    note?: string,
    customLoggedAt?: string,
    customId?: string
  ) => {
    const targetDate = date || selectedDate;
    const now = new Date();
    const todayStr = getTodayDateString(now);
    const isToday = targetDate === todayStr;
    const rounded = Math.round(weightKg * 10) / 10;

    let defaultLoggedAt: string;
    let defaultTimestampNum: number;

    if (isToday) {
      defaultLoggedAt = now.toISOString();
      defaultTimestampNum = Date.now();
    } else {
      const [y, m, d] = targetDate.split('-').map(Number);
      const localMorning = new Date(y, m - 1, d, 8, 0, 0);
      defaultLoggedAt = localMorning.toISOString();
      defaultTimestampNum = localMorning.getTime();
    }

    const loggedAt = customLoggedAt || defaultLoggedAt;
    const timestampNum = customLoggedAt ? new Date(customLoggedAt).getTime() : defaultTimestampNum;
    const entryId = customId || ('weight_' + timestampNum + '_' + Math.random().toString(36).substring(2, 6));

    const newEntry: WeightLogEntry = {
      id: entryId,
      weightKg: rounded,
      loggedAt,
      note,
    };

    setDailyLogs((prev) => {
      const existing = prev[targetDate] || {
        date: targetDate,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      };
      const prevEntries = existing.weightEntries ? existing.weightEntries.filter((e) => e.id !== entryId) : [];
      const mergedEntries = [newEntry, ...prevEntries].sort((a, b) => {
        const timeA = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
        const timeB = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
        return timeB - timeA;
      });

      const primaryWeight = mergedEntries[0].weightKg;

      const updatedLogs = {
        ...prev,
        [targetDate]: {
          ...existing,
          weightKg: primaryWeight,
          weightEntries: mergedEntries,
        },
      };

      // Determine if targetDate is the chronologically latest weigh-in
      const sortedDates = Object.keys(updatedLogs)
        .filter((d) => typeof updatedLogs[d]?.weightKg === 'number' && updatedLogs[d]!.weightKg! > 0)
        .sort((a, b) => b.localeCompare(a));

      if (sortedDates.length > 0 && sortedDates[0] === targetDate) {
        setUserGoals((g) => ({
          ...g,
          currentWeightKg: primaryWeight,
          startWeightKg: g.startWeightKg ? g.startWeightKg : primaryWeight,
        }));
      }

      return updatedLogs;
    });
  }, [selectedDate]);

  const deleteWeightEntry = useCallback((id: string, date?: string) => {
    const targetDate = date || selectedDate;
    setDailyLogs((prev) => {
      const existing = prev[targetDate];
      if (!existing || !existing.weightEntries) return prev;
      const remaining = existing.weightEntries.filter((e) => e.id !== id);
      const nextWeight = remaining.length > 0 ? remaining[0].weightKg : undefined;
      const updatedLogs = {
        ...prev,
        [targetDate]: {
          ...existing,
          weightKg: nextWeight,
          weightEntries: remaining,
        },
      };

      // Recalculate latest weight so currentWeightKg never gets stuck on deleted entry
      const sortedDates = Object.keys(updatedLogs)
        .filter((d) => typeof updatedLogs[d]?.weightKg === 'number' && updatedLogs[d]!.weightKg! > 0)
        .sort((a, b) => b.localeCompare(a));

      if (sortedDates.length > 0) {
        const newestWeight = updatedLogs[sortedDates[0]].weightKg!;
        setUserGoals((g) => ({
          ...g,
          currentWeightKg: newestWeight,
        }));
      } else {
        setUserGoals((g) => ({
          ...g,
          currentWeightKg: g.startWeightKg || 68.0,
        }));
      }

      return updatedLogs;
    });
  }, [selectedDate]);

  const updateWeightEntry = useCallback((id: string, updates: Partial<WeightLogEntry>, date?: string, newDate?: string) => {
    const targetDate = date || selectedDate;
    const destDate = newDate || targetDate;

    setDailyLogs((prev) => {
      const existing = prev[targetDate];
      if (!existing || !existing.weightEntries) return prev;

      const foundEntry = existing.weightEntries.find((e) => e.id === id);
      if (!foundEntry) return prev;

      const updatedEntry: WeightLogEntry = { ...foundEntry, ...updates };
      let updatedLogs = { ...prev };

      if (destDate !== targetDate) {
        // Remove from targetDate
        const remainingTarget = existing.weightEntries.filter((e) => e.id !== id);
        const nextTargetWeight = remainingTarget.length > 0 ? remainingTarget[0].weightKg : undefined;
        updatedLogs[targetDate] = {
          ...existing,
          weightKg: nextTargetWeight,
          weightEntries: remainingTarget,
        };

        // Add to destDate and sort chronologically
        const destLog = prev[destDate] || {
          date: destDate,
          meals: [],
          waterMl: 0,
          steps: 0,
          activities: [],
        };
        const destEntries = destLog.weightEntries ? destLog.weightEntries.filter((e) => e.id !== id) : [];
        const mergedDest = [updatedEntry, ...destEntries].sort((a, b) => {
          const timeA = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
          const timeB = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
          return timeB - timeA;
        });

        updatedLogs[destDate] = {
          ...destLog,
          weightKg: mergedDest.length > 0 ? mergedDest[0].weightKg : undefined,
          weightEntries: mergedDest,
        };
      } else {
        const updatedEntries = existing.weightEntries.map((e) =>
          e.id === id ? updatedEntry : e
        ).sort((a, b) => {
          const timeA = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
          const timeB = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
          return timeB - timeA;
        });
        const latestWeight = updatedEntries.length > 0 ? updatedEntries[0].weightKg : existing.weightKg;
        updatedLogs[targetDate] = {
          ...existing,
          weightKg: latestWeight,
          weightEntries: updatedEntries,
        };
      }

      // If needed, keep currentWeightKg in sync with the chronologically newest date
      const sortedDates = Object.keys(updatedLogs)
        .filter((d) => typeof updatedLogs[d]?.weightKg === 'number' && updatedLogs[d]!.weightKg! > 0)
        .sort((a, b) => b.localeCompare(a));

      if (sortedDates.length > 0) {
        const newestWeight = updatedLogs[sortedDates[0]].weightKg!;
        setUserGoals((g) => ({
          ...g,
          currentWeightKg: newestWeight,
        }));
      }

      return updatedLogs;
    });
  }, [selectedDate]);

  const addCustomFood = useCallback((foodData: Omit<FoodItem, 'id'>): FoodItem => {
    const newFood: FoodItem = {
      ...foodData,
      id: 'custom_' + Date.now(),
      name: (foodData.name || 'Custom Food').trim().slice(0, 150),
      calories: Math.max(0, Math.min(15000, Math.round(Number(foodData.calories) || 0))),
      carbs: Math.max(0, Math.min(1000, Math.round((Number(foodData.carbs) || 0) * 10) / 10)),
      protein: Math.max(0, Math.min(1000, Math.round((Number(foodData.protein) || 0) * 10) / 10)),
      fat: Math.max(0, Math.min(1000, Math.round((Number(foodData.fat) || 0) * 10) / 10)),
      fiber: Math.max(0, Math.min(500, Math.round((Number(foodData.fiber) || 0) * 10) / 10)),
      isCustom: true,
    };
    setCustomFoods((prev) => {
      const updated = [newFood, ...prev];
      const uid = currentUser?.id || 'guest';
      AsyncStorage.setItem(getUserCustomFoodsKey(uid), JSON.stringify(updated)).catch(console.error);

      const authUid = auth.currentUser?.uid;
      if (authUid && currentUser && !currentUser.isGuest && !currentUser.id.startsWith('demo_') && authUid === currentUser.id) {
        // Construct clean payload strictly adhering to firestore.rules
        const firestorePayload: Record<string, any> = {
          id: newFood.id,
          name: newFood.name,
          calories: newFood.calories,
          carbs: newFood.carbs,
          protein: newFood.protein,
          fat: newFood.fat,
          fiber: newFood.fiber,
          isCustom: true,
          category: newFood.category || 'snacks',
          categoryLabel: newFood.categoryLabel || 'Custom',
          defaultServingSize: newFood.defaultServingSize || 1,
          servingUnit: newFood.servingUnit || 'serving',
        };

        if (newFood.icon && typeof newFood.icon === 'string') {
          firestorePayload.icon = newFood.icon.slice(0, 30);
        }
        if (newFood.imageUrl && typeof newFood.imageUrl === 'string' && newFood.imageUrl.length <= 2000) {
          firestorePayload.imageUrl = newFood.imageUrl;
        }

        setDoc(doc(db, 'users', currentUser.id, 'customFoods', newFood.id), firestorePayload).catch((err) => {
          console.warn('Firestore customFoods setDoc error:', err);
        });
      }
      return updated;
    });
    return newFood;
  }, [currentUser]);

  const deleteCustomFood = useCallback((foodId: string) => {
    setCustomFoods((prev) => {
      const updated = prev.filter((f) => f.id !== foodId);
      const uid = currentUser?.id || 'guest';
      AsyncStorage.setItem(getUserCustomFoodsKey(uid), JSON.stringify(updated)).catch(console.error);

      const authUid = auth.currentUser?.uid;
      if (authUid && currentUser && !currentUser.isGuest && !currentUser.id.startsWith('demo_') && authUid === currentUser.id) {
        deleteDoc(doc(db, 'users', currentUser.id, 'customFoods', foodId)).catch((err) => {
          console.warn('Firestore customFoods deleteDoc error:', err);
        });
      }
      return updated;
    });
  }, [currentUser]);

  const updateGoals = useCallback((newGoals: Partial<UserGoals>) => {
    setUserGoals((prev) => ({
      ...prev,
      ...newGoals,
    }));
  }, []);

  // Past 7 days data for analytics with complete metrics (calories, macros, water, steps, burn)
  const weeklyLogs = useMemo((): WeeklyTrendItem[] => {
    const results: WeeklyTrendItem[] = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const parts = selectedDate.split('-');
    const curr = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    // Only in Demo Guest mode do we use baseline preview days
    const isGuest = currentUser?.isGuest;
    const baselineDays = [
      { cals: 1840, carbs: 195, protein: 72, fat: 46, fiber: 26, water: 2250, steps: 9400, burn: 376 },
      { cals: 1720, carbs: 180, protein: 68, fat: 42, fiber: 24, water: 1750, steps: 8100, burn: 324 },
      { cals: 1950, carbs: 210, protein: 78, fat: 50, fiber: 28, water: 2500, steps: 11200, burn: 448 },
      { cals: 1680, carbs: 175, protein: 65, fat: 40, fiber: 22, water: 1500, steps: 7600, burn: 304 },
      { cals: 1890, carbs: 200, protein: 74, fat: 48, fiber: 27, water: 2000, steps: 10400, burn: 416 },
      { cals: 1780, carbs: 190, protein: 70, fat: 44, fiber: 25, water: 2250, steps: 8900, burn: 356 },
      { cals: 1820, carbs: 195, protein: 72, fat: 45, fiber: 26, water: 2000, steps: 9200, burn: 368 },
    ];

    const realToday = getTodayDateString();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(curr);
      d.setDate(curr.getDate() - i);
      const dateStr = getTodayDateString(d);
      const log = dailyLogs[dateStr];
      const fallback = isGuest ? baselineDays[i % baselineDays.length] : null;

      const hasMeals = log && Array.isArray(log.meals) && log.meals.length > 0;
      const cals = hasMeals ? log.meals.reduce((sum, m) => sum + m.calories, 0) : (fallback ? fallback.cals : 0);
      const carbs = hasMeals ? log.meals.reduce((sum, m) => sum + m.carbs, 0) : (fallback ? fallback.carbs : 0);
      const protein = hasMeals ? log.meals.reduce((sum, m) => sum + m.protein, 0) : (fallback ? fallback.protein : 0);
      const fat = hasMeals ? log.meals.reduce((sum, m) => sum + m.fat, 0) : (fallback ? fallback.fat : 0);
      const fiber = hasMeals ? log.meals.reduce((sum, m) => sum + (m.fiber || 0), 0) : (fallback ? fallback.fiber : 0);
      const waterMl = log && typeof log.waterMl === 'number' && log.waterMl > 0 ? log.waterMl : (fallback ? fallback.water : 0);
      const steps = log && typeof log.steps === 'number' && log.steps > 0 ? log.steps : (fallback ? fallback.steps : 0);
      const workoutBurn = log && Array.isArray(log.activities) ? log.activities.reduce((sum, a) => sum + a.caloriesBurned, 0) : 0;
      const stepBurn = steps > 0 ? Math.round(steps * 0.04) : (fallback ? fallback.burn : 0);
      const burned = stepBurn + workoutBurn;

      results.push({
        date: dateStr,
        dayName: dateStr === realToday ? 'Today' : dayLabels[d.getDay()],
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
  }, [selectedDate, dailyLogs, userGoals.dailyCalorieBudget, currentUser]);

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      isLoggingOutRef.current = false;
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

        // Await full hydration of profile, goals, and all historical dailyLogs from Firestore
        await fetchAndHydrateUserData(fbUser.uid, userObj);

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
        if (fbErr.code === 'auth/user-disabled') {
          return { success: false, error: 'This account has been disabled. Please contact support.' };
        }
        if (fbErr.code === 'auth/network-request-failed') {
          return { success: false, error: 'Network error. Please check your internet connection and try again.' };
        }
        return { success: false, error: fbErr.message || 'Login failed. Please try again.' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  }, []);

  /**
   * Scientific Calorie & Macro Target Calibration based on Mifflin-St Jeor Equation
   */
  const calculateCalibratedGoals = (
    data: {
      name: string;
      age?: number;
      weight?: number;
      weightUnit?: 'kg' | 'lbs';
      heightCm?: number;
      goal?: string;
      gender?: string;
    },
    baseGoals: UserGoals = userGoals
  ): UserGoals => {
    const userAge = data.age && data.age > 0 ? data.age : (baseGoals.age || 24);
    const rawWeight = data.weight && data.weight > 0 ? data.weight : (baseGoals.currentWeightKg || 68);
    const weightUnit = data.weightUnit || baseGoals.weightUnit || 'kg';

    // Normalize weight to kilograms
    const weightKg = weightUnit === 'lbs'
      ? Math.round((rawWeight / 2.20462) * 10) / 10
      : rawWeight;

    const gender = data.gender || baseGoals.gender || 'male';
    const goal = data.goal || baseGoals.goal || 'maintain';

    // Height from user onboarding input or intelligent gender default
    const heightCm = data.heightCm || (gender === 'female' ? 163 : gender === 'other' ? 170 : 175);

    // Gender constant s in Mifflin-St Jeor equation
    const s = gender === 'female' ? -161 : gender === 'other' ? -78 : 5;

    // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + s
    const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * userAge + s);

    // Moderate physical activity factor (1.375)
    const tdee = Math.round(bmr * 1.375);

    // Calorie target adjusted for goal
    let dailyCalorieBudget: number;
    let targetWeightKg: number;

    if (goal === 'lose') {
      // 400 kcal deficit for sustainable fat loss (~0.4 - 0.5 kg/week)
      dailyCalorieBudget = Math.max(1250, tdee - 400);
      targetWeightKg = Math.max(35, Math.round((weightKg - 5) * 10) / 10);
    } else if (goal === 'gain') {
      // 350 kcal surplus for lean muscle hypertrophy
      dailyCalorieBudget = tdee + 350;
      targetWeightKg = Math.round((weightKg + 4) * 10) / 10;
    } else {
      // Maintenance equilibrium
      dailyCalorieBudget = tdee;
      targetWeightKg = weightKg;
    }

    // Macro split calculation:
    // Protein: 1.8g per kg body weight
    const targetProtein = Math.round(weightKg * 1.8);
    const proteinCalories = targetProtein * 4;

    // Fat: 25% of daily calories
    const targetFat = Math.round((dailyCalorieBudget * 0.25) / 9);
    const fatCalories = targetFat * 9;

    // Carbs: Remaining calories
    const remainingCalories = Math.max(200, dailyCalorieBudget - proteinCalories - fatCalories);
    const targetCarbs = Math.round(remainingCalories / 4);

    // Water goal: ~35ml per kg body weight rounded to nearest 250ml
    const rawWaterMl = weightKg * 35;
    const waterGoalMl = Math.max(2000, Math.round(rawWaterMl / 250) * 250);

    return {
      ...baseGoals,
      name: data.name || baseGoals.name,
      dailyCalorieBudget,
      targetProtein,
      targetCarbs,
      targetFat,
      targetFiber: 30,
      waterGoalMl,
      stepGoal: 10000,
      currentWeightKg: weightKg,
      targetWeightKg,
      streakDays: 1,
      age: userAge,
      gender,
      goal,
      weightUnit,
      heightCm,
      startWeightKg: baseGoals.startWeightKg || weightKg,
    };
  };

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
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

        // Scientifically calibrate personalized calorie budget and macro ratios
        const newGoals: UserGoals = calculateCalibratedGoals(data, userGoals);
        updateGoals(newGoals);

        // Save profile and goals to Cloud Firestore
        try {
          const profilePayload = sanitizeForFirestore({
            id: fbUser.uid,
            name: data.name,
            email: normalizedEmail,
            age: data.age || newGoals.age || 24,
            weight: data.weight || newGoals.currentWeightKg || 68,
            weightUnit: data.weightUnit || newGoals.weightUnit || 'kg',
            goal: data.goal || newGoals.goal || 'maintain',
            gender: data.gender || newGoals.gender || 'male',
            heightCm: newGoals.heightCm || 175,
            startWeightKg: newGoals.startWeightKg || (data.weight || newGoals.currentWeightKg || 68),
            goals: sanitizeForFirestore(newGoals),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(db, 'users', fbUser.uid), profilePayload, { merge: true });
          hydratedUidRef.current = fbUser.uid;

          // Initialize a fresh clean 0-kcal day for the new user
          const todayStr = getTodayDateString();
          const cleanLog: DailyLog = {
            date: todayStr,
            meals: [],
            waterMl: 0,
            steps: 0,
            activities: [],
          };
          setDailyLogs({ [todayStr]: cleanLog });
          await AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify({ [todayStr]: cleanLog }));
          await AsyncStorage.setItem(getUserLogsKey(fbUser.uid), JSON.stringify({ [todayStr]: cleanLog }));
          await setDoc(doc(db, 'users', fbUser.uid, 'dailyLogs', todayStr), cleanLog, { merge: true });
          hydratedUidRef.current = fbUser.uid;
        } catch (fsErr) {
          console.warn('Firestore register doc write error:', fsErr);
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
        if (fbErr.code === 'auth/operation-not-allowed') {
          return { success: false, error: 'Email/password registration is not enabled. Please contact support.' };
        }
        if (fbErr.code === 'auth/network-request-failed') {
          return { success: false, error: 'Network error. Please check your internet connection and try again.' };
        }
        return { success: false, error: fbErr.message || 'Registration failed. Please try again.' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  }, [userGoals, updateGoals]);

  const logout = useCallback(async (): Promise<void> => {
    isLoggingOutRef.current = true;
    hydratedUidRef.current = null;

    // Invalidate in-memory API key cache so next login restores from Firestore
    SecureKeyStorage.invalidateCache();

    const uid = auth.currentUser?.uid;

    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.log('Firebase signOut error:', e);
    } finally {
      const todayStr = getTodayDateString();
      const emptyLog: DailyLog = {
        date: todayStr,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      };
      setCurrentUser(null);
      setUserGoals(DEFAULT_GOALS);
      setDailyLogs({ [todayStr]: emptyLog });
      setCustomFoods([]);
      setSelectedDate(todayStr);
      try {
        const keysToRemove = [
          STORAGE_KEYS.AUTH,
          STORAGE_KEYS.DAILY_LOGS,
          STORAGE_KEYS.USER_GOALS,
        ];
        if (uid) {
          keysToRemove.push(
            getUserLogsKey(uid),
            getUserGoalsKey(uid),
            getUserCustomFoodsKey(uid)
          );
        }
        await AsyncStorage.multiRemove(keysToRemove);
      } catch (storageErr) {
        console.warn('AsyncStorage clear error on logout:', storageErr);
      }

      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 500);
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      isLoggingOutRef.current = true;
      hydratedUidRef.current = null;
      const fbUser = auth.currentUser;
      if (fbUser) {
        const uid = fbUser.uid;

        // 1. Purge all user subcollections in Firestore before root document deletion (prevents orphaned PII)
        const subcollections = ['dailyLogs', 'customFoods', 'chatHistory'];
        for (const sub of subcollections) {
          try {
            const colRef = collection(db, 'users', uid, sub);
            const snap = await getDocs(colRef);
            if (!snap.empty) {
              const BATCH_SIZE = 400;
              for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = snap.docs.slice(i, i + BATCH_SIZE);
                chunk.forEach((d) => batch.delete(d.ref));
                await batch.commit();
              }
            }
          } catch (subErr) {
            console.warn(`Error purging subcollection ${sub} during account deletion:`, subErr);
          }
        }

        // 2. Delete Firestore root user document
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (fsErr) {
          console.warn('Error deleting Firestore user document:', fsErr);
        }

        // 3. Delete user from Firebase Auth
        try {
          await deleteUser(fbUser);
        } catch (authErr: any) {
          console.log('Firebase deleteUser error:', authErr.code, authErr.message);
          isLoggingOutRef.current = false;
          if (authErr.code === 'auth/requires-recent-login') {
            return {
              success: false,
              error: 'For your security, please sign out and sign back in before deleting your account.',
            };
          }
          return {
            success: false,
            error: authErr.message || 'Failed to delete account. Please try again.',
          };
        }

        // 4. Clear user-scoped offline storage and keys
        try {
          await AsyncStorage.removeItem(getUserLogsKey(uid));
          await AsyncStorage.removeItem(getUserGoalsKey(uid));
          await AsyncStorage.removeItem(getUserCustomFoodsKey(uid));
        } catch (e) {}

        // 5. Purge any stored Gemini API key
        await SecureKeyStorage.removeApiKey().catch(() => {});
      }

      // 4. Clear local state and cache
      const todayStr = getTodayDateString();
      const emptyLog: DailyLog = {
        date: todayStr,
        meals: [],
        waterMl: 0,
        steps: 0,
        activities: [],
      };
      setCurrentUser(null);
      setUserGoals(DEFAULT_GOALS);
      setDailyLogs({ [todayStr]: emptyLog });
      setSelectedDate(todayStr);
      try {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH,
          STORAGE_KEYS.DAILY_LOGS,
          STORAGE_KEYS.USER_GOALS,
        ]);
      } catch (storageErr) {
        console.warn('AsyncStorage clear error on deleteAccount:', storageErr);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete account' };
    } finally {
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 500);
    }
  }, []);

  const loginDemo = useCallback(async (): Promise<void> => {
    const demoUser: AuthUser = {
      id: 'demo_user_1',
      email: 'akshay.rajput@example.com',
      name: 'Akshay Rajput',
      isGuest: true,
    };
    setCurrentUser(demoUser);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(demoUser));
  }, []);

  const contextValue = useMemo<HealthContextType>(
    () => ({
      selectedDate,
      setSelectedDate,
      shiftDate,
      userGoals,
      updateGoals,
      foodDatabase,
      dailyLogs,
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
      removeWaterEntry,
      updateWaterEntry,
      resetWater,
      addWorkout,
      removeWorkout,
      addSteps,
      removeStepEntry,
      batchUpdateDailySteps,
      logWeight,
      updateWeightEntry,
      deleteWeightEntry,
      addCustomFood,
      deleteCustomFood,
      weeklyLogs,
      currentUser,
      isAuthenticated: !!currentUser,
      isAuthLoading,
      login,
      register,
      logout,
      deleteAccount,
      loginDemo,
    }),
    [
      selectedDate,
      shiftDate,
      userGoals,
      updateGoals,
      foodDatabase,
      dailyLogs,
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
      removeWaterEntry,
      updateWaterEntry,
      resetWater,
      addWorkout,
      removeWorkout,
      addSteps,
      removeStepEntry,
      batchUpdateDailySteps,
      logWeight,
      updateWeightEntry,
      deleteWeightEntry,
      addCustomFood,
      deleteCustomFood,
      weeklyLogs,
      currentUser,
      isAuthLoading,
      login,
      register,
      logout,
      deleteAccount,
      loginDemo,
    ]
  );

  const authValue = useMemo<AuthContextValue>(() => ({
    currentUser,
    isAuthenticated: !!currentUser,
    isAuthLoading,
    login,
    register,
    logout,
    deleteAccount,
    loginDemo,
  }), [currentUser, isAuthLoading, login, register, logout, deleteAccount, loginDemo]);

  const goalsValue = useMemo<GoalsContextValue>(() => ({
    userGoals,
    updateGoals,
  }), [userGoals, updateGoals]);

  const dailyLogValue = useMemo<DailyLogContextValue>(() => ({
    selectedDate,
    setSelectedDate,
    shiftDate,
    dailyLogs,
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
    removeWaterEntry,
    updateWaterEntry,
    resetWater,
    addWorkout,
    removeWorkout,
    addSteps,
    removeStepEntry,
    batchUpdateDailySteps,
    logWeight,
    updateWeightEntry,
    deleteWeightEntry,
  }), [
    selectedDate,
    shiftDate,
    dailyLogs,
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
    removeWaterEntry,
    updateWaterEntry,
    resetWater,
    addWorkout,
    removeWorkout,
    addSteps,
    removeStepEntry,
    batchUpdateDailySteps,
    logWeight,
    updateWeightEntry,
    deleteWeightEntry,
  ]);

  const analyticsValue = useMemo<AnalyticsContextValue>(() => ({
    weeklyLogs,
    dailyLogs,
  }), [weeklyLogs, dailyLogs]);

  const foodValue = useMemo<FoodContextValue>(() => ({
    foodDatabase,
    addCustomFood,
    deleteCustomFood,
  }), [foodDatabase, addCustomFood, deleteCustomFood]);

  return (
    <HealthContext.Provider value={contextValue}>
      <AuthContext.Provider value={authValue}>
        <GoalsContext.Provider value={goalsValue}>
          <DailyLogContext.Provider value={dailyLogValue}>
            <AnalyticsContext.Provider value={analyticsValue}>
              <FoodContext.Provider value={foodValue}>
                {children}
              </FoodContext.Provider>
            </AnalyticsContext.Provider>
          </DailyLogContext.Provider>
        </GoalsContext.Provider>
      </AuthContext.Provider>
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

const useRequiredContext = <T,>(context: React.Context<T | undefined>, name: string): T => {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${name} must be used within HealthProvider`);
  }
  return value;
};

export const useAuth = () => useRequiredContext(AuthContext, 'useAuth');
export const useGoals = () => useRequiredContext(GoalsContext, 'useGoals');
export const useDailyLog = () => useRequiredContext(DailyLogContext, 'useDailyLog');
export const useAnalytics = () => useRequiredContext(AnalyticsContext, 'useAnalytics');
export const useFoodData = () => useRequiredContext(FoodContext, 'useFoodData');
