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

export async function getTodayStepsAggregate() {
  if (Platform.OS !== 'android') {
    return null;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  try {
    const ready = await initializeHealthConnect();
    if (!ready) {
      return null;
    }

    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });

    console.log('[HealthConnect] Raw aggregate result:', JSON.stringify(result));

    return result;
  } catch (error) {
    console.error('[HealthConnect] Failed to read steps aggregate:', error);
    return null;
  }
}

export async function getTodayStepsRecords() {
  if (Platform.OS !== 'android') {
    return [];
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  try {
    const ready = await initializeHealthConnect();
    if (!ready) {
      return [];
    }

    const response = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });

    console.log('[HealthConnect] Raw step records count:', response?.records?.length || 0);

    return response?.records || [];
  } catch (error) {
    console.error('[HealthConnect] Failed to read step records:', error);
    return [];
  }
}
