import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ProGate } from '../ProGate';
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

describe('ProGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when user has active Pro access', async () => {
    (usePro as jest.Mock).mockReturnValue({
      isPro: true,
      loading: false,
    });

    const { getByText, queryByText } = await render(
      <ProGate feature="ai_vision_unlimited" featureName="AI Meal Vision">
        <Text>Secret Pro Content</Text>
      </ProGate>
    );

    expect(getByText('Secret Pro Content')).toBeTruthy();
    expect(queryByText('Unlock with Pro')).toBeNull();
  });

  it('renders locked card and Unlock button when user is on free tier', async () => {
    (usePro as jest.Mock).mockReturnValue({
      isPro: false,
      loading: false,
      purchasePlan: jest.fn().mockResolvedValue({ success: true }),
      restorePurchases: jest.fn().mockResolvedValue({ restored: false }),
    });

    const { getByText, queryByText, getByRole } = await render(
      <ProGate feature="ai_vision_unlimited" featureName="AI Meal Vision">
        <Text>Secret Pro Content</Text>
      </ProGate>
    );

    expect(queryByText('Secret Pro Content')).toBeNull();
    expect(getByText('AI Meal Vision')).toBeTruthy();
    expect(getByRole('button', { name: 'Unlock AI Meal Vision with Pro' })).toBeTruthy();
  });
});
