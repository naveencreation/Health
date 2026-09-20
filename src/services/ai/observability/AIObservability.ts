import { AIObservabilityMetric } from '../types/ai.types';

class AIObservabilityService {
  private recentMetrics: AIObservabilityMetric[] = [];
  private readonly MAX_IN_MEMORY_LOGS = 50;

  /**
   * Records execution performance, latency, and outcome.
   * Completely privacy-safe: never records message text or API keys.
   */
  recordMetric(metric: Omit<AIObservabilityMetric, 'id' | 'timestamp'>): void {
    const fullMetric: AIObservabilityMetric = {
      ...metric,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };

    this.recentMetrics.push(fullMetric);
    if (this.recentMetrics.length > this.MAX_IN_MEMORY_LOGS) {
      this.recentMetrics.shift();
    }
  }

  /**
   * Returns aggregated telemetry summary.
   */
  getSummary(): {
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
    avgTtftMs: number;
    atwaterCorrectionsCount: number;
  } {
    if (this.recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 100,
        avgLatencyMs: 0,
        avgTtftMs: 0,
        atwaterCorrectionsCount: 0,
      };
    }

    const total = this.recentMetrics.length;
    const successes = this.recentMetrics.filter((m) => m.success).length;
    const totalLatency = this.recentMetrics.reduce((acc, m) => acc + m.latencyMs, 0);

    const ttftItems = this.recentMetrics.filter((m) => typeof m.timeToFirstTokenMs === 'number');
    const totalTtft = ttftItems.reduce((acc, m) => acc + (m.timeToFirstTokenMs || 0), 0);
    const atwaterCount = this.recentMetrics.filter((m) => m.atwaterAdjusted).length;

    return {
      totalRequests: total,
      successRate: Math.round((successes / total) * 100),
      avgLatencyMs: Math.round(totalLatency / total),
      avgTtftMs: ttftItems.length > 0 ? Math.round(totalTtft / ttftItems.length) : 0,
      atwaterCorrectionsCount: atwaterCount,
    };
  }

  /**
   * Clears in-memory metrics.
   */
  clear(): void {
    this.recentMetrics = [];
  }
}

export const AIObservability = new AIObservabilityService();
