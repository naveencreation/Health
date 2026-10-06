import { renderHook, act } from '@testing-library/react-native';
import { useMovement } from '../useMovement';

const mockAddSteps = jest.fn();
const mockRemoveStepEntry = jest.fn();
const mockBatchUpdateDailySteps = jest.fn();
const mockAddWorkout = jest.fn();
const mockRemoveWorkout = jest.fn();
const mockUpdateGoals = jest.fn();

let mockDailyLogData: any = {
  steps: 5000,
  activities: [
    {
      id: 'act_1',
      name: 'Brisk Walk',
      durationMinutes: 30,
      caloriesBurned: 130,
      loggedAt: '2026-10-04T08:00:00Z',
    },
    {
      id: 'act_2',
      name: 'Running',
      durationMinutes: 20,
      caloriesBurned: 200,
      loggedAt: '2026-10-04T18:00:00Z',
    },
  ],
  stepEntries: [
    {
      id: 'se_1',
      steps: 5000,
      durationMinutes: 45,
      caloriesBurned: 200,
      distanceKm: 3.8,
      loggedAt: '2026-10-04T08:00:00Z',
    },
  ],
};

let mockGoalsData: any = {
  stepGoal: 10000,
};

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: '2026-10-04',
    currentLog: mockDailyLogData,
    dailyLogs: {
      '2026-10-04': mockDailyLogData,
    },
    addSteps: mockAddSteps,
    removeStepEntry: mockRemoveStepEntry,
    batchUpdateDailySteps: mockBatchUpdateDailySteps,
    addWorkout: mockAddWorkout,
    removeWorkout: mockRemoveWorkout,
  }),
  useGoals: () => ({
    userGoals: mockGoalsData,
    updateGoals: mockUpdateGoals,
  }),
}));

describe('useMovement Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDailyLogData = {
      steps: 5000,
      activities: [
        {
          id: 'act_1',
          name: 'Brisk Walk',
          durationMinutes: 30,
          caloriesBurned: 130,
          loggedAt: '2026-10-04T08:00:00Z',
        },
        {
          id: 'act_2',
          name: 'Running',
          durationMinutes: 20,
          caloriesBurned: 200,
          loggedAt: '2026-10-04T18:00:00Z',
        },
      ],
      stepEntries: [
        {
          id: 'se_1',
          steps: 5000,
          durationMinutes: 45,
          caloriesBurned: 200,
          distanceKm: 3.8,
          loggedAt: '2026-10-04T08:00:00Z',
        },
      ],
    };
    mockGoalsData = {
      stepGoal: 10000,
    };
  });

  test('computes step metrics, burns, active minutes, and distance correctly', async () => {
    const { result } = await renderHook(() => useMovement());

    expect(result.current.date).toBe('2026-10-04');
    expect(result.current.steps).toBe(5000);
    expect(result.current.stepGoal).toBe(10000);
    expect(result.current.actualStepPercent).toBe(50);
    expect(result.current.barPercent).toBe(50);
    expect(result.current.isGoalReached).toBe(false);
    expect(result.current.distanceKm).toBe((5000 * 0.00076).toFixed(1)); // 3.8
    expect(result.current.stepBurnKcal).toBe(200); // 5000 * 0.04
    expect(result.current.activeMinutes).toBe(50); // 5000 / 100
    expect(result.current.workoutBurnKcal).toBe(330); // 130 + 200
    expect(result.current.totalBurnKcal).toBe(530); // 200 + 330
    expect(result.current.activities).toHaveLength(2);
    expect(result.current.stepEntries).toHaveLength(1);
  });

  test('clamps bar percentage to 100 when goal exceeded but preserves actualStepPercent', async () => {
    mockDailyLogData = {
      steps: 15000,
      activities: [],
      stepEntries: [],
    };

    const { result } = await renderHook(() => useMovement());

    expect(result.current.steps).toBe(15000);
    expect(result.current.actualStepPercent).toBe(150);
    expect(result.current.barPercent).toBe(100);
    expect(result.current.isGoalReached).toBe(true);
  });

  test('triggers addSteps, removeStepEntry, batchUpdateDailySteps', async () => {
    const { result } = await renderHook(() => useMovement());

    await act(async () => {
      result.current.addSteps(1000);
    });
    expect(mockAddSteps).toHaveBeenCalledWith(1000);

    await act(async () => {
      result.current.removeStepEntry('se_1');
    });
    expect(mockRemoveStepEntry).toHaveBeenCalledWith('se_1', '2026-10-04');

    const batch = [{ dateStr: '2026-10-04', steps: 6000 }];
    await act(async () => {
      result.current.batchUpdateDailySteps(batch);
    });
    expect(mockBatchUpdateDailySteps).toHaveBeenCalledWith(batch);
  });

  test('triggers workout actions and goal update', async () => {
    const { result } = await renderHook(() => useMovement());

    await act(async () => {
      result.current.addWorkout('Yoga', 45, 120);
    });
    expect(mockAddWorkout).toHaveBeenCalledWith('Yoga', 45, 120);

    await act(async () => {
      result.current.removeWorkout('act_1');
    });
    expect(mockRemoveWorkout).toHaveBeenCalledWith('act_1');

    await act(async () => {
      result.current.setStepGoal(12000);
    });
    expect(mockUpdateGoals).toHaveBeenCalledWith({ stepGoal: 12000 });
  });
});
