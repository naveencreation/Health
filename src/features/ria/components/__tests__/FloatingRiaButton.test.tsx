/**
 * FloatingRiaButton.test.tsx
 * 
 * Unit tests for FloatingRiaButton:
 * - Render button surface with avatar
 * - Unread dot badge visibility
 * - Coach mark bubble appearance and dismissal
 * - Tap action
 * - Quick action menu options
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
  },
}));

import { FloatingRiaButton } from '../FloatingRiaButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from '@/utils/haptics';

describe('FloatingRiaButton', () => {
  const mockPress = jest.fn();
  const mockQuickAction = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('renders button trigger with accessibility role and label', async () => {
    const { getByTestId, queryByTestId } = await render(
      <FloatingRiaButton onPress={mockPress} />
    );

    const trigger = getByTestId('ria-floating-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger.props.accessibilityLabel).toBe('Ask Ria');
    expect(trigger.props.accessibilityRole).toBe('button');

    // By default, no unread badge
    expect(queryByTestId('ria-unread-badge')).toBeNull();
  });

  it('renders unread badge when hasUnread is true', async () => {
    const { getByTestId } = await render(
      <FloatingRiaButton onPress={mockPress} hasUnread={true} />
    );

    const badge = getByTestId('ria-unread-badge');
    expect(badge).toBeTruthy();
  });

  it('shows coach mark on initial mount and dismisses on close press', async () => {
    const { getByTestId, findByTestId, queryByTestId } = await render(
      <FloatingRiaButton onPress={mockPress} />
    );

    const coachMark = await findByTestId('ria-coachmark-bubble');
    expect(coachMark).toBeTruthy();

    const dismissBtn = getByTestId('ria-coachmark-dismiss');
    await act(async () => {
      fireEvent.press(dismissBtn);
    });

    expect(haptics.selection).toHaveBeenCalled();
    expect(queryByTestId('ria-coachmark-bubble')).toBeNull();

    const storedVal = await AsyncStorage.getItem('@calori_ria_coachmark_dismissed');
    expect(storedVal).toBe('true');
  });

  it('tapping the coach mark bubble triggers onPress', async () => {
    const { findByText } = await render(
      <FloatingRiaButton onPress={mockPress} />
    );

    const bubbleText = await findByText('Ask Ria anything');
    await act(async () => {
      fireEvent.press(bubbleText);
    });

    expect(mockPress).toHaveBeenCalled();
  });

  it('triggers quick actions from menu', async () => {
    const { getByTestId } = await render(
      <FloatingRiaButton
        onPress={mockPress}
        onQuickAction={mockQuickAction}
      />
    );

    // Open quick action menu via long press trigger
    const trigger = getByTestId('ria-floating-trigger');
    
    await act(async () => {
      fireEvent(trigger, 'longPress');
    });

    const menu = getByTestId('ria-quick-menu');
    expect(menu).toBeTruthy();

    // Tap 'Log by text'
    const textOption = getByTestId('ria-quick-text');
    await act(async () => {
      fireEvent.press(textOption);
    });

    expect(mockQuickAction).toHaveBeenCalledWith('text');
  });
});
