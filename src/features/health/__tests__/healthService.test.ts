import { connectHealth, getTodaySteps } from '../healthService';
import * as healthConnect from '../healthConnect';
import * as healthPermissions from '../healthPermissions';

jest.mock('../healthConnect');
jest.mock('../healthPermissions');

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

  describe('getTodaySteps', () => {
    test('returns COUNT_TOTAL from aggregate query', async () => {
      jest.spyOn(healthConnect, 'getTodayStepsAggregate').mockResolvedValue({
        COUNT_TOTAL: 7842,
        dataOrigins: ['com.google.android.apps.fitness'],
      } as any);

      const steps = await getTodaySteps();
      expect(steps).toBe(7842);
    });

    test('returns 0 when aggregate result is null', async () => {
      jest.spyOn(healthConnect, 'getTodayStepsAggregate').mockResolvedValue(null);

      const steps = await getTodaySteps();
      expect(steps).toBe(0);
    });
  });
});
