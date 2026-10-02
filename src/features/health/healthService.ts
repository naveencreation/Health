import {
  initializeHealthConnect,
  getTodayStepsAggregate,
  getTodayStepsRecords,
} from './healthConnect';

import {
  hasStepsPermission,
  requestStepsPermission,
} from './healthPermissions';

export async function connectHealth() {
  const initialized = await initializeHealthConnect();

  if (!initialized) {
    return {
      success: false,
      reason: 'HEALTH_CONNECT_UNAVAILABLE' as const,
    };
  }

  let hasPermission = await hasStepsPermission();

  if (!hasPermission) {
    hasPermission = await requestStepsPermission();
  }

  if (!hasPermission) {
    return {
      success: false,
      reason: 'STEPS_PERMISSION_DENIED' as const,
    };
  }

  return {
    success: true,
    reason: null,
  };
}

export async function getTodaySteps(): Promise<number> {
  const result = await getTodayStepsAggregate();
  const aggregateTotal = result?.COUNT_TOTAL ?? 0;

  if (aggregateTotal > 0) {
    console.log('[healthService] Got aggregate steps:', aggregateTotal);
    return Math.round(aggregateTotal);
  }

  // Fallback to summing raw records if aggregate returns 0
  const records = await getTodayStepsRecords();
  if (Array.isArray(records) && records.length > 0) {
    const sum = records.reduce((acc, r: any) => acc + (r.count || 0), 0);
    console.log('[healthService] Got sum from raw records:', sum, 'from records:', records.length);
    return Math.round(sum);
  }

  console.log('[healthService] Both aggregate and raw records returned 0 steps');
  return 0;
}
