/**
 * LimitReachedCard.test.tsx
 * 
 * Tests for LimitReachedCard component:
 * - Free user daily limit layout with Upgrade to Pro CTA
 * - Pro user fair-use message without Upgrade button
 * - Press interactions and haptic triggers
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    impactLight: jest.fn().mockResolvedValue(undefined),
  },
}));

import { LimitReachedCard } from '../LimitReachedCard';
import { haptics } from '@/utils/haptics';

describe('LimitReachedCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders free user limit state with Upgrade button', async () => {
    const onUpgradeMock = jest.fn();
    const { getByTestId, getByText } = await render(
      <LimitReachedCard isPro={false} limit={3} onUpgradePress={onUpgradeMock} />
    );

    expect(getByTestId('limit-card-title').props.children).toBe("That's your 3 for today.");
    expect(getByTestId('limit-card-subtitle').props.children).toContain('Upgrade to Pro');
    expect(getByText('Upgrade to Pro')).toBeTruthy();
  });

  it('fires onUpgradePress and haptics when upgrade button is tapped', async () => {
    const onUpgradeMock = jest.fn();
    const { getByTestId } = await render(
      <LimitReachedCard isPro={false} limit={3} onUpgradePress={onUpgradeMock} />
    );

    const btn = getByTestId('limit-card-upgrade-btn');
    fireEvent.press(btn);

    expect(haptics.impactLight).toHaveBeenCalled();
    expect(onUpgradeMock).toHaveBeenCalled();
  });

  it('renders pro user fair-use state without upgrade button', async () => {
    const onUpgradeMock = jest.fn();
    const { getByTestId, queryByTestId } = await render(
      <LimitReachedCard isPro={true} limit={50} onUpgradePress={onUpgradeMock} />
    );

    expect(getByTestId('limit-card-title').props.children).toBe("That's your 50 for today.");
    expect(getByTestId('limit-card-subtitle').props.children).toContain('Fair use');
    expect(queryByTestId('limit-card-upgrade-btn')).toBeNull();
  });
});
