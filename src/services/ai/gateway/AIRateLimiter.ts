import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIRateLimitStatus } from '../types/ai.types';
import { AI_CONFIG } from '../config/AIConfig';

class AIRateLimiterService {
  private lastRequestTimestamp = 0;
  private recentRequestTimestamps: number[] = [];
  private cachedDailyDate = '';
  private cachedDailyCount = 0;

  /**
   * Checks if an outbound AI request is permitted under rate limits.
   */
  async checkRateLimit(): Promise<AIRateLimitStatus> {
    const now = Date.now();

    // 1. Enforce minimum send cooldown between user clicks (e.g. 3s)
    const timeSinceLast = now - this.lastRequestTimestamp;
    if (this.lastRequestTimestamp > 0 && timeSinceLast < AI_CONFIG.RATE_LIMIT.MIN_SEND_COOLDOWN_MS) {
      const waitMs = AI_CONFIG.RATE_LIMIT.MIN_SEND_COOLDOWN_MS - timeSinceLast;
      return {
        allowed: false,
        reason: 'Please wait a moment before sending another message.',
        waitMs,
        dailyUsageCount: this.cachedDailyCount,
        isDailyWarning: false,
      };
    }

    // 2. Sliding 60-second window rate limit (Max 10 requests / minute)
    this.recentRequestTimestamps = this.recentRequestTimestamps.filter((t) => now - t < 60000);
    if (this.recentRequestTimestamps.length >= AI_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
      const oldestInWindow = this.recentRequestTimestamps[0];
      const waitMs = Math.max(1000, 60000 - (now - oldestInWindow));
      return {
        allowed: false,
        reason: `Rate limit reached. Please wait ${Math.ceil(waitMs / 1000)} seconds.`,
        waitMs,
        dailyUsageCount: this.cachedDailyCount,
        isDailyWarning: false,
      };
    }

    // 3. Daily Usage Tracker (Google AI Studio 1,500 RPD free ceiling)
    const today = new Date().toISOString().slice(0, 10);
    if (this.cachedDailyDate !== today) {
      this.cachedDailyDate = today;
      const stored = await AsyncStorage.getItem(`@calori_ai_daily_usage_${today}`);
      this.cachedDailyCount = stored ? parseInt(stored, 10) || 0 : 0;
    }

    const isDailyWarning = this.cachedDailyCount >= AI_CONFIG.RATE_LIMIT.DAILY_QUOTA_WARNING_THRESHOLD;

    if (this.cachedDailyCount >= AI_CONFIG.RATE_LIMIT.DAILY_QUOTA_SAFETY_LIMIT) {
      return {
        allowed: false,
        reason: 'Daily BYOK request limit reached (1,200 calls). Quota resets at midnight Pacific Time.',
        waitMs: 60000,
        dailyUsageCount: this.cachedDailyCount,
        isDailyWarning: true,
      };
    }

    return {
      allowed: true,
      waitMs: 0,
      dailyUsageCount: this.cachedDailyCount,
      isDailyWarning,
    };
  }

  /**
   * Commits a successful request to the rate-limiting history.
   */
  async recordRequest(): Promise<void> {
    const now = Date.now();
    this.lastRequestTimestamp = now;
    this.recentRequestTimestamps.push(now);

    const today = new Date().toISOString().slice(0, 10);
    this.cachedDailyCount += 1;
    try {
      await AsyncStorage.setItem(`@calori_ai_daily_usage_${today}`, this.cachedDailyCount.toString());
    } catch {
      // Ignore storage error
    }
  }

  /**
   * Resets in-memory counters (useful for testing).
   */
  resetMemoryLimits(): void {
    this.lastRequestTimestamp = 0;
    this.recentRequestTimestamps = [];
  }
}

export const AIRateLimiter = new AIRateLimiterService();
