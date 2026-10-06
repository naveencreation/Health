import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PermissionPrimerStep } from '../PermissionPrimerStep';
import { haptics } from '@/utils/haptics';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    impactMedium: jest.fn().mockResolvedValue(undefined),
    selection: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('PermissionPrimerStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with title, description, and feature items', async () => {
    const onEnable = jest.fn();
    const onSkip = jest.fn();

    const { getByText, getByRole } = await render(
      <PermissionPrimerStep onEnablePermissions={onEnable} onSkip={onSkip} />
    );

    expect(getByText('SMART INTEGRATIONS')).toBeTruthy();
    expect(getByText('Unlock Full Precision')).toBeTruthy();
    expect(getByText('Instant Meal Scanning')).toBeTruthy();
    expect(getByText('Automatic Step Tracking')).toBeTruthy();
    expect(getByText('Smart Streak Protection')).toBeTruthy();

    expect(getByRole('button', { name: 'Enable Permissions and Continue' })).toBeTruthy();
    expect(getByRole('button', { name: 'Skip for now' })).toBeTruthy();
  });

  it('triggers haptics and onEnablePermissions when user taps Enable button', async () => {
    const onEnable = jest.fn();
    const onSkip = jest.fn();

    const { getByRole } = await render(
      <PermissionPrimerStep onEnablePermissions={onEnable} onSkip={onSkip} />
    );

    const enableButton = getByRole('button', { name: 'Enable Permissions and Continue' });
    fireEvent.press(enableButton);

    await waitFor(() => {
      expect(haptics.impactMedium).toHaveBeenCalledTimes(1);
      expect(onEnable).toHaveBeenCalledTimes(1);
    });
  });

  it('triggers haptics and onSkip when user taps Skip button', async () => {
    const onEnable = jest.fn();
    const onSkip = jest.fn();

    const { getByRole } = await render(
      <PermissionPrimerStep onEnablePermissions={onEnable} onSkip={onSkip} />
    );

    const skipButton = getByRole('button', { name: 'Skip for now' });
    fireEvent.press(skipButton);

    await waitFor(() => {
      expect(haptics.selection).toHaveBeenCalledTimes(1);
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });
});
