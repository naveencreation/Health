import { useState, useEffect, useCallback } from 'react';
import {
  PaymentService,
  SubscriptionPlanId,
  ProFeature,
  EntitlementState,
} from '@/services/payments/paymentService';
import { EntitlementManager } from '@/services/payments/entitlementManager';

export function usePro() {
  const [entitlement, setEntitlement] = useState<EntitlementState>({ isPro: false });
  const [loading, setLoading] = useState(true);

  const refreshEntitlement = useCallback(async () => {
    try {
      const state = await PaymentService.getEntitlement();
      setEntitlement(state);
    } catch {
      setEntitlement({ isPro: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshEntitlement();
  }, [refreshEntitlement]);

  const purchasePlan = useCallback(
    async (planId: SubscriptionPlanId) => {
      const result = await PaymentService.purchase(planId);
      if (result.success) {
        await refreshEntitlement();
      }
      return result;
    },
    [refreshEntitlement]
  );

  const restorePurchases = useCallback(async () => {
    const result = await PaymentService.restore();
    if (result.restored) {
      await refreshEntitlement();
    }
    return result;
  }, [refreshEntitlement]);

  const canAccess = useCallback(async (feature: ProFeature) => {
    return EntitlementManager.canAccess(feature);
  }, []);

  return {
    isPro: entitlement.isPro,
    activePlanId: entitlement.activePlanId,
    expiresAt: entitlement.expiresAt,
    loading,
    purchasePlan,
    restorePurchases,
    canAccess,
    refreshEntitlement,
  };
}
