/**
 * RiaLimitGate.ts
 * 
 * Pure functions governing rate limits, daily quotas, capacity degradation,
 * and crisis exceptions for Calorify Ria AI Space.
 * 
 * Grounded in RIA_Chat.md sections 6, 9, 10, 11, and 12.
 */

export type LimitGateBlockReason = 'limit_reached' | 'capacity_resting' | 'ria_disabled';

export type LimitGateResult =
  | {
      allowed: true;
      remaining: number;
      totalAllowed: number;
      isPro: boolean;
      isCrisis?: boolean;
    }
  | {
      allowed: false;
      reason: LimitGateBlockReason;
      remaining: number;
      totalAllowed: number;
      isPro: boolean;
      retryAfter?: string;
    };

export interface CanSendChatMessageParams {
  currentUsage: number;
  inFlightCount?: number;
  isPro: boolean;
  freeDailyLimit?: number; // default: 3
  proDailyLimit?: number;  // default: 50
  isPoolDegraded?: boolean; // kill switch from RemoteConfigService (ria_pool_degraded)
  isRiaEnabled?: boolean;   // master kill switch (ria_enabled)
  isCrisisMessage?: boolean; // local crisis pre-check match bypasses limit & capacity
}

export interface CanPerformScanParams {
  currentScanUsage: number;
  inFlightScanCount?: number;
  scanDailyLimit?: number; // default: 5 (RIA_Chat.md: 5 scans/day for everyone)
  isPoolDegraded?: boolean;
  isRiaEnabled?: boolean;
}

/**
 * Evaluates whether a chat message send is permitted.
 * Pure function: deterministic and zero side-effects.
 */
export function canSendChatMessage(params: CanSendChatMessageParams): LimitGateResult {
  const {
    currentUsage = 0,
    inFlightCount = 0,
    isPro,
    freeDailyLimit = 3,
    proDailyLimit = 50,
    isPoolDegraded = false,
    isRiaEnabled = true,
    isCrisisMessage = false,
  } = params;

  const totalAllowed = isPro ? proDailyLimit : freeDailyLimit;
  const effectiveUsage = Math.max(0, currentUsage) + Math.max(0, inFlightCount);
  const remaining = Math.max(0, totalAllowed - effectiveUsage);

  // 1. Safety exception: Crisis / self-harm messages ALWAYS bypass gate and capacity
  // Spec: "Crisis messages must never be blocked by the gate."
  if (isCrisisMessage) {
    return {
      allowed: true,
      remaining,
      totalAllowed,
      isPro,
      isCrisis: true,
    };
  }

  // 2. Master kill switch: Ria feature disabled
  if (!isRiaEnabled) {
    return {
      allowed: false,
      reason: 'ria_disabled',
      remaining: 0,
      totalAllowed,
      isPro,
    };
  }

  // 3. Capacity / degraded pool state (HTTP 429 or ria_pool_degraded)
  // Spec: "Ria at capacity: 'Ria is resting. Back around {time}.' Does not count against user limit."
  if (isPoolDegraded) {
    return {
      allowed: false,
      reason: 'capacity_resting',
      remaining,
      totalAllowed,
      isPro,
      retryAfter: formatCapacityResetTime(),
    };
  }

  // 4. Daily quota limit evaluation
  if (effectiveUsage >= totalAllowed) {
    return {
      allowed: false,
      reason: 'limit_reached',
      remaining: 0,
      totalAllowed,
      isPro,
    };
  }

  return {
    allowed: true,
    remaining,
    totalAllowed,
    isPro,
  };
}

/**
 * Evaluates whether an AI meal food scan is permitted.
 * Pure function: deterministic and zero side-effects.
 */
export function canPerformScan(params: CanPerformScanParams): LimitGateResult {
  const {
    currentScanUsage = 0,
    inFlightScanCount = 0,
    scanDailyLimit = 5,
    isPoolDegraded = false,
    isRiaEnabled = true,
  } = params;

  const totalAllowed = scanDailyLimit;
  const effectiveUsage = Math.max(0, currentScanUsage) + Math.max(0, inFlightScanCount);
  const remaining = Math.max(0, totalAllowed - effectiveUsage);

  if (!isRiaEnabled) {
    return {
      allowed: false,
      reason: 'ria_disabled',
      remaining: 0,
      totalAllowed,
      isPro: false,
    };
  }

  if (isPoolDegraded) {
    return {
      allowed: false,
      reason: 'capacity_resting',
      remaining,
      totalAllowed,
      isPro: false,
      retryAfter: formatCapacityResetTime(),
    };
  }

  if (effectiveUsage >= totalAllowed) {
    return {
      allowed: false,
      reason: 'limit_reached',
      remaining: 0,
      totalAllowed,
      isPro: false,
    };
  }

  return {
    allowed: true,
    remaining,
    totalAllowed,
    isPro: false,
  };
}

/**
 * Determines if the "N messages left today" notice should be rendered.
 * Spec: "Show 'N messages left today' only when 1 remains or fewer than a third are left. Never from the start."
 */
export function shouldShowRemainingNotice(remaining: number, totalAllowed: number): boolean {
  if (remaining <= 0 || totalAllowed <= 0) return false;
  if (remaining === 1) return true;
  const oneThird = Math.floor(totalAllowed / 3);
  return remaining <= oneThird;
}

/**
 * Formats the expected time Ria is back from resting.
 * Defaults to the top of the next hour (e.g. "3:00 PM").
 */
export function formatCapacityResetTime(now: Date = new Date()): string {
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  nextHour.setMinutes(0, 0, 0);
  let hours = nextHour.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:00 ${ampm}`;
}

/**
 * Generates user-facing copy for limit reached state.
 * Spec: "That's your {n} for today. Resets at midnight."
 */
export function getLimitReachedInfo(
  isPro: boolean,
  limit: number
): {
  title: string;
  subtitle: string;
  actionText?: string;
} {
  if (isPro) {
    return {
      title: `That's your ${limit} for today.`,
      subtitle: 'Fair use daily limit reached. Your messages reset at midnight.',
    };
  }
  return {
    title: `That's your ${limit} for today.`,
    subtitle: 'Resets at midnight. Upgrade to Pro for 50 messages/day.',
    actionText: 'Upgrade to Pro',
  };
}

/**
 * Generates user-facing copy for shared capacity / kill switch state.
 * Spec: "Ria is resting. Back around {time}." Must differ from limit state copy.
 */
export function getCapacityNoticeInfo(resetTime?: string): {
  title: string;
  subtitle: string;
  backAroundText: string;
} {
  const time = resetTime || formatCapacityResetTime();
  return {
    title: 'Ria is resting.',
    backAroundText: `Back around ${time}.`,
    subtitle:
      'Ria is temporarily taking a breather due to high demand on our shared AI pool. Please check back shortly.',
  };
}
