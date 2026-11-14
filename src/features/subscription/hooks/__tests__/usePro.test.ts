import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import { renderHook, waitFor } from '@testing-library/react-native';
import { EARLY_ACCESS } from '@/services/payments/paymentService';
import { EntitlementManager } from '@/services/payments/entitlementManager';
import { usePro } from '../usePro';

describe('early access switch', () => {
  it('is on', () => {
    expect(EARLY_ACCESS).toBe(true);
  });

  it('usePro reports Pro and early access without any purchase', async () => {
    const { result } = await renderHook(() => usePro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isPro).toBe(true);
    expect(result.current.isEarlyAccess).toBe(true);
  });

  it('EntitlementManager unlocks every feature', async () => {
    expect(await EntitlementManager.isPro()).toBe(true);
    expect(await EntitlementManager.canAccess('advanced_analytics')).toBe(true);
  });
});
