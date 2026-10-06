/**
 * RiaLimitGate.test.ts
 * 
 * Unit tests for RiaLimitGate pure functions:
 * - Free/Pro daily chat limit gating
 * - Scan limit gating
 * - In-flight pending count reservation handling
 * - Shared capacity resting state & kill switch
 * - Crisis safety bypass (never blocked by limits)
 * - Remaining notice display thresholds
 * - Copy generators for limit reached and capacity states
 */

import {
  canSendChatMessage,
  canPerformScan,
  shouldShowRemainingNotice,
  formatCapacityResetTime,
  getLimitReachedInfo,
  getCapacityNoticeInfo,
} from '../RiaLimitGate';

describe('RiaLimitGate', () => {
  describe('canSendChatMessage', () => {
    describe('Free users (default 3 messages/day)', () => {
      it('allows sending when user has 0 messages used', () => {
        const result = canSendChatMessage({
          currentUsage: 0,
          isPro: false,
        });

        expect(result.allowed).toBe(true);
        if (result.allowed) {
          expect(result.remaining).toBe(3);
          expect(result.totalAllowed).toBe(3);
          expect(result.isPro).toBe(false);
        }
      });

      it('allows sending when user has 2 messages used (1 remaining)', () => {
        const result = canSendChatMessage({
          currentUsage: 2,
          isPro: false,
        });

        expect(result.allowed).toBe(true);
        if (result.allowed) {
          expect(result.remaining).toBe(1);
          expect(result.totalAllowed).toBe(3);
        }
      });

      it('blocks sending when user has reached 3 messages', () => {
        const result = canSendChatMessage({
          currentUsage: 3,
          isPro: false,
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toBe('limit_reached');
          expect(result.remaining).toBe(0);
          expect(result.totalAllowed).toBe(3);
        }
      });

      it('blocks sending when current usage plus in-flight reaches limit', () => {
        const result = canSendChatMessage({
          currentUsage: 2,
          inFlightCount: 1, // Rapid double send
          isPro: false,
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toBe('limit_reached');
        }
      });
    });

    describe('Pro users (default 50 messages/day)', () => {
      it('allows sending under Pro fair use limit', () => {
        const result = canSendChatMessage({
          currentUsage: 15,
          isPro: true,
        });

        expect(result.allowed).toBe(true);
        if (result.allowed) {
          expect(result.remaining).toBe(35);
          expect(result.totalAllowed).toBe(50);
          expect(result.isPro).toBe(true);
        }
      });

      it('blocks sending when Pro fair use limit (50) is reached', () => {
        const result = canSendChatMessage({
          currentUsage: 50,
          isPro: true,
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toBe('limit_reached');
          expect(result.totalAllowed).toBe(50);
          expect(result.isPro).toBe(true);
        }
      });
    });

    describe('Remote Config Limit Overrides', () => {
      it('respects custom freeDailyLimit and proDailyLimit from Remote Config', () => {
        const customFree = canSendChatMessage({
          currentUsage: 4,
          isPro: false,
          freeDailyLimit: 10,
        });
        expect(customFree.allowed).toBe(true);
        if (customFree.allowed) {
          expect(customFree.remaining).toBe(6);
          expect(customFree.totalAllowed).toBe(10);
        }

        const customPro = canSendChatMessage({
          currentUsage: 100,
          isPro: true,
          proDailyLimit: 100,
        });
        expect(customPro.allowed).toBe(false);
      });
    });

    describe('Kill Switch & Capacity States', () => {
      it('blocks sending and returns capacity_resting when isPoolDegraded is true', () => {
        const result = canSendChatMessage({
          currentUsage: 0,
          isPro: false,
          isPoolDegraded: true,
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toBe('capacity_resting');
          expect(result.retryAfter).toBeDefined();
        }
      });

      it('blocks sending when isRiaEnabled is false', () => {
        const result = canSendChatMessage({
          currentUsage: 0,
          isPro: true,
          isRiaEnabled: false,
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toBe('ria_disabled');
        }
      });
    });

    describe('Crisis Safety Bypass Rule', () => {
      it('ALWAYS allows crisis message even when user has exceeded daily limit', () => {
        const result = canSendChatMessage({
          currentUsage: 10, // Far above 3
          isPro: false,
          isCrisisMessage: true,
        });

        expect(result.allowed).toBe(true);
        if (result.allowed) {
          expect(result.isCrisis).toBe(true);
        }
      });

      it('ALWAYS allows crisis message even when pool is degraded (kill switch active)', () => {
        const result = canSendChatMessage({
          currentUsage: 3,
          isPro: false,
          isPoolDegraded: true,
          isCrisisMessage: true,
        });

        expect(result.allowed).toBe(true);
        if (result.allowed) {
          expect(result.isCrisis).toBe(true);
        }
      });
    });
  });

  describe('canPerformScan', () => {
    it('allows scan when under 5 scans/day limit', () => {
      const result = canPerformScan({
        currentScanUsage: 2,
      });

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.remaining).toBe(3);
        expect(result.totalAllowed).toBe(5);
      }
    });

    it('blocks scan when 5 scans limit is reached', () => {
      const result = canPerformScan({
        currentScanUsage: 5,
      });

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('limit_reached');
      }
    });

    it('blocks scan when pool is degraded', () => {
      const result = canPerformScan({
        currentScanUsage: 0,
        isPoolDegraded: true,
      });

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('capacity_resting');
      }
    });
  });

  describe('shouldShowRemainingNotice', () => {
    it('does NOT show notice at the start (3 remaining of 3)', () => {
      expect(shouldShowRemainingNotice(3, 3)).toBe(false);
    });

    it('does NOT show notice with 2 remaining of 3', () => {
      expect(shouldShowRemainingNotice(2, 3)).toBe(false);
    });

    it('SHOWS notice when exactly 1 message remains (1 of 3)', () => {
      expect(shouldShowRemainingNotice(1, 3)).toBe(true);
    });

    it('does NOT show remaining notice when 0 remain (limit reached card takes over)', () => {
      expect(shouldShowRemainingNotice(0, 3)).toBe(false);
      expect(shouldShowRemainingNotice(-1, 3)).toBe(false);
    });

    it('handles Pro limit (50 messages) by showing only when <= 16 remaining', () => {
      expect(shouldShowRemainingNotice(50, 50)).toBe(false);
      expect(shouldShowRemainingNotice(25, 50)).toBe(false);
      expect(shouldShowRemainingNotice(17, 50)).toBe(false);
      expect(shouldShowRemainingNotice(16, 50)).toBe(true); // floor(50/3) = 16
      expect(shouldShowRemainingNotice(5, 50)).toBe(true);
      expect(shouldShowRemainingNotice(1, 50)).toBe(true);
    });
  });

  describe('formatCapacityResetTime', () => {
    it('formats a date to next hour AM/PM string', () => {
      const fixedDate = new Date(2026, 9, 6, 14, 15); // 2:15 PM
      const formatted = formatCapacityResetTime(fixedDate);
      expect(formatted).toBe('3:00 PM');
    });

    it('handles midnight rollover correctly', () => {
      const fixedDate = new Date(2026, 9, 6, 23, 45); // 11:45 PM
      const formatted = formatCapacityResetTime(fixedDate);
      expect(formatted).toBe('12:00 AM');
    });
  });

  describe('Copy generators', () => {
    describe('getLimitReachedInfo', () => {
      it('returns upgrade call to action for free users', () => {
        const info = getLimitReachedInfo(false, 3);
        expect(info.title).toBe("That's your 3 for today.");
        expect(info.subtitle).toContain('Upgrade to Pro');
        expect(info.actionText).toBe('Upgrade to Pro');
      });

      it('returns fair use copy without upgrade button for Pro users', () => {
        const info = getLimitReachedInfo(true, 50);
        expect(info.title).toBe("That's your 50 for today.");
        expect(info.subtitle).toContain('Fair use');
        expect(info.actionText).toBeUndefined();
      });
    });

    describe('getCapacityNoticeInfo', () => {
      it('returns distinct resting copy with back around time', () => {
        const info = getCapacityNoticeInfo('4:00 PM');
        expect(info.title).toBe('Ria is resting.');
        expect(info.backAroundText).toBe('Back around 4:00 PM.');
        expect(info.subtitle).toContain('breather');
      });
    });
  });
});
