import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentService } from '../paymentService';
import { EntitlementManager } from '../entitlementManager';
import { haptics } from '@/utils/haptics';

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
});
