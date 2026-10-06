import AsyncStorage from '@react-native-async-storage/async-storage';

export const FREE_DAILY_SCAN_LIMIT = 5;

export interface DailyScanStatus {
  used: number;
  remaining: number;
  maxLimit: number;
  isLimitReached: boolean;
  isPro: boolean;
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getScanStorageKey(dateKey: string, uid?: string): string {
  const userSegment = uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '_') : 'guest';
  return `@calori_ai_scans_${dateKey}_${userSegment}`;
}

/**
 * Retrieves the user's daily meal scan usage and remaining free scans.
 */
export async function getDailyScanStatus(
  uid?: string,
  isPro = false,
  customDate?: Date
): Promise<DailyScanStatus> {
  if (isPro) {
    return {
      used: 0,
      remaining: Infinity,
      maxLimit: Infinity,
      isLimitReached: false,
      isPro: true,
    };
  }

  const dateKey = getLocalDateKey(customDate);
  const key = getScanStorageKey(dateKey, uid);

  try {
    const raw = await AsyncStorage.getItem(key);
    const used = raw ? parseInt(raw, 10) || 0 : 0;
    const remaining = Math.max(0, FREE_DAILY_SCAN_LIMIT - used);

    return {
      used,
      remaining,
      maxLimit: FREE_DAILY_SCAN_LIMIT,
      isLimitReached: remaining <= 0,
      isPro: false,
    };
  } catch (error) {
    console.warn('[scanLimitService] Failed to read scan count:', error);
    return {
      used: 0,
      remaining: FREE_DAILY_SCAN_LIMIT,
      maxLimit: FREE_DAILY_SCAN_LIMIT,
      isLimitReached: false,
      isPro: false,
    };
  }
}

/**
 * Records an AI meal scan attempt that reached the AI inference engine.
 * Only call when the scan actually executes.
 */
export async function incrementDailyScan(
  uid?: string,
  customDate?: Date
): Promise<number> {
  const dateKey = getLocalDateKey(customDate);
  const key = getScanStorageKey(dateKey, uid);

  try {
    const raw = await AsyncStorage.getItem(key);
    const current = raw ? parseInt(raw, 10) || 0 : 0;
    const next = current + 1;
    await AsyncStorage.setItem(key, String(next));
    return next;
  } catch (error) {
    console.warn('[scanLimitService] Failed to increment scan count:', error);
    return 1;
  }
}
