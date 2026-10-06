/**
 * RiaUsageCounter.ts
 * 
 * Manages daily AI usage tracking for chat and food scans across Firestore
 * and local AsyncStorage (with offline caching and guest fallback).
 * 
 * Grounded in RIA_Chat.md sections 6, 9, 10, 12:
 * - Firestore path: users/{uid}/usage/{yyyy-MM-dd} with { chat, scan, updatedAt }
 * - Local date key in user's timezone (YYYY-MM-DD)
 * - Atomic FieldValue.increment(1) after successful tokens/scans
 * - In-flight reservations to stop rapid multi-taps
 * - Optimistic local updates and offline-first cache
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '@/services/firebase';

export interface RiaUsageRecord {
  chat: number;
  scan: number;
  updatedAt: string;
}

export type RiaUsageType = 'chat' | 'scan';

/**
 * Returns the local date string in YYYY-MM-DD format based on user's device clock.
 */
export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_RECORD: RiaUsageRecord = {
  chat: 0,
  scan: 0,
  updatedAt: '',
};

class RiaUsageCounterImpl {
  private inFlightChatCount = 0;
  private inFlightScanCount = 0;
  private memoryCache: {
    uid: string | null;
    dateKey: string;
    record: RiaUsageRecord;
  } | null = null;

  /**
   * Generates AsyncStorage key for offline or guest persistence.
   */
  private getStorageKey(uid?: string | null, dateKey: string = getLocalDateKey()): string {
    if (!uid || uid === 'guest') {
      return `@calorify_guest_usage_${dateKey}`;
    }
    return `@calorify_usage_${uid}_${dateKey}`;
  }

  /**
   * Retrieves usage for the given user and date.
   * Reads from memory cache if fresh, otherwise falls back to Firestore / AsyncStorage.
   */
  async getUsage(uid?: string | null, targetDateKey?: string): Promise<RiaUsageRecord> {
    const dateKey = targetDateKey || getLocalDateKey();
    const effectiveUid = uid && uid !== 'guest' ? uid : null;

    // 1. Check in-memory cache
    if (
      this.memoryCache &&
      this.memoryCache.dateKey === dateKey &&
      this.memoryCache.uid === effectiveUid
    ) {
      return { ...this.memoryCache.record };
    }

    // 2. If authenticated user, attempt Firestore fetch first
    if (effectiveUid) {
      try {
        const docRef = doc(db, 'users', effectiveUid, 'usage', dateKey);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          const record: RiaUsageRecord = {
            chat: typeof data.chat === 'number' ? data.chat : 0,
            scan: typeof data.scan === 'number' ? data.scan : 0,
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
          };

          // Cache locally in AsyncStorage & memory
          await AsyncStorage.setItem(this.getStorageKey(effectiveUid, dateKey), JSON.stringify(record));
          this.memoryCache = { uid: effectiveUid, dateKey, record };
          return { ...record };
        }
      } catch (err) {
        // Network offline or Firestore error -> fall through to local cache
      }
    }

    // 3. Fallback to AsyncStorage (for guests or offline users)
    try {
      const stored = await AsyncStorage.getItem(this.getStorageKey(effectiveUid, dateKey));
      if (stored) {
        const parsed = JSON.parse(stored) as RiaUsageRecord;
        const record: RiaUsageRecord = {
          chat: typeof parsed.chat === 'number' ? parsed.chat : 0,
          scan: typeof parsed.scan === 'number' ? parsed.scan : 0,
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
        };
        this.memoryCache = { uid: effectiveUid, dateKey, record };
        return { ...record };
      }
    } catch {
      // AsyncStorage read error
    }

