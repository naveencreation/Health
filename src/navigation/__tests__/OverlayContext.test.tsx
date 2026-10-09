import React from 'react';
import { Text, Pressable, View, BackHandler } from 'react-native';
import { render, fireEvent, renderHook, act } from '@testing-library/react-native';
import { OverlayProvider, useOverlay, useOptionalOverlay } from '../OverlayContext';

describe('OverlayContext', () => {
  it('throws error when useOverlay is called outside OverlayProvider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(async () => {
      await renderHook(() => useOverlay());
    }).rejects.toThrow('useOverlay must be used within an OverlayProvider');
    spy.mockRestore();
  });

  it('returns null when useOptionalOverlay is called outside OverlayProvider', async () => {
    const { result } = await renderHook(() => useOptionalOverlay());
    expect(result.current).toBeNull();
  });

  it('opens and closes modals, and reports isOpen correctly', async () => {
    const TestComponent = () => {
      const { activeModal, openModal, closeModal, isOpen } = useOverlay();
      return (
        <View>
          <Text testID="current-modal">{activeModal?.type ?? 'none'}</Text>
          <Text testID="is-food-open">{isOpen('foodLog') ? 'yes' : 'no'}</Text>
          <Pressable
            testID="btn-open-food"
            onPress={() => openModal({ type: 'foodLog', initialMeal: 'breakfast' })}
          />
          <Pressable testID="btn-close" onPress={closeModal} />
        </View>
      );
    };

    const { getByTestId } = await render(
      <OverlayProvider>
        <TestComponent />
      </OverlayProvider>
    );

    expect(getByTestId('current-modal').props.children).toBe('none');
    expect(getByTestId('is-food-open').props.children).toBe('no');

    // Open food log
    await act(async () => {
      fireEvent.press(getByTestId('btn-open-food'));
    });
    expect(getByTestId('current-modal').props.children).toBe('foodLog');
    expect(getByTestId('is-food-open').props.children).toBe('yes');

    // Close
    await act(async () => {
      fireEvent.press(getByTestId('btn-close'));
    });
    expect(getByTestId('current-modal').props.children).toBe('none');
    expect(getByTestId('is-food-open').props.children).toBe('no');
  });

  it('intercepts BackHandler when modal is active', async () => {
    let backPressHandler: any = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event: any, handler: any) => {
      if (event === 'hardwareBackPress') {
        backPressHandler = handler;
      }
      return { remove: jest.fn() } as any;
    });

    const { result } = await renderHook(() => useOverlay(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <OverlayProvider>{children}</OverlayProvider>
      ),
    });

    // When no modal is open, back press returns false (allows default Android exit/back)
    expect(backPressHandler).toBeDefined();
    expect(backPressHandler()).toBe(false);

    // Open a modal
    await act(async () => {
      result.current.openModal({ type: 'riaChat' });
    });
    expect(result.current.isOpen('riaChat')).toBe(true);

    // Back press should consume the event and close modal
    let handled = false;
    await act(async () => {
      handled = backPressHandler();
    });
    expect(handled).toBe(true);
    expect(result.current.activeModal).toBeNull();
  });
});
