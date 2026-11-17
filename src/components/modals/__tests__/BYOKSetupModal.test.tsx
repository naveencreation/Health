import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BYOKSetupModal } from '../BYOKSetupModal';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-clipboard', () => ({ getStringAsync: jest.fn() }));

let mockConfigured = true;
jest.mock('@/services/ai', () => ({
  AIService: {
    isKeyConfigured: () => Promise.resolve(mockConfigured),
    getMaskedKey: () => Promise.resolve('••••7Qx'),
    sanitizeKey: (k: string) => k,
  },
}));

describe('BYOKSetupModal take-a-photo', () => {
  const onClose = jest.fn();
  const onTakePhoto = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigured = true;
  });

  it('closes the sheet then calls onTakePhoto when a key is connected', async () => {
    const { findByTestId } = await render(
      <BYOKSetupModal visible onClose={onClose} onTakePhoto={onTakePhoto} />
    );
    const btn = await findByTestId('btn-byok-take-photo');
    fireEvent.press(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onTakePhoto).toHaveBeenCalledTimes(1);
  });

  it('hides the button without a key or without the prop', async () => {
    mockConfigured = false;
    const first = await render(
      <BYOKSetupModal visible onClose={onClose} onTakePhoto={onTakePhoto} />
    );
    await waitFor(() => expect(first.getByText('Verify and connect')).toBeTruthy());
    expect(first.queryByTestId('btn-byok-take-photo')).toBeNull();
    first.unmount();

    mockConfigured = true;
    const second = await render(<BYOKSetupModal visible onClose={onClose} />);
    await waitFor(() => expect(second.getByText('Disconnect key')).toBeTruthy());
    expect(second.queryByTestId('btn-byok-take-photo')).toBeNull();
  });
});
