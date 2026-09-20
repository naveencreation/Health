import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { SecureKeyStorage } from '@/services/ai/storage/SecureKeyStorage';


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
  const cleanWater = (isMockLog && log.waterMl === 1250) || log.waterMl === 1250 ? 0 : (log.waterMl || 0);
  const cleanSteps = (isMockLog && log.steps === 4620) || log.steps === 4620 ? 0 : (log.steps || 0);
  return {
    ...log,
    meals: cleanMeals,
    activities: cleanActivities,
    waterMl: cleanWater,
    steps: cleanSteps,
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
  waterGoalMl: 2000,
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
  addWater: (ml: number) => void;
  resetWater: () => void;
  addWorkout: (name: string, durationMinutes: number, caloriesBurned: number) => void;
  removeWorkout: (id: string) => void;
  addSteps: (stepsCount: number) => void;
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

const HealthContext = createContext<HealthContextType | undefined>(undefined);

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
  const isHydratingRef = useRef(false);
  const hydratedUidRef = useRef<string | null>(null);

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
              age: data.age ?? data.goals.age,
              gender: data.gender ?? data.goals.gender,
              goal: data.goal ?? data.goals.goal,
              weightUnit: data.weightUnit ?? data.goals.weightUnit,
            };
            setUserGoals(mergedGoals);
            AsyncStorage.setItem(userGoalsKey, JSON.stringify(mergedGoals)).catch(() => {});
            AsyncStorage.setItem(STORAGE_KEYS.USER_GOALS, JSON.stringify(mergedGoals)).catch(() => {});
          }
        }
      } catch (userDocErr) {
        console.warn('Firestore fetch user doc error:', userDocErr);
      }

      // 3. Fetch ALL DailyLogs subcollection from Cloud Firestore
      const cloudLogs: Record<string, DailyLog> = {};
      try {
        const logsCollectionRef = collection(db, 'users', uid, 'dailyLogs');
        const logsSnap = await getDocs(logsCollectionRef);

        for (const d of logsSnap.docs) {
          const rawLog = d.data() as DailyLog;
          const cleansed = cleanDailyLog(rawLog);
          cloudLogs[d.id] = cleansed;

          // If legacy document in cloud had mock data, sanitize and overwrite it
          const hadMock =
            (rawLog.activities || []).some((a) => a.id === 'act_1') ||
            (rawLog.meals || []).some((m) => m.id.startsWith('sample_')) ||
            rawLog.waterMl === 1250 ||
            rawLog.steps === 4620;
          if (hadMock) {
            setDoc(doc(db, 'users', uid, 'dailyLogs', d.id), sanitizeForFirestore(cleansed), { merge: true }).catch(() => {});
          }
        }
      } catch (colErr) {
        console.warn('Firestore dailyLogs collection query error:', colErr);
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

      for (const [dateKey, log] of Object.entries(cloudLogs)) {
        merged[dateKey] = log;
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

        const savedGoals = await AsyncStorage.getItem(STORAGE_KEYS.USER_GOALS);
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

  // Save changes & sync dailyLogs to Firestore
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(dailyLogs)).catch(console.error);

    if (auth.currentUser && !currentUser?.isGuest) {
      AsyncStorage.setItem(getUserLogsKey(auth.currentUser.uid), JSON.stringify(dailyLogs)).catch(console.error);
    }

    // Cloud Firestore Sync - STRICTLY GUARDED against logout / unhydrated states
    if (
      !isLoggingOutRef.current &&
      !isHydratingRef.current &&
      auth.currentUser &&
      !currentUser?.isGuest &&
      hydratedUidRef.current === auth.currentUser.uid
    ) {
      const activeLog = dailyLogs[selectedDate];
      if (activeLog) {
        try {
          const payload = sanitizeForFirestore(activeLog);
          setDoc(doc(db, 'users', auth.currentUser.uid, 'dailyLogs', selectedDate), payload, { merge: true }).catch((err) => {
            console.warn('dailyLogs setDoc async error:', err);
          });
        } catch (err) {
          console.warn('dailyLogs setDoc sync error:', err);
        }
      }
    }
  }, [dailyLogs, isLoaded, selectedDate, currentUser]);

  // Save changes & sync userGoals to Firestore
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.USER_GOALS, JSON.stringify(userGoals)).catch(console.error);

    if (auth.currentUser && !currentUser?.isGuest) {
      AsyncStorage.setItem(getUserGoalsKey(auth.currentUser.uid), JSON.stringify(userGoals)).catch(console.error);
    }

    // Cloud Firestore Sync - STRICTLY GUARDED against logout / unhydrated states
    if (
      !isLoggingOutRef.current &&
      !isHydratingRef.current &&
      auth.currentUser &&
      !currentUser?.isGuest &&
      hydratedUidRef.current === auth.currentUser.uid
    ) {
      try {
        const payload = sanitizeForFirestore({ goals: userGoals });
        setDoc(doc(db, 'users', auth.currentUser.uid), payload, { merge: true }).catch((err) => {
          console.warn('userGoals setDoc async error:', err);
        });
      } catch (err) {
        console.warn('userGoals setDoc sync error:', err);
      }
    }
  }, [userGoals, isLoaded, currentUser]);

  useEffect(() => {
    if (!isLoaded) return;
    const uid = currentUser?.id || 'guest';
    AsyncStorage.setItem(getUserCustomFoodsKey(uid), JSON.stringify(customFoods)).catch(console.error);
  }, [customFoods, isLoaded, currentUser]);

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

  const addWater = useCallback((ml: number) => {
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

      if (currentUser && !currentUser.isGuest) {
        setDoc(doc(db, 'users', currentUser.id, 'customFoods', newFood.id), sanitizeForFirestore(newFood)).catch((err) => {
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

      if (currentUser && !currentUser.isGuest) {
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
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH,
          STORAGE_KEYS.DAILY_LOGS,
          STORAGE_KEYS.USER_GOALS,
        ]);
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
        // 1. Delete Firestore user document
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (fsErr) {
          console.warn('Error deleting Firestore user document:', fsErr);
        }

        // 2. Delete user from Firebase Auth
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

        // 3. Clear user-scoped offline storage
        try {
          await AsyncStorage.removeItem(getUserLogsKey(uid));
          await AsyncStorage.removeItem(getUserGoalsKey(uid));
        } catch (e) {}
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
      resetWater,
      addWorkout,
      removeWorkout,
      addSteps,
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
      resetWater,
      addWorkout,
      removeWorkout,
      addSteps,
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

  return (
    <HealthContext.Provider value={contextValue}>
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
