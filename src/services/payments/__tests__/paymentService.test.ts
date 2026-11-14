import { auth } from '@/services/firebase';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentService, formatExpiry } from '../paymentService';
import { EntitlementManager } from '../entitlementManager';
import { haptics } from '@/utils/haptics';

// These tests cover the real entitlement logic, so switch the early-access override off.
jest.mock('../paymentService', () => ({
  ...jest.requireActual('../paymentService'),
  EARLY_ACCESS: false,
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('PaymentService & EntitlementManager', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await PaymentService.revoke();
  });

  it('starts with non-pro entitlement and gates premium features', async () => {
    const entitlement = await PaymentService.getEntitlement();
    expect(entitlement.isPro).toBe(false);

    const isPro = await EntitlementManager.isPro();
    expect(isPro).toBe(false);

    const canUseAIVision = await EntitlementManager.canAccess('ai_vision_unlimited');
    expect(canUseAIVision).toBe(false);
  });

  it('successfully purchases annual plan and grants all feature entitlements', async () => {
    const res = await PaymentService.purchase('pro_annual');
    expect(res.success).toBe(true);
    expect(haptics.success).toHaveBeenCalled();

    const entitlement = await PaymentService.getEntitlement();
    expect(entitlement.isPro).toBe(true);
    expect(entitlement.activePlanId).toBe('pro_annual');
    expect(entitlement.expiresAt).toBeTruthy();

    const isPro = await EntitlementManager.isPro();
    expect(isPro).toBe(true);

    const canUseAIVision = await EntitlementManager.canAccess('ai_vision_unlimited');
    expect(canUseAIVision).toBe(true);

    const canUseRiaCoach = await EntitlementManager.canAccess('ria_coach_advanced');
    expect(canUseRiaCoach).toBe(true);
  });

  it('restores existing purchases correctly', async () => {
    // Before purchase
    const preRestore = await PaymentService.restore();
    expect(preRestore.restored).toBe(false);

    // After purchase
    await PaymentService.purchase('pro_lifetime');
    const postRestore = await PaymentService.restore();
    expect(postRestore.restored).toBe(true);
    expect(postRestore.planId).toBe('pro_lifetime');
  });

  it('keeps entitlement per account on the same device', async () => {
    const original = auth.currentUser;
    await PaymentService.purchase('pro_lifetime');
    expect((await PaymentService.getEntitlement()).isPro).toBe(true);

    (auth as any).currentUser = { uid: 'other_user' };
    try {
      expect((await PaymentService.getEntitlement()).isPro).toBe(false);
    } finally {
      (auth as any).currentUser = original;
    }
    expect((await PaymentService.getEntitlement()).isPro).toBe(true);
  });

  it('starts the annual period after the 7-day trial and labels lifetime plans', async () => {
    await PaymentService.purchase('pro_annual');
    const { expiresAt } = await PaymentService.getEntitlement();
    const days = (new Date(expiresAt!).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(371);
    expect(days).toBeLessThan(374);
    expect(formatExpiry('lifetime')).toBe('Lifetime access');
    expect(formatExpiry(undefined)).toBe('Active');
  });
});
