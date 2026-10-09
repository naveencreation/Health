import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { HealthProvider } from '../HealthContext';
import { useAuth } from '../auth';
import { useGoals } from '../goals';
import { useDailyLog, useAnalytics } from '../logs';
import { useFoodData } from '../food';

// Mocks
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
  onAuthStateChanged: jest.fn(() => jest.fn()),
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
  },
}));

describe('Domain Context Hooks outside Provider', () => {
  test('useAuth throws if outside provider', async () => {
    await expect(async () => {
      await renderHook(() => useAuth());
    }).rejects.toThrow('useAuth must be used within an AuthProvider or HealthProvider');
  });

  test('useGoals throws if outside provider', async () => {
    await expect(async () => {
      await renderHook(() => useGoals());
    }).rejects.toThrow('useGoals must be used within a GoalsProvider or HealthProvider');
  });

  test('useDailyLog throws if outside provider', async () => {
    await expect(async () => {
      await renderHook(() => useDailyLog());
    }).rejects.toThrow('useDailyLog must be used within a DailyLogProvider or HealthProvider');
  });

  test('useAnalytics throws if outside provider', async () => {
    await expect(async () => {
      await renderHook(() => useAnalytics());
    }).rejects.toThrow('useAnalytics must be used within an AnalyticsProvider or HealthProvider');
  });

  test('useFoodData throws if outside provider', async () => {
    await expect(async () => {
      await renderHook(() => useFoodData());
    }).rejects.toThrow('useFoodData must be used within a FoodProvider or HealthProvider');
  });
});

describe('Domain Context Hooks within HealthProvider', () => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <HealthProvider>{children}</HealthProvider>
  );

  test('useAuth provides authenticated state and methods', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.applyOnboardingPlan).toBe('function');
  });

  test('useGoals provides userGoals and updateGoals method', async () => {
    const { result } = await renderHook(() => useGoals(), { wrapper });
    expect(result.current.userGoals).toBeDefined();
    expect(typeof result.current.updateGoals).toBe('function');
  });

  test('useDailyLog provides daily log and logging actions', async () => {
    const { result } = await renderHook(() => useDailyLog(), { wrapper });
    expect(result.current.selectedDate).toBeDefined();
    expect(typeof result.current.addMealItem).toBe('function');
    expect(typeof result.current.addWater).toBe('function');
    expect(typeof result.current.addSteps).toBe('function');
  });

  test('useAnalytics provides weeklyLogs and dailyLogs', async () => {
    const { result } = await renderHook(() => useAnalytics(), { wrapper });
    expect(Array.isArray(result.current.weeklyLogs)).toBe(true);
    expect(result.current.dailyLogs).toBeDefined();
  });

  test('useFoodData provides foodDatabase and custom food actions', async () => {
    const { result } = await renderHook(() => useFoodData(), { wrapper });
    expect(Array.isArray(result.current.foodDatabase)).toBe(true);
    expect(typeof result.current.addCustomFood).toBe('function');
    expect(typeof result.current.deleteCustomFood).toBe('function');
  });
});
