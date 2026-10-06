import { Platform } from 'react-native';
import {
  aggregateRecord,
  readRecords,
  getSdkStatus,
  initialize,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const status = await getSdkStatus();

    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch (error) {
    console.error('[HealthConnect] Availability check failed:', error);
    return false;
  }
}

let isInitialized = false;

export async function initializeHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    const available = await isHealthConnectAvailable();

    if (!available) {
      console.warn('[HealthConnect] Health Connect is not available');
      return false;
    }

    const initialized = await initialize();

    console.log('[HealthConnect] Initialized:', initialized);
    isInitialized = !!initialized;

    return isInitialized;
  } catch (error) {
    console.error('[HealthConnect] Initialization failed:', error);
    return false;
  }
}

/**
 * Computes exact start and end ISO strings for a given YYYY-MM-DD date in local timezone
 */
export function getDateStartAndEndIso(dateStr: string): { startTime: string; endTime: string } {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

export function getTodayDateIsoString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getStepsAggregateForDate(dateStr: string) {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const ready = await initializeHealthConnect();
    if (!ready) {
      return null;
    }

    const { startTime, endTime } = getDateStartAndEndIso(dateStr);

    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
    });

    console.log(`[HealthConnect] Aggregate result for ${dateStr}:`, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error(`[HealthConnect] Failed to read steps aggregate for ${dateStr}:`, error);
    return null;
  }
}

export async function getStepsRecordsForDate(dateStr: string) {
  if (Platform.OS !== 'android') {
    return [];
  }

  try {
    const ready = await initializeHealthConnect();
    if (!ready) {
      return [];
    }

    const { startTime, endTime } = getDateStartAndEndIso(dateStr);

    const response = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
    });

    console.log(`[HealthConnect] Records count for ${dateStr}:`, response?.records?.length || 0);
    return response?.records || [];
  } catch (error) {
    console.error(`[HealthConnect] Failed to read step records for ${dateStr}:`, error);
    return [];
  }
}

export async function getTodayStepsAggregate() {
  return getStepsAggregateForDate(getTodayDateIsoString());
}

export async function getTodayStepsRecords() {
  return getStepsRecordsForDate(getTodayDateIsoString());
}
