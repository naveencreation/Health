/**
 * RiaUsageCounter.test.ts
 * 
 * Unit tests for RiaUsageCounter:
 * - Date key formatting
 * - Guest and authenticated user reads
 * - Firestore fetching with AsyncStorage fallback
 * - Atomic increments
 * - In-flight pending count reservation and release
 * - Guest usage migration to authenticated user
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({});
const mockIncrement = jest.fn((val: number) => ({ _incrementVal: val }));

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  increment: (val: number) => mockIncrement(val),
}));

jest.mock('@/services/firebase', () => ({
  db: {},
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RiaUsageCounter, getLocalDateKey } from '../RiaUsageCounter';

describe('RiaUsageCounter', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    RiaUsageCounter.resetCache();
  });

  describe('getLocalDateKey', () => {
    it('formats a date as YYYY-MM-DD using local time', () => {
      const fixed = new Date(2026, 9, 6); // Month index 9 = October
      const key = getLocalDateKey(fixed);
      expect(key).toBe('2026-10-06');
    });

    it('pads single-digit month and day with zero', () => {
      const fixed = new Date(2026, 0, 5); // Month index 0 = January
      const key = getLocalDateKey(fixed);
      expect(key).toBe('2026-01-05');
    });
  });

  describe('getUsage', () => {
    it('returns default zero usage for new guest user', async () => {
      const usage = await RiaUsageCounter.getUsage(null, '2026-10-06');
      expect(usage).toEqual({
        chat: 0,
        scan: 0,
        updatedAt: '',
      });
    });

    it('reads saved guest usage from AsyncStorage', async () => {
      await AsyncStorage.setItem(
        '@calorify_guest_usage_2026-10-06',
        JSON.stringify({ chat: 2, scan: 1, updatedAt: '2026-10-06T10:00:00Z' })
      );

      const usage = await RiaUsageCounter.getUsage('guest', '2026-10-06');
      expect(usage.chat).toBe(2);
      expect(usage.scan).toBe(1);
    });

    it('fetches authenticated user usage from Firestore when available', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ chat: 3, scan: 2, updatedAt: '2026-10-06T12:00:00Z' }),
      });

      const usage = await RiaUsageCounter.getUsage('user_123', '2026-10-06');
      expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'user_123', 'usage', '2026-10-06');
      expect(usage.chat).toBe(3);
      expect(usage.scan).toBe(2);

      // Verify cached in AsyncStorage
      const cached = await AsyncStorage.getItem('@calorify_usage_user_123_2026-10-06');
      expect(cached).toBeDefined();
      expect(JSON.parse(cached!).chat).toBe(3);
    });

    it('falls back to local AsyncStorage if Firestore throws an error', async () => {
      await AsyncStorage.setItem(
        '@calorify_usage_user_123_2026-10-06',
        JSON.stringify({ chat: 1, scan: 4, updatedAt: '2026-10-06T08:00:00Z' })
      );

      mockGetDoc.mockRejectedValueOnce(new Error('Network offline'));

      const usage = await RiaUsageCounter.getUsage('user_123', '2026-10-06');
      expect(usage.chat).toBe(1);
      expect(usage.scan).toBe(4);
    });

    it('serves subsequent requests from memory cache without refetching', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ chat: 1, scan: 0, updatedAt: '' }),
      });

      // First call -> hits Firestore
      await RiaUsageCounter.getUsage('user_123', '2026-10-06');
      expect(mockGetDoc).toHaveBeenCalledTimes(1);

      // Second call -> hits in-memory cache
      const cachedUsage = await RiaUsageCounter.getUsage('user_123', '2026-10-06');
      expect(cachedUsage.chat).toBe(1);
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('incrementUsage', () => {
    it('optimistically increments chat counter and writes to Firestore', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const updated = await RiaUsageCounter.incrementUsage('chat', 'user_abc', '2026-10-06');
      expect(updated.chat).toBe(1);
      expect(updated.scan).toBe(0);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          chat: { _incrementVal: 1 },
        }),
        { merge: true }
      );
    });

    it('optimistically increments scan counter for guest in AsyncStorage only', async () => {
      const updated = await RiaUsageCounter.incrementUsage('scan', null, '2026-10-06');
      expect(updated.scan).toBe(1);
      expect(updated.chat).toBe(0);

      // Firestore should NOT be called for guest
      expect(mockSetDoc).not.toHaveBeenCalled();

      const stored = await AsyncStorage.getItem('@calorify_guest_usage_2026-10-06');
      expect(JSON.parse(stored!).scan).toBe(1);
    });
  });

  describe('In-flight pending counts', () => {
    it('manages in-flight chat counter accurately', () => {
      expect(RiaUsageCounter.getInFlightCount('chat')).toBe(0);

      RiaUsageCounter.reservePending('chat');
      expect(RiaUsageCounter.getInFlightCount('chat')).toBe(1);

      RiaUsageCounter.reservePending('chat');
      expect(RiaUsageCounter.getInFlightCount('chat')).toBe(2);

      RiaUsageCounter.releasePending('chat');
      expect(RiaUsageCounter.getInFlightCount('chat')).toBe(1);

      RiaUsageCounter.releasePending('chat');
      expect(RiaUsageCounter.getInFlightCount('chat')).toBe(0);

      // Clamps at 0
      RiaUsageCounter.releasePending('chat');
      expect(RiaUsageCounter.getInFlightCount('chat')).toBe(0);
    });

    it('manages in-flight scan counter accurately', () => {
      RiaUsageCounter.reservePending('scan');
      expect(RiaUsageCounter.getInFlightCount('scan')).toBe(1);
      RiaUsageCounter.clearInFlight();
      expect(RiaUsageCounter.getInFlightCount('scan')).toBe(0);
    });
  });

  describe('migrateGuestUsageToUser', () => {
    it('migrates guest usage to user and cleans up guest key', async () => {
      await AsyncStorage.setItem(
        '@calorify_guest_usage_2026-10-06',
        JSON.stringify({ chat: 2, scan: 1, updatedAt: '2026-10-06T09:00:00Z' })
      );

      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      await RiaUsageCounter.migrateGuestUsageToUser('user_new', '2026-10-06');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          chat: 2,
          scan: 1,
        }),
        { merge: true }
      );

      // Guest storage key should be deleted
      const guestKeyAfter = await AsyncStorage.getItem('@calorify_guest_usage_2026-10-06');
      expect(guestKeyAfter).toBeNull();
    });
  });
});
