import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProMembershipCard } from '../ProMembershipCard';
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

describe('ProMembershipCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders promo card and handles upgrade press when user is not pro', async () => {
    const mockUpgrade = jest.fn();
    (usePro as jest.Mock).mockReturnValue({
      isPro: false,
      activePlanId: undefined,
    });

    const { getByText, getByRole } = await render(
      <ProMembershipCard onUpgradePress={mockUpgrade} />
    );

    expect(getByText('Unlock Calorify Pro')).toBeTruthy();
    expect(getByText('7-DAY FREE TRIAL')).toBeTruthy();

    const upgradeBtn = getByRole('button', { name: 'Upgrade to Calorify Pro' });
    fireEvent.press(upgradeBtn);

    await waitFor(() => {
      expect(mockUpgrade).toHaveBeenCalledTimes(1);
    });
  });

  it('renders active VIP membership and handles manage press when user is pro', async () => {
    const mockManage = jest.fn();
    (usePro as jest.Mock).mockReturnValue({
      isPro: true,
      activePlanId: 'pro_annual',
      expiresAt: '2027-01-01T00:00:00.000Z',
    });

    const { getByText, getByRole } = await render(
      <ProMembershipCard onUpgradePress={jest.fn()} onManagePress={mockManage} />
    );

    expect(getByText('Calorify Pro')).toBeTruthy();
    expect(getByText('ACTIVE')).toBeTruthy();
    expect(getByText('Annual VIP Membership')).toBeTruthy();

    const manageBtn = getByRole('button', { name: 'Manage Pro Subscription' });
    fireEvent.press(manageBtn);

    await waitFor(() => {
      expect(mockManage).toHaveBeenCalledTimes(1);
    });
  });
});
