/**
 * CapacityNoticeCard.test.tsx
 * 
 * Tests for CapacityNoticeCard component:
 * - Rendering of capacity resting state and back-around time
 * - Distinction from limit reached (no upgrade button)
 * - Check Status retry callback and haptic trigger
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

import { CapacityNoticeCard } from '../CapacityNoticeCard';
import { haptics } from '@/utils/haptics';

describe('CapacityNoticeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders capacity resting state with back-around time', async () => {
    const { getByTestId, queryByText } = await render(
      <CapacityNoticeCard retryAfter="4:00 PM" />
    );

    expect(getByTestId('capacity-card-title').props.children).toBe('Ria is resting.');
    expect(getByTestId('capacity-card-back-around').props.children).toBe('Back around 4:00 PM.');
    expect(getByTestId('capacity-card-subtitle').props.children).toContain('breather');

    // Never shows Upgrade to Pro button
    expect(queryByText('Upgrade to Pro')).toBeNull();
  });

  it('calls onRetryPress and haptics when Check Status is tapped', async () => {
    const onRetryMock = jest.fn();
    const { getByTestId } = await render(
      <CapacityNoticeCard retryAfter="5:00 PM" onRetryPress={onRetryMock} />
    );

    const retryBtn = getByTestId('capacity-card-retry-btn');
    fireEvent.press(retryBtn);

    expect(haptics.impactLight).toHaveBeenCalled();
    expect(onRetryMock).toHaveBeenCalled();
  });
});
