/**
 * Raw (unscoped) AsyncStorage keys that embed a uid and so are not covered by
 * ScopedStorage.clearUserScope. Used by account deletion.
 */
export function userOwnedRawKeys(allKeys: readonly string[], uid: string): string[] {
  const insightPrefix = `@calori_ria_daily_insight_${encodeURIComponent(uid)}_`;
  // Must mirror getScanStorageKey in features/nutrition/services/scanLimitService.ts
  const scanSuffix = `_${uid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return allKeys.filter(
    k =>
      k.startsWith(insightPrefix) || (k.startsWith('@calori_ai_scans_') && k.endsWith(scanSuffix))
  );
}
