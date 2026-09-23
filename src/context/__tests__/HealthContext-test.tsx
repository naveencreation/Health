import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HealthProvider,
  useHealth,
  cleanDailyLog,
  sanitizeForFirestore,
  computeStreak,
  getUserLogsKey,
  getUserGoalsKey,
  getUserCustomFoodsKey,
  STORAGE_KEYS,
} from '../HealthContext';
import type { DailyLog, FoodItem } from '@/types';

// --- Firebase / storage / secure-store mocks (provider pulls all of these in) ---

let mockAuthCallback: ((user: any) => any) | null = null;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn((_auth: any, cb: any) => {
    mockAuthCallback = cb;
    return jest.fn();
  }),
  updateProfile: jest.fn(() => Promise.resolve()),
  deleteUser: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  collection: jest.fn(() => ({})),
  getDocs: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn((...a: any[]) => a),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

jest.mock('@/services/ai/storage/SecureKeyStorage', () => ({
  SecureKeyStorage: {
    restoreFromFirestore: jest.fn(() => Promise.resolve(false)),
    invalidateCache: jest.fn(),
    getApiKey: jest.fn(),
    saveApiKey: jest.fn(),
    removeApiKey: jest.fn(),
    hasApiKey: jest.fn(),
    getMaskedKey: jest.fn(),
  },
}));

jest.mock('@/data/avatars', () => ({
  DEFAULT_AVATAR_URL: 'asset:men',
  LOCAL_AVATAR_ASSETS: {},
  isLocalAssetAvatar: jest.fn(),
  getLocalAssetSource: jest.fn(),
  SVG_AVATARS: {},
  isSvgAvatar: jest.fn(),
  getSvgAvatar: jest.fn(),
  AVATAR_PRESETS: [],
}));

// --- Pure reducers / helpers ---

describe('cleanDailyLog', () => {
  test('returns an empty log for null/undefined input', () => {
    expect(cleanDailyLog(undefined)).toEqual({
      date: '',
      meals: [],
      waterMl: 0,
      steps: 0,
      activities: [],
    });
  });

  test('strips sample meals and the demo activity', () => {
    const log: DailyLog = {
      date: '2026-09-23',
      waterMl: 1250,
      steps: 4620,
      meals: [
        { id: 'sample_1', name: 'Idli', mealType: 'breakfast', foodId: 'f', servingUnit: 's', quantity: 1, calories: 1, carbs: 1, protein: 1, fat: 1, fiber: 1, loggedAt: '' },
        { id: 'meal_keep', name: 'Real', mealType: 'lunch', foodId: 'f', servingUnit: 's', quantity: 1, calories: 1, carbs: 1, protein: 1, fat: 1, fiber: 1, loggedAt: '' },
      ],
      activities: [
        { id: 'act_1', name: 'Walk', durationMinutes: 25, caloriesBurned: 120, loggedAt: '' },
        { id: 'act_keep', name: 'Run', durationMinutes: 10, caloriesBurned: 50, loggedAt: '' },
      ],
    };
    const cleaned = cleanDailyLog(log);
    expect(cleaned.meals.map((m) => m.id)).toEqual(['meal_keep']);
    expect(cleaned.activities.map((a) => a.id)).toEqual(['act_keep']);
    expect(cleaned.waterMl).toBe(0);
    expect(cleaned.steps).toBe(0);
  });

  test('preserves legitimate water and step values', () => {
    const cleaned = cleanDailyLog({ date: 'x', meals: [], waterMl: 750, steps: 8000, activities: [] });
    expect(cleaned.waterMl).toBe(750);
    expect(cleaned.steps).toBe(8000);
  });
});

describe('sanitizeForFirestore', () => {
  test('passes through null and undefined', () => {
    expect(sanitizeForFirestore(null)).toBeNull();
    expect(sanitizeForFirestore(undefined)).toBeUndefined();
  });

  test('strips undefined keys from objects recursively', () => {
    const input = { a: 1, b: undefined, c: { d: undefined, e: 2 } };
    expect(sanitizeForFirestore(input)).toEqual({ a: 1, c: { e: 2 } });
  });

  test('maps arrays and keeps null values', () => {
    expect(sanitizeForFirestore([{ a: undefined, b: null, c: 1 }])).toEqual([{ b: null, c: 1 }]);
  });

  test('leaves Date instances untouched', () => {
    const d = new Date();
    expect(sanitizeForFirestore(d)).toBe(d);
  });
});

