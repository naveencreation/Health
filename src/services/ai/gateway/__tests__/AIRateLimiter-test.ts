import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIRateLimiter } from '../AIRateLimiter';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const BASE = Date.parse('2026-09-23T12:00:00.000Z');

describe('AIRateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(BASE));
    AIRateLimiter.resetMemoryLimits();
    (AIRateLimiter as any).cachedDailyDate = '';
    (AIRateLimiter as any).cachedDailyCount = 0;
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('blocks a request within the cooldown window', async () => {
    await AIRateLimiter.recordRequest();
    const status = await AIRateLimiter.checkRateLimit();
    expect(status.allowed).toBe(false);
    expect(status.waitMs).toBeGreaterThan(0);
  });

  test('allows a request after the cooldown window', async () => {
    await AIRateLimiter.recordRequest();
    jest.setSystemTime(new Date(BASE + 3000));
    const status = await AIRateLimiter.checkRateLimit();
    expect(status.allowed).toBe(true);
  });

  test('blocks once the per-minute sliding window is full', async () => {
    for (let i = 0; i < 10; i++) {
      jest.setSystemTime(new Date(BASE + i * 4000));
      await AIRateLimiter.recordRequest();
    }
    jest.setSystemTime(new Date(BASE + 39000));
    const status = await AIRateLimiter.checkRateLimit();
    expect(status.allowed).toBe(false);
  });

  test('blocks once the daily quota is reached', async () => {
    (AIRateLimiter as any).cachedDailyDate = '2026-09-23';
    (AIRateLimiter as any).cachedDailyCount = 1200;
    const status = await AIRateLimiter.checkRateLimit();
    expect(status.allowed).toBe(false);
    expect(status.isDailyWarning).toBe(true);
    expect(status.reason).toContain('1,200');
  });

  test('warns but allows near the daily quota threshold', async () => {
    (AIRateLimiter as any).cachedDailyDate = '2026-09-23';
    (AIRateLimiter as any).cachedDailyCount = 1000;
    const status = await AIRateLimiter.checkRateLimit();
    expect(status.allowed).toBe(true);
    expect(status.isDailyWarning).toBe(true);
  });

  test('loads daily usage from storage on date rollover', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('500');
    const status = await AIRateLimiter.checkRateLimit();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@calori_ai_daily_usage_2026-09-23');
    expect(status.dailyUsageCount).toBe(500);
  });
});
