import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { OverlayProvider, useOverlay } from '../OverlayContext';
import { OverlayHost } from '../OverlayHost';

// Mock HealthContext
jest.mock('@/context/HealthContext', () => ({
  useGoals: () => ({
    userGoals: { avatarUrl: '' },
    updateGoals: jest.fn(),
  }),
  useDailyLog: () => ({
    currentLog: { meals: [], waterMl: 0, steps: 0, activities: [] },
    selectedDate: '2026-10-09',
  }),
  useAuth: () => ({
    currentUser: { id: 'test_uid' },
    isAuthenticated: true,
  }),
}));

// Mock modals to verify visibility and mounting cleanly
jest.mock('@/components', () => {
  const { View, Text } = require('react-native');
  return {
    FoodLogModal: ({ visible, mealType }: any) =>
      visible ? <Text testID="modal-food-log">FoodLogModal: {mealType}</Text> : null,
    FoodVisionModal: ({ visible, initialMealType }: any) =>
      visible ? <Text testID="modal-food-vision">FoodVisionModal: {initialMealType}</Text> : null,
    BarcodeScannerModal: ({ visible }: any) =>
      visible ? <Text testID="modal-barcode">BarcodeScannerModal</Text> : null,
    BYOKSetupModal: ({ visible }: any) =>
      visible ? <Text testID="modal-byok">BYOKSetupModal</Text> : null,
    NotificationModal: ({ visible }: any) =>
      visible ? <Text testID="modal-notifications">NotificationModal</Text> : null,
    AvatarPickerModal: ({ visible }: any) =>
      visible ? <Text testID="modal-avatar">AvatarPickerModal</Text> : null,
    RiaChatModal: ({ visible }: any) =>
      visible ? <Text testID="modal-ria">RiaChatModal</Text> : null,
    ConfirmationModal: ({ visible, title }: any) =>
      visible ? <Text testID="modal-confirm">{title}</Text> : null,
    SlideInSubScreen: ({ children }: any) => <View testID="slide-in-container">{children}</View>,
  };
});

// Mock subscreens
jest.mock('@/screens', () => {
  const { Text } = require('react-native');
  return {
    WaterTrackerScreen: () => <Text testID="screen-water-tracker">WaterTrackerScreen</Text>,
    WeightTrackerScreen: () => <Text testID="screen-weight-tracker">WeightTrackerScreen</Text>,
    StepTrackerScreen: () => <Text testID="screen-step-tracker">StepTrackerScreen</Text>,
  };
});

describe('OverlayHost', () => {
  const HostWrapper: React.FC<{ onTrigger?: (overlay: ReturnType<typeof useOverlay>) => void }> = ({
    onTrigger,
  }) => {
    const overlay = useOverlay();
    React.useEffect(() => {
      onTrigger?.(overlay);
    }, [overlay, onTrigger]);

    return <OverlayHost screenWidth={390} />;
  };

  it('renders nothing active by default', async () => {
    const { queryByTestId } = await render(
      <OverlayProvider>
        <HostWrapper />
      </OverlayProvider>
    );

    expect(queryByTestId('modal-food-log')).toBeNull();
    expect(queryByTestId('modal-byok')).toBeNull();
    expect(queryByTestId('screen-water-tracker')).toBeNull();
  });

  it('renders FoodLogModal when foodLog is opened', async () => {
    let overlayContext: any;
    const { getByTestId } = await render(
      <OverlayProvider>
        <HostWrapper onTrigger={ctx => (overlayContext = ctx)} />
      </OverlayProvider>
    );

    await act(async () => {
      overlayContext.openModal({ type: 'foodLog', initialMeal: 'breakfast' });
    });

    expect(getByTestId('modal-food-log').props.children).toEqual([
      'FoodLogModal: ',
      'breakfast',
    ]);
  });

  it('renders FoodVisionModal with preserved initialMeal', async () => {
    let overlayContext: any;
    const { getByTestId } = await render(
      <OverlayProvider>
        <HostWrapper onTrigger={ctx => (overlayContext = ctx)} />
      </OverlayProvider>
    );

    await act(async () => {
      overlayContext.openModal({ type: 'foodVision', initialMeal: 'dinner' });
    });

    expect(getByTestId('modal-food-vision').props.children).toEqual([
      'FoodVisionModal: ',
      'dinner',
    ]);
  });

  it('renders BYOKSetupModal when byokSetup is opened', async () => {
    let overlayContext: any;
    const { getByTestId, queryByTestId } = await render(
      <OverlayProvider>
        <HostWrapper onTrigger={ctx => (overlayContext = ctx)} />
      </OverlayProvider>
    );

    await act(async () => {
      overlayContext.openModal({ type: 'byokSetup' });
    });

    expect(getByTestId('modal-byok')).toBeTruthy();

    await act(async () => {
      overlayContext.closeModal();
    });

    expect(queryByTestId('modal-byok')).toBeNull();
  });

  it('renders WaterTrackerScreen when waterTracker is opened', async () => {
    let overlayContext: any;
    const { getByTestId } = await render(
      <OverlayProvider>
        <HostWrapper onTrigger={ctx => (overlayContext = ctx)} />
      </OverlayProvider>
    );

    await act(async () => {
      overlayContext.openModal({ type: 'waterTracker' });
    });

    expect(getByTestId('screen-water-tracker')).toBeTruthy();
  });
});
