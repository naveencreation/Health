import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/services/firebase';
import { ScopedStorage } from '@/services/storage/scopedStorage';
import { haptics } from '@/utils/haptics';

// Pro is free for everyone until real store billing exists; set false to bring back the paywall.
export const EARLY_ACCESS = true;

export type SubscriptionPlanId = 'pro_monthly' | 'pro_annual' | 'pro_lifetime';

export type ProFeature =
  'ai_vision_unlimited' | 'ria_coach_advanced' | 'advanced_analytics' | 'cloud_backup_priority';

export interface SubscriptionPackage {
  id: SubscriptionPlanId;
  title: string;
  priceFormatted: string;
  pricePerMonthFormatted?: string;
  billingPeriod: string;
  badge?: string;
  savingsPercent?: number;
  trialDays?: number;
}

export interface EntitlementState {
  isPro: boolean;
  activePlanId?: SubscriptionPlanId;
  expiresAt?: string; // ISO date or 'lifetime'
  purchasedAt?: string;
}

export const SUBSCRIPTION_PACKAGES: SubscriptionPackage[] = [
  {
    id: 'pro_annual',
    title: 'Annual Plan',
    priceFormatted: '$29.99 / year',
    pricePerMonthFormatted: '$2.50 / mo',
    billingPeriod: 'Billed annually',
    badge: 'BEST VALUE • SAVE 50%',
    savingsPercent: 50,
    trialDays: 7,
  },
  {
    id: 'pro_monthly',
    title: 'Monthly Plan',
    priceFormatted: '$4.99 / month',
    pricePerMonthFormatted: '$4.99 / mo',
    billingPeriod: 'Billed monthly',
  },
  {
    id: 'pro_lifetime',
    title: 'Lifetime Access',
    priceFormatted: '$79.99',
    billingPeriod: 'One-time payment forever',
    badge: 'PAY ONCE',
  },
];

export const PLAN_NAMES: Record<SubscriptionPlanId, string> = {
  pro_monthly: 'Monthly',
  pro_annual: 'Annual',
  pro_lifetime: 'Lifetime',
};

/** expiresAt can be 'lifetime', which is not a date, so it is checked first */
export const formatExpiry = (expiresAt?: string): string =>
  expiresAt === 'lifetime'
    ? 'Lifetime access'
    : expiresAt
      ? `Renews on ${new Date(expiresAt).toLocaleDateString()}`
      : 'Active';

export const PAYMENT_STORAGE_KEY = '@calori_subscription_entitlement_v1';

export type EntitlementListener = (state: EntitlementState) => void;

export class PaymentService {
  private static storageKey = PAYMENT_STORAGE_KEY;
  private static listeners: Set<EntitlementListener> = new Set();

  public static setStorageKey(key: string) {
    this.storageKey = key;
  }

  public static resetStorageKey() {
    this.storageKey = PAYMENT_STORAGE_KEY;
  }

  // Per-user key, read at call time, so Pro never carries over to another account on the device
  private static get key(): string {
    return ScopedStorage.getKey(this.storageKey, auth.currentUser?.uid);
  }

  /**
   * Subscribes to entitlement state changes.
   */
  public static subscribe(listener: EntitlementListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(state: EntitlementState) {
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn('[PaymentService] Error notifying listener', e);
      }
    });
  }

  /**
   * Retrieves active entitlement state from local cache.
   */
  public static async getEntitlement(): Promise<EntitlementState> {
    try {
      const raw = await AsyncStorage.getItem(this.key);
      if (!raw) {
        return { isPro: false };
      }
      const data: EntitlementState = JSON.parse(raw);

      // Check if expired
      if (data.isPro && data.expiresAt && data.expiresAt !== 'lifetime') {
        const expiresTime = new Date(data.expiresAt).getTime();
        if (Date.now() > expiresTime) {
          const expiredState: EntitlementState = { isPro: false };
          await this.saveEntitlement(expiredState);
          return expiredState;
        }
      }

      return data;
    } catch {
      return { isPro: false };
    }
  }

  /**
   * Persists entitlement state.
   */
  public static async saveEntitlement(state: EntitlementState): Promise<void> {
    try {
      await AsyncStorage.setItem(this.key, JSON.stringify(state));
      this.notifyListeners(state);
    } catch (e) {
      console.warn('[PaymentService] Failed to save entitlement', e);
    }
  }

  /**
   * Simulates or executes subscription purchase.
   */
  public static async purchase(
    planId: SubscriptionPlanId
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await haptics.impactMedium();

      const now = new Date();
      // The paid period starts after the free trial
      const start = new Date(now);
      start.setDate(
        start.getDate() + (SUBSCRIPTION_PACKAGES.find(p => p.id === planId)?.trialDays ?? 0)
      );
      let expiresAt: string;

      if (planId === 'pro_lifetime') {
        expiresAt = 'lifetime';
      } else if (planId === 'pro_annual') {
        const nextYear = new Date(start);
        nextYear.setFullYear(start.getFullYear() + 1);
        expiresAt = nextYear.toISOString();
      } else {
        const nextMonth = new Date(start);
        nextMonth.setMonth(start.getMonth() + 1);
        expiresAt = nextMonth.toISOString();
      }

      const newState: EntitlementState = {
        isPro: true,
        activePlanId: planId,
        purchasedAt: now.toISOString(),
        expiresAt,
      };

      await this.saveEntitlement(newState);
      await haptics.success();

      return { success: true };
    } catch (err: any) {
      await haptics.error();
      return { success: false, error: err.message || 'Purchase could not be completed' };
    }
  }

  /**
   * Restores existing purchases.
   */
  public static async restore(): Promise<{ restored: boolean; planId?: SubscriptionPlanId }> {
    try {
      const state = await this.getEntitlement();
      if (state.isPro) {
        await haptics.success();
        return { restored: true, planId: state.activePlanId };
      }
      await haptics.selection();
      return { restored: false };
    } catch {
      return { restored: false };
    }
  }

  /**
   * Revokes subscription (for testing / account cancellation).
   */
  public static async revoke(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.key);
      this.notifyListeners({ isPro: false });
    } catch {}
  }
}
