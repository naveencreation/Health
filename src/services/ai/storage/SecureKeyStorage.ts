import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
  }

  /**
   * Completely removes the API key from device storage.
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
}

export const SecureKeyStorage = new SecureKeyStorageService();
