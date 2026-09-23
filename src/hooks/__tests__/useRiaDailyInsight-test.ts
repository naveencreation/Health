import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRiaDailyInsight } from '../useRiaDailyInsight';
import { AIService } from '@/services/ai';
import type { DailyLog, UserGoals } from '@/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('@/services/ai', () => ({
  AIService: {
    isKeyConfigured: jest.fn(),
    getDailyInsight: jest.fn(),
  },
}));

const goals: UserGoals = {
  dailyCalorieBudget: 2200,
  targetProtein: 90,
  targetCarbs: 110,
  targetFat: 70,
  targetFiber: 30,
  waterGoalMl: 2000,
  stepGoal: 10000,
  currentWeightKg: 68,
  targetWeightKg: 65,
  streakDays: 1,
  avatarUrl: '',
  name: 'Naveen User',
  age: 24,
  gender: 'male',
  goal: 'maintain',
  weightUnit: 'kg',
  heightCm: 175,
  startWeightKg: 68,
  riaTone: 'supportive',
  waterReminder: true,
  mealReminder: true,
  stepReminder: false,
};

const log: DailyLog = {
  date: '2026-09-23',
  meals: [],
  waterMl: 500,
  steps: 1000,
  activities: [],
};

const params = (overrides: Partial<{ userGoals: UserGoals; currentLog: DailyLog; totalProtein: number; remainingCalories: number }> = {}) => ({
  userId: 'user-1',
  selectedDate: '2026-09-23',
  userGoals: overrides.userGoals || goals,
  currentLog: overrides.currentLog || log,
  totalProtein: overrides.totalProtein ?? 20,
  remainingCalories: overrides.remainingCalories ?? 1800,
});

describe('useRiaDailyInsight', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AIService.isKeyConfigured as jest.Mock).mockResolvedValue(true);
    (AIService.getDailyInsight as jest.Mock).mockResolvedValue('Cached coach insight');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('debounces a meaningful change into one AI request', async () => {
    const { result } = await renderHook(() => useRiaDailyInsight(params()));

    await act(async () => {
      jest.advanceTimersByTime(749);
    });
    expect(AIService.getDailyInsight).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(result.current).toBe('Cached coach insight');
    expect(AIService.getDailyInsight).toHaveBeenCalledTimes(1);
  });

  test('does not request again for water or step-only changes', async () => {
    const { rerender } = await renderHook(
      (value: ReturnType<typeof params>) => useRiaDailyInsight(value),
      { initialProps: params() }
    );

    await act(async () => {
      jest.advanceTimersByTime(750);
      await Promise.resolve();
    });
    expect(AIService.getDailyInsight).toHaveBeenCalledTimes(1);

    await act(async () => {
      await rerender(params({ currentLog: { ...log, waterMl: 1000, steps: 2000 } }));
      jest.advanceTimersByTime(750);
      await Promise.resolve();
    });
    expect(AIService.getDailyInsight).toHaveBeenCalledTimes(1);
  });

  test('reuses a matching user/date/fingerprint cache entry', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      fingerprint: JSON.stringify({
        userId: 'user-1',
        selectedDate: '2026-09-23',
        name: 'Naveen User',
        riaTone: 'supportive',
        dailyCalorieBudget: 2200,
        targetProtein: 90,
        targetCarbs: 110,
        targetFat: 70,
        targetWaterMl: 2000,
        stepGoal: 10000,
        meals: [],
      }),
      insight: 'Persisted insight',
    }));

    const { result } = await renderHook(() => useRiaDailyInsight(params()));
    await act(async () => {
      jest.advanceTimersByTime(750);
      await Promise.resolve();
    });

    expect(result.current).toBe('Persisted insight');
    expect(AIService.getDailyInsight).not.toHaveBeenCalled();
  });
});
