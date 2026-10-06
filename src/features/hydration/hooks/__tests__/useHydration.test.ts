import { renderHook, act } from '@testing-library/react-native';
import { useHydration } from '../useHydration';

const mockAddWater = jest.fn();
const mockRemoveWaterEntry = jest.fn();
const mockUpdateWaterEntry = jest.fn();
const mockResetWater = jest.fn();
const mockUpdateGoals = jest.fn();

let mockDailyLogData: any = {
  waterMl: 1000,
  waterEntries: [
    { id: 'w1', amountMl: 500, beverageType: 'water', loggedAt: '2026-10-04T08:00:00Z' },
    { id: 'w2', amountMl: 500, beverageType: 'tea', loggedAt: '2026-10-04T12:00:00Z' },
  ],
};

let mockGoalsData: any = {
  waterGoalMl: 2000,
  cupSizeMl: 250,
};

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: '2026-10-04',
    currentLog: mockDailyLogData,
    dailyLogs: {
      '2026-10-04': mockDailyLogData,
    },
    addWater: mockAddWater,
    removeWaterEntry: mockRemoveWaterEntry,
    updateWaterEntry: mockUpdateWaterEntry,
    resetWater: mockResetWater,
  }),
  useGoals: () => ({
    userGoals: mockGoalsData,
    updateGoals: mockUpdateGoals,
  }),
}));

describe('useHydration Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDailyLogData = {
      waterMl: 1000,
      waterEntries: [
        { id: 'w1', amountMl: 500, beverageType: 'water', loggedAt: '2026-10-04T08:00:00Z' },
        { id: 'w2', amountMl: 500, beverageType: 'tea', loggedAt: '2026-10-04T12:00:00Z' },
      ],
    };
    mockGoalsData = {
      waterGoalMl: 2000,
      cupSizeMl: 250,
    };
  });

  test('computes intake, target, percentage, and remaining ml correctly', async () => {
    const { result } = await renderHook(() => useHydration());

    expect(result.current.date).toBe('2026-10-04');
    expect(result.current.currentWaterMl).toBe(1000);
    expect(result.current.targetWaterMl).toBe(2000);
    expect(result.current.percentage).toBe(50);
    expect(result.current.remainingWaterMl).toBe(1000);
    expect(result.current.cupSizeMl).toBe(250);
    expect(result.current.waterEntries).toHaveLength(2);
  });

  test('clamps remaining ml to 0 and caps percentage at 100 when goal met', async () => {
    mockDailyLogData = {
      waterMl: 2500,
      waterEntries: [],
    };

    const { result } = await renderHook(() => useHydration());

    expect(result.current.currentWaterMl).toBe(2500);
    expect(result.current.remainingWaterMl).toBe(0);
    expect(result.current.percentage).toBe(100);
  });

  test('triggers addWater, removeWaterEntry, updateWaterEntry, resetWater', async () => {
    const { result } = await renderHook(() => useHydration());

    await act(async () => {
      result.current.addWater(250, 'coffee');
    });
    expect(mockAddWater).toHaveBeenCalledWith(250, 'coffee');

    await act(async () => {
      result.current.removeWaterEntry('w1');
    });
    expect(mockRemoveWaterEntry).toHaveBeenCalledWith('w1', '2026-10-04');

    await act(async () => {
      result.current.updateWaterEntry('w2', 600);
    });
    expect(mockUpdateWaterEntry).toHaveBeenCalledWith('w2', { amountMl: 600 }, '2026-10-04');

    await act(async () => {
      result.current.resetWater();
    });
    expect(mockResetWater).toHaveBeenCalled();
  });

  test('updates daily goal and cup size', async () => {
    const { result } = await renderHook(() => useHydration());

    await act(async () => {
      result.current.setDailyGoal(3000);
    });
    expect(mockUpdateGoals).toHaveBeenCalledWith({ waterGoalMl: 3000 });

    await act(async () => {
      result.current.setCupSize(330);
    });
    expect(result.current.cupSizeMl).toBe(330);
  });
});
