/**
 * RiaContextStrip.test.tsx
 * 
 * Unit tests for RiaContextStrip component:
 * - Rendering calories and protein remaining
 * - Sensitive mode text hiding raw numbers
 * - Expand / collapse toggle
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

import { RiaContextStrip } from '../RiaContextStrip';
import { haptics } from '@/utils/haptics';

describe('RiaContextStrip', () => {
  it('renders remaining calories and protein correctly', async () => {
    const { getByTestId } = await render(
      <RiaContextStrip remainingCalories={1240} proteinRemaining={62} />
    );

    const text = getByTestId('ria-context-text');
    expect(text.props.children).toContain('1,240 kcal left');
    expect(text.props.children).toContain('62g protein to go');
  });

  it('hides numbers in sensitive mode', async () => {
    const { getByTestId } = await render(
      <RiaContextStrip remainingCalories={1240} proteinRemaining={62} isSensitiveMode={true} />
    );

    const text = getByTestId('ria-context-text');
    expect(text.props.children).toContain('Gentle mode');
    expect(text.props.children).not.toContain('1,240');
  });

  it('toggles collapse on press', async () => {
    const { getByTestId, queryByTestId } = await render(
      <RiaContextStrip remainingCalories={500} proteinRemaining={30} />
    );

    expect(getByTestId('ria-context-text')).toBeTruthy();

    const strip = getByTestId('ria-context-strip');
    await act(async () => {
      fireEvent.press(strip);
    });

    await waitFor(() => {
      expect(queryByTestId('ria-context-text')).toBeNull();
    });

    expect(haptics.selection).toHaveBeenCalled();

    // Toggle back
    await act(async () => {
      fireEvent.press(strip);
    });

    await waitFor(() => {
      expect(getByTestId('ria-context-text')).toBeTruthy();
    });
  });
});