describe('computeStreak', () => {
  const activeLog = (date: string): DailyLog => ({
    date,
    meals: [{ id: 'm', foodId: 'f', name: 'n', mealType: 'lunch', servingUnit: 's', quantity: 1, calories: 100, carbs: 1, protein: 1, fat: 1, fiber: 1, loggedAt: '' }],
    waterMl: 0,
    steps: 0,
    activities: [],
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-23T12:00:00'));
  });
  afterEach(() => jest.useRealTimers());

  test('returns a minimum streak of 1 for empty logs', () => {
    expect(computeStreak({})).toBe(1);
  });

  test('counts consecutive active days', () => {
    expect(
      computeStreak({
        '2026-09-23': activeLog('2026-09-23'),
        '2026-09-22': activeLog('2026-09-22'),
      })
    ).toBe(2);
  });

  test('breaks at the first gap', () => {
    expect(
      computeStreak({
        '2026-09-23': activeLog('2026-09-23'),
        '2026-09-21': activeLog('2026-09-21'),
      })
    ).toBe(1);
  });

  test('counts a day active by water alone', () => {
    expect(
      computeStreak({
        '2026-09-23': { date: '2026-09-23', meals: [], waterMl: 500, steps: 0, activities: [] },
      })
    ).toBe(1);
  });
});

describe('storage key helpers', () => {
  test('formats user-scoped keys', () => {
    expect(getUserLogsKey('abc')).toBe('@calori_daily_logs_abc');
    expect(getUserGoalsKey('abc')).toBe('@calori_user_goals_abc');
    expect(getUserCustomFoodsKey('abc')).toBe('@calori_custom_foods_abc');
    expect(STORAGE_KEYS.DAILY_LOGS).toBe('@calori_daily_logs_v1');
  });
});

// --- Provider state reducers + auth restore ---

const FOOD: FoodItem = {
  id: 'paneer_butter_masala',
  name: 'Paneer Butter Masala',
  category: 'curries',
  categoryLabel: 'Dals & Curries',
  servingUnit: 'katori (150g)',
  defaultServingSize: 1,
  calories: 260,
  carbs: 12,
  protein: 9.5,
  fat: 19.5,
  fiber: 2,
};

let result: ReturnType<typeof useHealth>;

function Consumer() {
  result = useHealth();
  return null;
}

async function renderHarness() {
  await render(
    <HealthProvider>
      <Consumer />
    </HealthProvider>
  );
  await waitFor(() => {
    expect(Object.keys(result.dailyLogs).length).toBeGreaterThan(0);
  });
}

