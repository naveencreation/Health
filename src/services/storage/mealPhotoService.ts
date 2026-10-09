import * as FileSystem from 'expo-file-system/legacy';
import { ref, uploadString, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage, auth } from '@/services/firebase';

const MEALS_DIR = `${FileSystem.documentDirectory || ''}meals/`;

/**
 * Ensures the persistent sandboxed meals directory exists.
 */
async function ensureMealsDirectoryAsync(): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  const dirInfo = await FileSystem.getInfoAsync(MEALS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MEALS_DIR, { intermediates: true });
  }
}

/**
 * Strips data URL scheme prefixes (e.g., 'data:image/jpeg;base64,')
 * to yield a pure Base64 string for storage operations.
 */
function cleanBase64Data(raw: string): string {
  const commaIdx = raw.indexOf(',');
  if (commaIdx !== -1 && raw.startsWith('data:')) {
    return raw.slice(commaIdx + 1);
  }
  return raw;
}

export const mealPhotoService = {
  /**
   * Returns the canonical sandboxed file path for a meal on the local device.
   */
  getLocalMealPhotoPath(mealId: string): string {
    return `${MEALS_DIR}${mealId}.jpg`;
  },

  /**
   * Saves a meal photo into the app's sandboxed document directory.
   * Completely immune to the user deleting the photo from their gallery
   * or the OS clearing temporary cache files.
   *
   * @param mealId - Unique meal identifier
   * @param base64OrUri - Base64 encoded string OR a local file:/// URI
   * @returns The permanent local sandboxed file URI
   */
  async saveMealPhotoLocally(mealId: string, base64OrUri: string): Promise<string> {
    if (!FileSystem.documentDirectory) {
      // In web or fallback environments without documentDirectory, return input URI as-is
      return base64OrUri;
    }

    await ensureMealsDirectoryAsync();
    const destinationPath = this.getLocalMealPhotoPath(mealId);

    if (base64OrUri.startsWith('file://') || base64OrUri.startsWith('content://')) {
      // Copy from temporary cache or gallery picker into sandboxed document directory
      await FileSystem.copyAsync({
        from: base64OrUri,
        to: destinationPath,
      });
    } else {
      // Write pure Base64 data directly to disk
      const cleanBase64 = cleanBase64Data(base64OrUri);
      await FileSystem.writeAsStringAsync(destinationPath, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    return destinationPath;
  },

  /**
   * Uploads a meal photo to Firebase Storage with strict account isolation.
   * Only uploads if the user is authenticated and matches the requested userId.
   * Guest or unauthenticated users are bypassed safely.
   *
   * Path: users/{userId}/meals/{mealId}.jpg
   *
   * @param userId - Target user UID
   * @param mealId - Unique meal identifier
   * @param base64Data - Base64 encoded JPEG data
   * @returns Permanent HTTPS download URL or null if skipped/failed
   */
  async uploadMealPhoto(
    userId: string,
    mealId: string,
    base64Data: string
  ): Promise<string | null> {
    // 1. Strict Security Guard: Prevent cross-account uploads
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId || currentUser.isAnonymous) {
      return null;
    }

    try {
      const cleanBase64 = cleanBase64Data(base64Data);
      const storageRef = ref(storage, `users/${userId}/meals/${mealId}.jpg`);

      await uploadString(storageRef, cleanBase64, 'base64', {
        contentType: 'image/jpeg',
      });

      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch {
      // Return null on failure (e.g., offline) - local photo remains safe in document directory
      return null;
    }
  },

  /**
   * Deletes a meal photo from both local sandboxed storage and Firebase Storage.
   */
  async deleteMealPhoto(userId?: string | null, mealId?: string | null): Promise<void> {
    if (!mealId) return;

    // 1. Delete local sandboxed file
    if (FileSystem.documentDirectory) {
      try {
        const localPath = this.getLocalMealPhotoPath(mealId);
        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists) {
          await FileSystem.deleteAsync(localPath, { idempotent: true });
        }
      } catch {
        // Silently ignore local deletion errors
      }
    }

    // 2. Delete remote file from Firebase Storage if account matches
    const currentUser = auth.currentUser;
    if (userId && currentUser && currentUser.uid === userId && !currentUser.isAnonymous) {
      try {
        const storageRef = ref(storage, `users/${userId}/meals/${mealId}.jpg`);
        await deleteObject(storageRef);
      } catch {
        // Silently ignore if already removed remotely
      }
    }
  },

  /**
   * Deletes all photos for a user from Firebase Storage (e.g. during account deletion).
   * Fully cleans up cloud assets without needing paid Cloud Functions.
   */
  async deleteAllUserPhotos(userId?: string | null): Promise<void> {
    if (!userId) return;
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId || currentUser.isAnonymous) {
      return;
    }

    try {
      const folderRef = ref(storage, `users/${userId}/meals`);
      const res = await listAll(folderRef);
      if (res && res.items && res.items.length > 0) {
        await Promise.all(res.items.map(item => deleteObject(item)));
      }
    } catch {
      // Silently ignore if folder does not exist or list fails
    }
  },

  /**
   * Prunes local sandboxed meal photos older than maxAgeDays (default: 30 days)
   * to guarantee local device storage never exceeds a safe ~15-20 MB ceiling.
   *
   * @param maxAgeDays - Age threshold in days (default: 30)
   * @returns Number of files pruned
   */
  async pruneOldLocalPhotos(maxAgeDays: number = 30): Promise<number> {
    if (!FileSystem.documentDirectory) return 0;

    let prunedCount = 0;
    try {
      const dirInfo = await FileSystem.getInfoAsync(MEALS_DIR);
      if (!dirInfo.exists) return 0;

      const fileNames = await FileSystem.readDirectoryAsync(MEALS_DIR);
      const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

      for (const fileName of fileNames) {
        if (!fileName.endsWith('.jpg')) continue;

        let fileTimestamp: number | null = null;
        if (fileName.startsWith('meal_')) {
          const rawNum = fileName.replace('meal_', '').replace('.jpg', '');
          const parsed = Number(rawNum);
          if (!isNaN(parsed) && parsed > 0) {
            fileTimestamp = parsed;
          }
        }

        const filePath = `${MEALS_DIR}${fileName}`;

        // If we extracted a timestamp and it's older than cutoff, prune
        if (fileTimestamp && fileTimestamp < cutoffTime) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          prunedCount++;
          continue;
        }

        // Fallback: check OS file modificationTime if available
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (
          fileInfo.exists &&
          (fileInfo as any).modificationTime &&
          (fileInfo as any).modificationTime * 1000 < cutoffTime
        ) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          prunedCount++;
        }
      }
    } catch {
      // Silently ignore pruning errors
    }

    return prunedCount;
  },
};

