import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';

const GEMINI_API_KEY_STORAGE_KEY = 'calorify_gemini_byok_api_key_v1';

class SecureKeyStorageService {
  private inMemoryCache: string | null = null;
  private isLoaded = false;

  /**
   * Retrieves the user's Gemini API key securely.
   * Leverages in-memory caching to avoid continuous bridge overhead.
   */
  async getApiKey(): Promise<string | null> {
    if (this.isLoaded && this.inMemoryCache !== null) {
      return this.inMemoryCache;
    }

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          this.inMemoryCache = window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
        }
      } else {
        const isAvailable = await SecureStore.isAvailableAsync();
        if (isAvailable) {
          this.inMemoryCache = await SecureStore.getItemAsync(GEMINI_API_KEY_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('SecureKeyStorage: Failed to retrieve API key securely', error);
      this.inMemoryCache = null;
    }

    this.isLoaded = true;
    return this.inMemoryCache;
  }

  /**
   * Securely saves the Gemini API key in hardware KeyStore (Android) / Keychain (iOS).
   * Also backs up an obfuscated copy to Firestore so the key survives logout/login.
   */
  async saveApiKey(apiKey: string): Promise<void> {
    let cleanedKey = apiKey.trim();
    cleanedKey = cleanedKey.replace(/^["'`]+|["'`]+$/g, '');
    cleanedKey = cleanedKey.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
    this.inMemoryCache = cleanedKey;
    this.isLoaded = true;

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, cleanedKey);
        }
      } else {
        await SecureStore.setItemAsync(GEMINI_API_KEY_STORAGE_KEY, cleanedKey, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      }
    } catch (error) {
      console.error('SecureKeyStorage: Failed to persist API key securely', error);
      throw new Error('Could not save API key to secure storage.');
    }

    // Backup obfuscated key to Firestore so it survives cross-device / logout
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        // Simple reversible obfuscation (not encryption — key is user-owned BYOK)
        const obfuscated = btoa(cleanedKey);
        await setDoc(
          doc(db, 'users', uid),
          { geminiKeyObfuscated: obfuscated },
          { merge: true }
        );
      }
    } catch (fsErr) {
      // Non-fatal: local secure store is the source of truth
      console.warn('SecureKeyStorage: Firestore backup failed (non-fatal)', fsErr);
    }
  }

  /**
   * Completely removes the API key from device storage and Firestore backup.
   */
  async removeApiKey(): Promise<void> {
    this.inMemoryCache = null;
    this.isLoaded = true;

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('SecureKeyStorage: Error removing API key', error);
    }

    // Also remove from Firestore backup
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        await setDoc(
          doc(db, 'users', uid),
          { geminiKeyObfuscated: null },
          { merge: true }
        );
      }
    } catch (fsErr) {
      console.warn('SecureKeyStorage: Firestore key removal failed (non-fatal)', fsErr);
    }
  }

  /**
   * Fast synchronous check from cache, or async if not yet loaded.
   */
  async hasApiKey(): Promise<boolean> {
    const key = await this.getApiKey();
    return Boolean(key && key.length > 5);
  }

  /**
   * Returns masked representation of the key for safe UI display (e.g. AIza••••••••7x9K).
   */
  getMaskedKey(key: string | null): string {
    if (!key || key.length < 8) return '';
    const prefix = key.slice(0, 4);
    const suffix = key.slice(-4);
    return `${prefix}••••••••${suffix}`;
  }

  /**
   * Clears in-memory cache so next getApiKey() reads fresh from secure storage.
   * Call on logout to allow a different user's key to be loaded on next login.
   */
  invalidateCache(): void {
    this.inMemoryCache = null;
    this.isLoaded = false;
  }

  /**
   * Restores the Gemini API key from Firestore backup into local secure storage.
   * Called during login/hydration so the key is available immediately after sign-in.
   */
  async restoreFromFirestore(uid: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) return false;

      const data = userDoc.data();
      const obfuscated = data?.geminiKeyObfuscated;
      if (!obfuscated || typeof obfuscated !== 'string') return false;

      // Only restore if we don't already have a local key
      const existingKey = await this.getApiKey();
      if (existingKey && existingKey.length > 5) return true; // Already configured locally

      const restored = atob(obfuscated);
      if (!restored || restored.length < 5) return false;

      // Save to local secure store without triggering another Firestore write
      this.inMemoryCache = restored;
      this.isLoaded = true;

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, restored);
        }
      } else {
        const isAvailable = await SecureStore.isAvailableAsync();
        if (isAvailable) {
          await SecureStore.setItemAsync(GEMINI_API_KEY_STORAGE_KEY, restored, {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          });
        }
      }

      console.log('SecureKeyStorage: Gemini API key restored from Firestore backup');
      return true;
    } catch (err) {
      console.warn('SecureKeyStorage: Failed to restore key from Firestore', err);
      return false;
    }
  }
}

export const SecureKeyStorage = new SecureKeyStorageService();
