import { renderHook, act } from '@testing-library/react-native';
import { useWeight } from '../useWeight';

const mockLogWeight = jest.fn();
const mockUpdateWeightEntry = jest.fn();
const mockDeleteWeightEntry = jest.fn();
const mockUpdateGoals = jest.fn();

let mockDailyLogData: any = {
  weightKg: 70.0,
  weightEntries: [
    { id: 'w_1', weightKg: 70.0, loggedAt: '2026-10-04T08:00:00Z' },
    { id: 'w_2', weightKg: 70.5, loggedAt: '2026-10-04T07:00:00Z' },
  ],
};

let mockGoalsData: any = {
  currentWeightKg: 70.0,
  startWeightKg: 75.0,
  targetWeightKg: 65.0,
  weightUnit: 'kg',
  heightCm: 178,
};

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: '2026-10-04',
    currentLog: mockDailyLogData,
    dailyLogs: {
      '2026-10-04': mockDailyLogData,
      '2026-10-03': { weightKg: 70.8, weightEntries: [] },
    },
    logWeight: mockLogWeight,
    updateWeightEntry: mockUpdateWeightEntry,
    deleteWeightEntry: mockDeleteWeightEntry,
  }),
  useGoals: () => ({
    userGoals: mockGoalsData,
    updateGoals: mockUpdateGoals,
  }),
}));

describe('useWeight Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDailyLogData = {
      weightKg: 70.0,
      weightEntries: [
        { id: 'w_1', weightKg: 70.0, loggedAt: '2026-10-04T08:00:00Z' },
        { id: 'w_2', weightKg: 70.5, loggedAt: '2026-10-04T07:00:00Z' },
      ],
    };
    mockGoalsData = {
      currentWeightKg: 70.0,
      startWeightKg: 75.0,
      targetWeightKg: 65.0,
      weightUnit: 'kg',
      heightCm: 178,
    };
  });

  test('computes weight metrics, progress percentage, and BMI correctly', async () => {
    const { result } = await renderHook(() => useWeight());

    expect(result.current.date).toBe('2026-10-04');
    expect(result.current.unit).toBe('kg');
    expect(result.current.currentWeightKg).toBe(70.0);
    expect(result.current.startWeightKg).toBe(75.0);
    expect(result.current.targetWeightKg).toBe(65.0);
    expect(result.current.displayCurrentWeight).toBe('70.0');
    // Start is 75, target is 65 (span 10). Current is 70 (lost 5kg). Progress = 50%
    expect(result.current.progressPercent).toBe(50);
    // Delta between entries: 70.0 - 70.5 = -0.5
    expect(result.current.deltaKg).toBe(-0.5);
    expect(result.current.isLoss).toBe(true);
    expect(result.current.isGain).toBe(false);
    expect(result.current.displayDelta).toBe('0.5');
    // BMI: 70 / (1.78 * 1.78) = 22.1
    expect(result.current.bmi).toBe(22.1);
    expect(result.current.bmiCategory.name).toBe('Normal');
    expect(result.current.weightEntries).toHaveLength(2);
  });

  test('handles lbs conversion accurately', async () => {
    mockGoalsData = {
      ...mockGoalsData,
      weightUnit: 'lbs',
    };

    const { result } = await renderHook(() => useWeight());

    expect(result.current.unit).toBe('lbs');
    // 70 kg * 2.20462 = 154.3 lbs
    expect(result.current.displayCurrentWeight).toBe('154.3');
  });

  test('triggers logWeight, updateWeightEntry, deleteWeightEntry', async () => {
    const { result } = await renderHook(() => useWeight());

    await act(async () => {
      result.current.logWeight(69.8, '2026-10-04', 'Morning weigh-in');
    });
    expect(mockLogWeight).toHaveBeenCalledWith(
      69.8,
      '2026-10-04',
      'Morning weigh-in',
      undefined,
      undefined
    );

    await act(async () => {
      result.current.updateWeightEntry('w_1', { weightKg: 69.9 });
    });
    expect(mockUpdateWeightEntry).toHaveBeenCalledWith(
      'w_1',
      { weightKg: 69.9 },
      '2026-10-04',
      undefined
    );

    await act(async () => {
      result.current.deleteWeightEntry('w_1');
    });
    expect(mockDeleteWeightEntry).toHaveBeenCalledWith('w_1', '2026-10-04');
  });

  test('updates target weight and unit', async () => {
    const { result } = await renderHook(() => useWeight());

    await act(async () => {
      result.current.setTargetWeight(63.0);
    });
    expect(mockUpdateGoals).toHaveBeenCalledWith({ targetWeightKg: 63.0 });

    await act(async () => {
      result.current.setWeightUnit('lbs');
    });
    expect(mockUpdateGoals).toHaveBeenCalledWith({ weightUnit: 'lbs' });
  });
});
