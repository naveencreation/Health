import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HealthConnectSyncCard } from '../HealthConnectSyncCard';

jest.mock('expo-image', () => ({
  Image: 'ExpoImage',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('HealthConnectSyncCard', () => {
  test('renders 1-tap setup card when disconnected', async () => {
    const mockConnect = jest.fn();
    const { getByText, getByLabelText } = await render(
      <HealthConnectSyncCard
        isConnected={false}
        onConnect={mockConnect}
      />
    );

    expect(getByText('Auto-Sync Steps')).toBeTruthy();
    expect(getByText('Google Fit · Samsung Health · Watch')).toBeTruthy();
    expect(getByText('Set Up')).toBeTruthy();

    fireEvent.press(getByLabelText('Connect Health Connect'));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  test('renders minimal status bar when connected with synced steps', async () => {
    const mockConnect = jest.fn();
    const mockOpenSettings = jest.fn();
    const { getByText, getByLabelText } = await render(
      <HealthConnectSyncCard
        isConnected={true}
        syncedCount={1269}
        onConnect={mockConnect}
        onOpenSettings={mockOpenSettings}
      />
    );

    expect(getByText('Health Connect Active')).toBeTruthy();
    expect(getByText('✓ 1,269 steps')).toBeTruthy();

    // Tap bar to open settings
    fireEvent.press(getByLabelText('Manage Health Connect settings'));
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);

    // Tap sync refresh button
    fireEvent.press(getByLabelText('Sync steps data now'));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });
});
