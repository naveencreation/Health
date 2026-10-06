import { RemoteConfigService, REMOTE_CONFIG_DEFAULTS } from '../RemoteConfigService';

jest.mock('@/services/firebase', () => ({
  app: {},
}));

jest.mock('firebase/remote-config', () => ({
  getRemoteConfig: jest.fn(() => ({
    settings: {},
    defaultConfig: {},
  })),
  fetchAndActivate: jest.fn(async () => true),
  getValue: jest.fn((rc, key) => ({
    asBoolean: () => (key === 'ria_enabled' ? true : false),
    asNumber: () => (key === 'ria_free_chat_daily' ? 3 : 50),
    asString: () => (key === 'ria_model_chat' ? 'gemini-2.5-flash-lite' : ''),
  })),
}));

describe('RemoteConfigService', () => {
  beforeEach(() => {
    RemoteConfigService.resetTestingOverrides();
  });

  test('returns default in-code values initially', () => {
    expect(RemoteConfigService.get('ria_enabled')).toBe(true);
    expect(RemoteConfigService.get('ria_free_chat_daily')).toBe(3);
    expect(RemoteConfigService.get('ria_pro_chat_daily')).toBe(50);
    expect(RemoteConfigService.get('scan_free_daily')).toBe(5);
    expect(RemoteConfigService.get('ria_model_chat')).toBe('gemma-4-26b-a4b-it');
    expect(RemoteConfigService.get('ria_model_vision')).toBe('gemini-3.5-flash-lite');
    expect(RemoteConfigService.get('ria_pool_degraded')).toBe(false);
  });

  test('allows testing overrides and resets cleanly', () => {
    RemoteConfigService.overrideConfigForTesting({
      ria_free_chat_daily: 5,
      ria_pool_degraded: true,
    });

    expect(RemoteConfigService.get('ria_free_chat_daily')).toBe(5);
    expect(RemoteConfigService.get('ria_pool_degraded')).toBe(true);

    RemoteConfigService.resetTestingOverrides();
    expect(RemoteConfigService.get('ria_free_chat_daily')).toBe(3);
    expect(RemoteConfigService.get('ria_pool_degraded')).toBe(false);
  });

  test('getAll returns complete snapshot matching defaults', () => {
    const all = RemoteConfigService.getAll();
    expect(all).toEqual(REMOTE_CONFIG_DEFAULTS);
  });
});