describe('HealthProvider state reducers', () => {
  beforeEach(async () => {
    mockAuthCallback = null;
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await renderHarness();
  });

  test('addMealItem accumulates calories and macros', async () => {
    await act(async () => {
      result.addMealItem('lunch', FOOD, 2);
    });
    expect(result.totalConsumed).toBe(520);
    expect(result.totalCarbs).toBe(24);
    expect(result.totalProtein).toBe(19);
    expect(result.totalFat).toBe(39);
    expect(result.totalFiber).toBe(4);
    expect(result.mealsByType.lunch).toHaveLength(1);
    expect(result.mealCalories.lunch).toBe(520);
  });

  test('removeMealItem removes a meal by id', async () => {
    let addedId = '';
    await act(async () => {
      addedId = result.addMealItem('breakfast', FOOD, 1).id;
    });
    expect(result.totalConsumed).toBe(260);
    await act(async () => {
      result.removeMealItem(addedId);
    });
    expect(result.totalConsumed).toBe(0);
    expect(result.mealsByType.breakfast).toHaveLength(0);
  });

  test('updateMealQuantity recomputes macros from the base food', async () => {
    let addedId = '';
    await act(async () => {
      addedId = result.addMealItem('dinner', FOOD, 1).id;
    });
    await act(async () => {
      result.updateMealQuantity(addedId, 3);
    });
    expect(result.totalConsumed).toBe(780);
    expect(result.totalCarbs).toBe(36);
  });

  test('addWater accumulates and resetWater clears', async () => {
    await act(async () => {
      result.addWater(250);
      result.addWater(250);
    });
    expect(result.currentLog.waterMl).toBe(500);
    await act(async () => {
      result.resetWater();
    });
    expect(result.currentLog.waterMl).toBe(0);
  });

  test('addWorkout and removeWorkout drive totalBurned', async () => {
    await act(async () => {
      result.addWorkout('Morning Run', 30, 200);
    });
    const workoutId = result.currentLog.activities[0].id;
    expect(result.totalBurned).toBe(200);
    await act(async () => {
      result.removeWorkout(workoutId);
    });
    expect(result.totalBurned).toBe(0);
  });

  test('addSteps contributes to totalBurned at ~0.04 kcal/step', async () => {
    await act(async () => {
      result.addSteps(5000);
    });
    expect(result.currentLog.steps).toBe(5000);
    expect(result.totalBurned).toBe(200);
  });

  test('updateGoals changes remainingCalories', async () => {
    expect(result.remainingCalories).toBe(result.userGoals.dailyCalorieBudget);
    await act(async () => {
      result.updateGoals({ dailyCalorieBudget: 2500 });
    });
    expect(result.userGoals.dailyCalorieBudget).toBe(2500);
    expect(result.remainingCalories).toBe(2500);
  });

  test('addCustomFood appears in the combined food database', async () => {
    const before = result.foodDatabase.length;
    await act(async () => {
      result.addCustomFood({
        name: 'Test Dish',
        calories: 100,
        carbs: 10,
        protein: 5,
        fat: 2,
        fiber: 1,
        category: 'snacks',
        categoryLabel: 'Snacks',
        servingUnit: 'serving',
        defaultServingSize: 1,
      });
    });
    expect(result.foodDatabase.length).toBe(before + 1);
    expect(result.foodDatabase.some((f) => f.name === 'Test Dish')).toBe(true);
  });
});

describe('HealthProvider auth restore', () => {
  beforeEach(() => {
    mockAuthCallback = null;
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  test('optimistically restores the cached user before auth resolves', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === STORAGE_KEYS.AUTH) {
        return Promise.resolve(JSON.stringify({ id: 'cached-uid', email: 'a@b.c', name: 'Cached' }));
      }
      return Promise.resolve(null);
    });

    await render(
      <HealthProvider>
        <Consumer />
      </HealthProvider>
    );

    await waitFor(() => {
      expect(result.currentUser?.id).toBe('cached-uid');
    });
    expect(result.isAuthLoading).toBe(false);
    expect(result.isAuthenticated).toBe(true);
  });

  test('onAuthStateChanged is authoritative and corrects the cached user', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === STORAGE_KEYS.AUTH) {
        return Promise.resolve(JSON.stringify({ id: 'cached-uid', email: 'a@b.c', name: 'Cached' }));
      }
      return Promise.resolve(null);
    });

    await render(
      <HealthProvider>
        <Consumer />
      </HealthProvider>
    );

    await waitFor(() => expect(result.currentUser?.id).toBe('cached-uid'));

    await act(async () => {
      await mockAuthCallback?.({ uid: 'real-uid', email: 'real@b.c', displayName: 'Real' });
    });

    await waitFor(() => {
      expect(result.currentUser?.id).toBe('real-uid');
    });
  });

  test('logout resets state to a clean empty day', async () => {
    await renderHarness();

    await act(async () => {
      result.addMealItem('lunch', FOOD, 1);
      result.addCustomFood({
        name: 'Temp Food',
        calories: 1,
        carbs: 1,
        protein: 1,
        fat: 1,
        fiber: 1,
        category: 'snacks',
        categoryLabel: 'Snacks',
        servingUnit: 'serving',
        defaultServingSize: 1,
      });
      result.updateGoals({ dailyCalorieBudget: 3000 });
    });

    await act(async () => {
      await result.logout();
    });

    expect(result.currentUser).toBeNull();
    expect(result.userGoals.dailyCalorieBudget).toBe(2213);
    expect(result.foodDatabase.some((f) => f.name === 'Temp Food')).toBe(false);
    expect(result.currentLog.meals).toHaveLength(0);
    expect(result.currentLog.waterMl).toBe(0);
  });
});
