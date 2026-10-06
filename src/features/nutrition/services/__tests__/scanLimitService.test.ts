import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDailyScanStatus,
  incrementDailyScan,
  getLocalDateKey,
  getScanStorageKey,
  FREE_DAILY_SCAN_LIMIT,
} from '../scanLimitService';

describe('scanLimitService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('getLocalDateKey', () => {
    it('formats a date as YYYY-MM-DD', () => {
      const fixed = new Date(2026, 9, 5); // Oct 5, 2026
      expect(getLocalDateKey(fixed)).toBe('2026-10-05');
    });
  });

  describe('getScanStorageKey', () => {
    it('uses guest fallback if uid is not provided', () => {
      expect(getScanStorageKey('2026-10-05')).toBe('@calori_ai_scans_2026-10-05_guest');
    });

    it('sanitizes user id in key', () => {
      expect(getScanStorageKey('2026-10-05', 'user@123')).toBe('@calori_ai_scans_2026-10-05_user_123');
    });
  });

  describe('getDailyScanStatus', () => {
    it('returns 5 remaining scans for a new guest', async () => {
      const status = await getDailyScanStatus();
      expect(status.used).toBe(0);
      expect(status.remaining).toBe(5);
      expect(status.maxLimit).toBe(5);
      expect(status.isLimitReached).toBe(false);
      expect(status.isPro).toBe(false);
    });

    it('returns unlimited scans for Pro users', async () => {
      const status = await getDailyScanStatus('user-pro', true);
      expect(status.remaining).toBe(Infinity);
      expect(status.maxLimit).toBe(Infinity);
      expect(status.isLimitReached).toBe(false);
      expect(status.isPro).toBe(true);
    });

    it('accurately counts used and remaining after incrementing', async () => {
      await incrementDailyScan('guest');
      await incrementDailyScan('guest');

      const status = await getDailyScanStatus('guest');
      expect(status.used).toBe(2);
      expect(status.remaining).toBe(3);
      expect(status.isLimitReached).toBe(false);
    });

    it('flags isLimitReached when user reaches 5 scans', async () => {
      for (let i = 0; i < FREE_DAILY_SCAN_LIMIT; i++) {
        await incrementDailyScan('user-1');
      }

      const status = await getDailyScanStatus('user-1');
      expect(status.used).toBe(5);
      expect(status.remaining).toBe(0);
      expect(status.isLimitReached).toBe(true);
    });
  });
});
