import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('../healthConnect', () => {
  const actual = jest.requireActual('../healthConnect');
  return {
    ...actual,
    initializeHealthConnect: jest.fn(),
    isHealthConnectAvailable: jest.fn(),
    getTodayStepsAggregate: jest.fn(),
    getTodayStepsRecords: jest.fn(),
    getStepsAggregateForDate: jest.fn(),
    getStepsRecordsForDate: jest.fn(),
  };
});
jest.mock('../healthPermissions');

import {
  connectHealth,
  getTodaySteps,
  getStepsForDate,
  syncRolling48Hours,
  backfillPastSevenDays,
  isBackfillCompleted,
  markBackfillCompleted,
  fetchSingleDaySteps,
} from '../healthService';
import * as healthConnect from '../healthConnect';
import * as healthPermissions from '../healthPermissions';

describe('healthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connectHealth', () => {
    test('returns HEALTH_CONNECT_UNAVAILABLE when initialization fails', async () => {
      jest.spyOn(healthConnect, 'initializeHealthConnect').mockResolvedValue(false);

      const result = await connectHealth();

      expect(result).toEqual({
        success: false,
        reason: 'HEALTH_CONNECT_UNAVAILABLE',
      });
    });

    test('returns success when initialized and permission already granted', async () => {
      jest.spyOn(healthConnect, 'initializeHealthConnect').mockResolvedValue(true);
      jest.spyOn(healthPermissions, 'hasStepsPermission').mockResolvedValue(true);

      const result = await connectHealth();

      expect(result).toEqual({
        success: true,
        reason: null,
      });
    });

    test('requests permission and succeeds when not initially granted', async () => {
      jest.spyOn(healthConnect, 'initializeHealthConnect').mockResolvedValue(true);
      jest.spyOn(healthPermissions, 'hasStepsPermission').mockResolvedValue(false);
      jest.spyOn(healthPermissions, 'requestStepsPermission').mockResolvedValue(true);

      const result = await connectHealth();

      expect(healthPermissions.requestStepsPermission).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        reason: null,
      });
    });

    test('returns STEPS_PERMISSION_DENIED when permission request is rejected', async () => {
      jest.spyOn(healthConnect, 'initializeHealthConnect').mockResolvedValue(true);
      jest.spyOn(healthPermissions, 'hasStepsPermission').mockResolvedValue(false);
      jest.spyOn(healthPermissions, 'requestStepsPermission').mockResolvedValue(false);

      const result = await connectHealth();

      expect(result).toEqual({
        success: false,
        reason: 'STEPS_PERMISSION_DENIED',
      });
    });
  });

  describe('getStepsForDate & getTodaySteps', () => {
    test('returns aggregate steps when aggregate COUNT_TOTAL is present', async () => {
      jest.spyOn(healthConnect, 'getStepsAggregateForDate').mockResolvedValue({
        COUNT_TOTAL: 7842,
        dataOrigins: ['com.google.android.apps.fitness'],
      } as any);
      jest.spyOn(healthConnect, 'getStepsRecordsForDate').mockResolvedValue([]);

      const result = await getStepsForDate('2026-10-02');
      expect(result.steps).toBe(7842);

      const todaySteps = await getTodaySteps();
      expect(todaySteps).toBe(7842);
    });

    test('falls back to summing raw records when aggregate result is 0 or null', async () => {
      jest.spyOn(healthConnect, 'getStepsAggregateForDate').mockResolvedValue(null);
      jest.spyOn(healthConnect, 'getStepsRecordsForDate').mockResolvedValue([
        { count: 1200, startTime: '2026-10-02T08:00:00Z', endTime: '2026-10-02T08:30:00Z' },
        { count: 800, startTime: '2026-10-02T12:00:00Z', endTime: '2026-10-02T12:20:00Z' },
      ] as any);

      const result = await getStepsForDate('2026-10-02');
      expect(result.steps).toBe(2000);
      expect(result.records.length).toBe(2);
    });

    test('returns 0 when neither aggregate nor records exist', async () => {
      jest.spyOn(healthConnect, 'getStepsAggregateForDate').mockResolvedValue(null);
      jest.spyOn(healthConnect, 'getStepsRecordsForDate').mockResolvedValue([]);

      const result = await getStepsForDate('2026-10-02');
      expect(result.steps).toBe(0);
      expect(result.records).toEqual([]);
    });
  });

  describe('3-Tier Sync Architecture', () => {
    test('Tier 2: syncRolling48Hours fetches both today and yesterday', async () => {
      jest.spyOn(healthConnect, 'getStepsAggregateForDate').mockImplementation(async (dateStr: string) => {
        if (dateStr.endsWith('02')) return { COUNT_TOTAL: 5000 } as any;
        return { COUNT_TOTAL: 7500 } as any;
      });
      jest.spyOn(healthConnect, 'getStepsRecordsForDate').mockResolvedValue([]);

      const result = await syncRolling48Hours();
      expect(result.today).toBeDefined();
      expect(result.yesterday).toBeDefined();
      expect(typeof result.today.steps).toBe('number');
      expect(typeof result.yesterday.steps).toBe('number');
    });

    test('Tier 1: backfillPastSevenDays queries past 7 days and marks completed', async () => {
      jest.spyOn(healthConnect, 'getStepsAggregateForDate').mockResolvedValue({
        COUNT_TOTAL: 4000,
      } as any);
      jest.spyOn(healthConnect, 'getStepsRecordsForDate').mockResolvedValue([]);

      const backfilled = await backfillPastSevenDays();
      expect(backfilled.length).toBe(7);
      expect(backfilled[0].steps).toBe(4000);

      const isCompleted = await isBackfillCompleted();
      expect(isCompleted).toBe(true);
    });

    test('Tier 3: fetchSingleDaySteps delegates to getStepsForDate', async () => {
      jest.spyOn(healthConnect, 'getStepsAggregateForDate').mockResolvedValue({
        COUNT_TOTAL: 9100,
      } as any);
      jest.spyOn(healthConnect, 'getStepsRecordsForDate').mockResolvedValue([]);

      const res = await fetchSingleDaySteps('2026-09-15');
      expect(res.steps).toBe(9100);
    });
  });
});
