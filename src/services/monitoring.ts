import { Platform } from 'react-native';

// Safely lazy-load native modules to avoid crashing in Expo Go, web, or test environments
let nativeCrashlytics: any = null;
let nativeAnalytics: any = null;

if (Platform.OS !== 'web') {
  try {
    // Dynamic require so non-native environments don't fail bundle resolution
    nativeCrashlytics = require('@react-native-firebase/crashlytics').default;
  } catch (err) {
    // Graceful fallback in environments without native binary (e.g. Expo Go / Jest)
  }

  try {
    nativeAnalytics = require('@react-native-firebase/analytics').default;
  } catch (err) {
    // Graceful fallback
  }
}

export const Monitoring = {
  /**
   * Log a user action or lifecycle event to Firebase Analytics and Crashlytics breadcrumbs.
   */
  async logEvent(eventName: string, params: Record<string, any> = {}): Promise<void> {
    try {
      if (nativeAnalytics) {
        // Sanitize event name (lowercase, alphanumeric + underscores, max 40 chars)
        const sanitizedName = eventName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
        await nativeAnalytics().logEvent(sanitizedName, params);
      }
      if (nativeCrashlytics) {
        nativeCrashlytics().log(`[Event] ${eventName}: ${JSON.stringify(params)}`);
      }
    } catch (e) {
      // Non-blocking: analytics failures should never affect user experience
    }
  },

  /**
   * Log a screen view so Crashlytics and Analytics know exactly what screen the user was on.
   */
  async logScreenView(screenName: string, screenClass: string = screenName): Promise<void> {
    try {
      if (nativeAnalytics) {
        await nativeAnalytics().logScreenView({
          screen_name: screenName,
          screen_class: screenClass,
        });
      }
      if (nativeCrashlytics) {
        nativeCrashlytics().log(`[Screen] ${screenName}`);
        nativeCrashlytics().setAttribute('current_screen', screenName);
      }
    } catch (e) {
      // Non-blocking
    }
  },

  /**
   * Set user identifier for crash attribution and user journeys.
   */
  async setUserId(userId: string | null): Promise<void> {
    try {
      if (userId) {
        if (nativeCrashlytics) {
          await nativeCrashlytics().setUserId(userId);
        }
        if (nativeAnalytics) {
          await nativeAnalytics().setUserId(userId);
        }
      }
    } catch (e) {
      // Non-blocking
    }
  },

  /**
   * Record a non-fatal error to Firebase Crashlytics with custom contextual metadata.
   */
  recordError(error: Error | any, context?: string, attributes: Record<string, string> = {}): void {
    try {
      if (nativeCrashlytics) {
        if (context) {
          nativeCrashlytics().log(`[ErrorContext] ${context}`);
        }
        if (Object.keys(attributes).length > 0) {
          nativeCrashlytics().setAttributes(attributes);
        }
        const errObj = error instanceof Error ? error : new Error(String(error?.message || error));
        nativeCrashlytics().recordError(errObj);
      } else {
        console.warn('[Monitoring Fallback]', context || 'Error recorded:', error);
      }
    } catch (e) {
      // Non-blocking
    }
  },

  /**
   * Set custom key-value diagnostic attributes in Crashlytics reports (e.g. app version, active goal).
   */
  setAttribute(key: string, value: string): void {
    try {
      if (nativeCrashlytics) {
        nativeCrashlytics().setAttribute(key, String(value).slice(0, 100));
      }
    } catch (e) {
      // Non-blocking
    }
  },

  /**
   * Log a breadcrumb trace message in Crashlytics.
   */
  logBreadcrumb(message: string): void {
    try {
      if (nativeCrashlytics) {
        nativeCrashlytics().log(message);
      }
    } catch (e) {
      // Non-blocking
    }
  },
};
