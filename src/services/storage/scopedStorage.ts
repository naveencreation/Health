import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Universal Scoped Storage Client.
 * Automatically namespaces local device storage keys by user identifier (uid),
 * preventing data cross-contamination when multiple users sign in/out on the same device.
 */
export class ScopedStorage {
  private static sanitizeKeyPart(part: string): string {
    return part.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Generates a deterministic, user-isolated storage key.
   * e.g., getKey('water_cup_pref', 'user123') -> '@calori_user123_water_cup_pref'
   */
  public static getKey(baseKey: string, uid?: string): string {
    const cleanUid = uid ? this.sanitizeKeyPart(uid) : 'guest';
    const cleanBaseKey = baseKey.startsWith('@calori_')
      ? baseKey.replace('@calori_', '')
      : baseKey.startsWith('@')
        ? baseKey.substring(1)
        : baseKey;

    return `@calori_${cleanUid}_${cleanBaseKey}`;
  }

  /**
   * Retrieves and deserializes a scoped value from AsyncStorage.
   */
  public static async getItem<T>(
    baseKey: string,
    uid?: string,
    fallback: T | null = null
  ): Promise<T | null> {
    try {
      const fullKey = this.getKey(baseKey, uid);
      const raw = await AsyncStorage.getItem(fullKey);
      if (raw === null || raw === undefined) {
        return fallback;
      }
      try {
        return JSON.parse(raw) as T;
      } catch {
        // In case the value was saved as a raw string
        return raw as unknown as T;
      }
    } catch (err) {
      console.warn(`[ScopedStorage] Failed to read key ${baseKey}:`, err);
      return fallback;
    }
  }

  /**
   * Serializes and persists a scoped value into AsyncStorage.
   */
  public static async setItem<T>(baseKey: string, value: T, uid?: string): Promise<void> {
    try {
      const fullKey = this.getKey(baseKey, uid);
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(fullKey, payload);
    } catch (err) {
      console.warn(`[ScopedStorage] Failed to set key ${baseKey}:`, err);
    }
  }

  /**
   * Removes a scoped key from AsyncStorage.
   */
  public static async removeItem(baseKey: string, uid?: string): Promise<void> {
    try {
      const fullKey = this.getKey(baseKey, uid);
      await AsyncStorage.removeItem(fullKey);
    } catch (err) {
      console.warn(`[ScopedStorage] Failed to remove key ${baseKey}:`, err);
    }
  }

  /**
   * Clears all keys belonging strictly to a specific user id.
   * Leaves system or other users' keys untouched.
   */
  public static async clearUserScope(uid: string): Promise<void> {
    try {
      if (!uid) return;
      const prefix = `@calori_${this.sanitizeKeyPart(uid)}_`;
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(k => k.startsWith(prefix));
      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
      }
    } catch (err) {
      console.warn(`[ScopedStorage] Failed to clear user scope ${uid}:`, err);
    }
  }
}