    // 4. Default empty record if nothing recorded yet
    const initialRecord: RiaUsageRecord = { ...DEFAULT_RECORD };
    this.memoryCache = { uid: effectiveUid, dateKey, record: initialRecord };
    return { ...initialRecord };
  }

  /**
   * Increments the specified usage counter ('chat' | 'scan') atomically.
   * Spec: "Increment with FieldValue.increment(1) only after a successful response
   * (first token received for chat). Failed, timed-out and 429 requests do not count."
   */
  async incrementUsage(
    type: RiaUsageType,
    uid?: string | null,
    targetDateKey?: string
  ): Promise<RiaUsageRecord> {
    const dateKey = targetDateKey || getLocalDateKey();
    const effectiveUid = uid && uid !== 'guest' ? uid : null;

    // 1. Fetch current usage (or load from cache)
    const current = await this.getUsage(effectiveUid, dateKey);
    const updated: RiaUsageRecord = {
      ...current,
      [type]: (current[type] || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    // 2. Update memory cache immediately (optimistic UI)
    this.memoryCache = { uid: effectiveUid, dateKey, record: updated };

    // 3. Persist locally to AsyncStorage
    try {
      await AsyncStorage.setItem(this.getStorageKey(effectiveUid, dateKey), JSON.stringify(updated));
    } catch {
      // Ignore local storage write errors
    }

    // 4. Atomic increment in Firestore for authenticated users
    if (effectiveUid) {
      try {
        const docRef = doc(db, 'users', effectiveUid, 'usage', dateKey);
        await setDoc(
          docRef,
          {
            [type]: increment(1),
            updatedAt: updated.updatedAt,
          },
          { merge: true }
        );
      } catch (firestoreErr) {
        // Failure to sync remote increment is logged, not fatal to local experience
        console.warn('Failed to sync Ria usage increment to Firestore:', firestoreErr);
      }
    }

    return { ...updated };
  }

  /**
   * In-flight reservation management to prevent rapid double-tapping sends.
   */
  reservePending(type: RiaUsageType): void {
    if (type === 'chat') {
      this.inFlightChatCount += 1;
    } else {
      this.inFlightScanCount += 1;
    }
  }

  releasePending(type: RiaUsageType): void {
    if (type === 'chat') {
      this.inFlightChatCount = Math.max(0, this.inFlightChatCount - 1);
    } else {
      this.inFlightScanCount = Math.max(0, this.inFlightScanCount - 1);
    }
  }

  getInFlightCount(type: RiaUsageType): number {
    return type === 'chat' ? this.inFlightChatCount : this.inFlightScanCount;
  }

  clearInFlight(): void {
    this.inFlightChatCount = 0;
    this.inFlightScanCount = 0;
  }

  /**
   * Migrates guest usage into user's account upon sign-up or sign-in.
   */
  async migrateGuestUsageToUser(uid: string, targetDateKey?: string): Promise<void> {
    if (!uid || uid === 'guest') return;
    const dateKey = targetDateKey || getLocalDateKey();

    try {
      const guestKey = this.getStorageKey(null, dateKey);
      const guestStored = await AsyncStorage.getItem(guestKey);
      if (!guestStored) return;

      const guestUsage = JSON.parse(guestStored) as RiaUsageRecord;
      if (guestUsage.chat > 0 || guestUsage.scan > 0) {
        const userUsage = await this.getUsage(uid, dateKey);
        const merged: RiaUsageRecord = {
          chat: (userUsage.chat || 0) + (guestUsage.chat || 0),
          scan: (userUsage.scan || 0) + (guestUsage.scan || 0),
          updatedAt: new Date().toISOString(),
        };

        // Update local and remote
        await AsyncStorage.setItem(this.getStorageKey(uid, dateKey), JSON.stringify(merged));
        this.memoryCache = { uid, dateKey, record: merged };

        const docRef = doc(db, 'users', uid, 'usage', dateKey);
        await setDoc(
          docRef,
          {
            chat: merged.chat,
            scan: merged.scan,
            updatedAt: merged.updatedAt,
          },
          { merge: true }
        );

        // Remove guest record
        await AsyncStorage.removeItem(guestKey);
      }
    } catch (err) {
      console.warn('Failed to migrate guest usage to user:', err);
    }
  }

  /**
   * Resets local cache and in-flight counters (useful on logout, day rollover, or testing).
   */
  resetCache(): void {
    this.memoryCache = null;
    this.clearInFlight();
  }
}

export const RiaUsageCounter = new RiaUsageCounterImpl();
