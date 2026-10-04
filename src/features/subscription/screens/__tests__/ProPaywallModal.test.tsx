import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProPaywallModal } from '../ProPaywallModal';
import { usePro } from '../../hooks/usePro';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../hooks/usePro', () => ({
  usePro: jest.fn(),
}));

describe('ProPaywallModal', () => {
  const mockPurchasePlan = jest.fn();
  const mockRestorePurchases = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePro as jest.Mock).mockReturnValue({
      isPro: false,
      purchasePlan: mockPurchasePlan,
      restorePurchases: mockRestorePurchases,
    });
  });

  it('renders modal content, plans, and benefits when visible', async () => {
    const onClose = jest.fn();

    const { getByText, getByRole } = await render(
      <ProPaywallModal visible={true} onClose={onClose} highlightFeature="Food Vision" />
    );

    expect(getByText('Unlock Calorify Pro')).toBeTruthy();
    expect(getByText('Unlocks: Food Vision')).toBeTruthy();
    expect(getByText('Annual Plan')).toBeTruthy();
    expect(getByText('Monthly Plan')).toBeTruthy();
    expect(getByText('Lifetime Access')).toBeTruthy();

    expect(getByRole('button', { name: 'Close Paywall' })).toBeTruthy();
    expect(getByRole('button', { name: 'Restore Purchases' })).toBeTruthy();
  });

  it('executes purchasePlan when main action button is pressed', async () => {
    mockPurchasePlan.mockResolvedValue({ success: true });
    const onClose = jest.fn();

    const { getByRole } = await render(
      <ProPaywallModal visible={true} onClose={onClose} />
    );

    const purchaseBtn = getByRole('button', { name: 'Unlock Calorify Pro' });
    fireEvent.press(purchaseBtn);

    await waitFor(() => {
      expect(mockPurchasePlan).toHaveBeenCalledWith('pro_annual');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when close button is tapped', async () => {
    const onClose = jest.fn();

    const { getByRole } = await render(
      <ProPaywallModal visible={true} onClose={onClose} />
    );

    const closeBtn = getByRole('button', { name: 'Close Paywall' });
    fireEvent.press(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
