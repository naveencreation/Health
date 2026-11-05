/**
 * HealthSyncService
 * Dedicated synchronization engine handling Firestore serialization,
 * undefined stripping, and debounced batch operations.
 */
export class HealthSyncService {
  /**
   * Recursively strips any keys with `undefined` values from an object or array.
   * Firestore rejects document writes containing any undefined fields.
   */
  public static sanitizeForFirestore<T>(data: T): T {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) {
      return data.map(item => HealthSyncService.sanitizeForFirestore(item)) as unknown as T;
    }
    if (typeof data === 'object' && !(data instanceof Date)) {
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleaned[key] = HealthSyncService.sanitizeForFirestore(value);
        }
      }
      return cleaned as T;
    }
    return data;
  }
}
