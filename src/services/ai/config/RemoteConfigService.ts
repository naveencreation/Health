import { app } from '@/services/firebase';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';

export interface RiaRemoteConfig {
  ria_enabled: boolean;
  ria_free_chat_daily: number;
  ria_pro_chat_daily: number;
  scan_free_daily: number;
  ria_model_chat: string;
  ria_model_vision: string;
  ria_max_output_tokens: number;
  ria_insight_enabled: boolean;
  ria_pool_degraded: boolean; // Kill switch: show capacity notice, skip AI calls
}

export const REMOTE_CONFIG_DEFAULTS: RiaRemoteConfig = {
  ria_enabled: true,
  ria_free_chat_daily: 3,
  ria_pro_chat_daily: 50,
  scan_free_daily: 5,
  ria_model_chat: 'gemma-4-26b-a4b-it',
  ria_model_vision: 'gemini-3.5-flash-lite',
  ria_max_output_tokens: 350,
  ria_insight_enabled: true,
  ria_pool_degraded: false,
};

class RemoteConfigServiceImpl {
  private inMemoryConfig: RiaRemoteConfig = { ...REMOTE_CONFIG_DEFAULTS };
  private isInitialized = false;

  /**
   * Initializes and activates Firebase Remote Config with default fallbacks.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const rc = getRemoteConfig(app);
      rc.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
      rc.defaultConfig = { ...REMOTE_CONFIG_DEFAULTS } as unknown as Record<string, string | number | boolean>;

      const activated = await fetchAndActivate(rc);
      if (activated || true) {
        this.inMemoryConfig = {
          ria_enabled: getValue(rc, 'ria_enabled').asBoolean(),
          ria_free_chat_daily: getValue(rc, 'ria_free_chat_daily').asNumber() || REMOTE_CONFIG_DEFAULTS.ria_free_chat_daily,
          ria_pro_chat_daily: getValue(rc, 'ria_pro_chat_daily').asNumber() || REMOTE_CONFIG_DEFAULTS.ria_pro_chat_daily,
          scan_free_daily: getValue(rc, 'scan_free_daily').asNumber() || REMOTE_CONFIG_DEFAULTS.scan_free_daily,
          ria_model_chat: getValue(rc, 'ria_model_chat').asString() || REMOTE_CONFIG_DEFAULTS.ria_model_chat,
          ria_model_vision: getValue(rc, 'ria_model_vision').asString() || REMOTE_CONFIG_DEFAULTS.ria_model_vision,
          ria_max_output_tokens: getValue(rc, 'ria_max_output_tokens').asNumber() || REMOTE_CONFIG_DEFAULTS.ria_max_output_tokens,
          ria_insight_enabled: getValue(rc, 'ria_insight_enabled').asBoolean(),
          ria_pool_degraded: getValue(rc, 'ria_pool_degraded').asBoolean(),
        };
      }
      this.isInitialized = true;
    } catch (err) {
      // Safe fallback to defaults if network offline or Firebase Remote Config disabled
      this.inMemoryConfig = { ...REMOTE_CONFIG_DEFAULTS };
      this.isInitialized = true;
    }
  }

  /**
   * Synchronously gets a typed remote config value with guaranteed safe defaults.
   */
  get<K extends keyof RiaRemoteConfig>(key: K): RiaRemoteConfig[K] {
    return this.inMemoryConfig[key] ?? REMOTE_CONFIG_DEFAULTS[key];
  }

  /**
   * Returns complete config snapshot.
   */
  getAll(): RiaRemoteConfig {
    return { ...this.inMemoryConfig };
  }

  /**
   * Testing / override hook
   */
  overrideConfigForTesting(overrides: Partial<RiaRemoteConfig>): void {
    this.inMemoryConfig = { ...this.inMemoryConfig, ...overrides };
  }

  resetTestingOverrides(): void {
    this.inMemoryConfig = { ...REMOTE_CONFIG_DEFAULTS };
  }
}

export const RemoteConfigService = new RemoteConfigServiceImpl();
