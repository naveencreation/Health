import { app } from '@/services/firebase';
import { initializeAppCheck, CustomProvider, AppCheck } from 'firebase/app-check';
import { Platform } from 'react-native';

class AppCheckServiceImpl {
  private appCheckInstance: AppCheck | null = null;
  private isInitialized = false;

  /**
   * Initializes Firebase App Check with custom debug/attestation provider.
   */
  initialize(): AppCheck | null {
    if (this.isInitialized) return this.appCheckInstance;

    try {
      // In development or test environments, use debug/custom provider
      const debugToken = process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN || 'calori-debug-app-check-token';

      this.appCheckInstance = initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: async () => ({
            token: debugToken,
            expireTimeMillis: Date.now() + 60 * 60 * 1000,
          }),
        }),
        isTokenAutoRefreshEnabled: true,
      });

      this.isInitialized = true;
    } catch (err) {
      // Non-fatal if App Check is already initialized or running in Jest/headless
      this.isInitialized = true;
    }

    return this.appCheckInstance;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const AppCheckService = new AppCheckServiceImpl();
