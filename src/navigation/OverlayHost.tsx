import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useOverlay } from './OverlayContext';
import { ActiveModalType } from './types';
import { useGoals } from '@/context/HealthContext';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';
import { MealType } from '@/types';

// Modals
import {
  FoodLogModal,
  FoodVisionModal,
  BarcodeScannerModal,
  BYOKSetupModal,
  NotificationModal,
  AvatarPickerModal,
  RiaChatModal,
  ConfirmationModal,
  SlideInSubScreen,
} from '@/components';

// Subscreens
import { WaterTrackerScreen, WeightTrackerScreen, StepTrackerScreen } from '@/screens';

export interface OverlayHostProps {
  screenWidth: number;
  onConfirmSignOut?: () => void;
}

export const OverlayHost: React.FC<OverlayHostProps> = ({ screenWidth, onConfirmSignOut }) => {
  const { activeModal, closeModal, openModal, isOpen } = useOverlay();
  const { userGoals, updateGoals } = useGoals();

  const [closingSubScreen, setClosingSubScreen] = useState<ActiveModalType | null>(null);

  // Sub-screen closing animation orchestrators
  const handleStartClosingSubScreen = useCallback((type: ActiveModalType) => {
    setClosingSubScreen(type);
  }, []);

  const handleSubScreenClosed = useCallback(() => {
    setClosingSubScreen(null);
    closeModal();
  }, [closeModal]);

  const activeMealType: MealType =
    activeModal && 'initialMeal' in activeModal && activeModal.initialMeal
      ? activeModal.initialMeal
      : 'lunch';

  const prefillBarcode =
    activeModal?.type === 'foodLog' ? activeModal.prefillBarcode : undefined;

  // Food modal transitions (preserve activeMealType across switching)
  const handleFoodModalToVision = useCallback(() => {
    openModal({ type: 'foodVision', initialMeal: activeMealType });
  }, [openModal, activeMealType]);

  const handleFoodModalToBarcode = useCallback(() => {
    openModal({ type: 'barcodeScanner', initialMeal: activeMealType });
  }, [openModal, activeMealType]);

  const handleFoodVisionToModal = useCallback(() => {
    openModal({ type: 'foodLog', initialMeal: activeMealType });
  }, [openModal, activeMealType]);

  const handleFoodVisionToBarcode = useCallback(() => {
    openModal({ type: 'barcodeScanner', initialMeal: activeMealType });
  }, [openModal, activeMealType]);

  const handleBarcodeEnterManually = useCallback(
    (barcode: string) => {
      openModal({ type: 'foodLog', prefillBarcode: barcode, initialMeal: activeMealType });
    },
    [openModal, activeMealType]
  );

  const boundedWidth = Math.min(screenWidth, 480);

  return (
    <>
      {/* 1. Food Logging Modal */}
      <FoodLogModal
        visible={isOpen('foodLog')}
        mealType={activeMealType}
        onClose={closeModal}
        onOpenFoodVision={handleFoodModalToVision}
        onOpenBarcodeScanner={handleFoodModalToBarcode}
        prefillBarcode={prefillBarcode}
      />

      {/* 2. AI Food Vision Camera Modal */}
      <FoodVisionModal
        visible={isOpen('foodVision')}
        onClose={closeModal}
        initialMealType={activeMealType}
        onOpenBYOKSetup={() => openModal({ type: 'byokSetup' })}
        onOpenManualSearch={handleFoodVisionToModal}
        onOpenBarcodeScanner={handleFoodVisionToBarcode}
      />

      {/* 3. Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={isOpen('barcodeScanner')}
        onClose={closeModal}
        initialMealType={activeMealType}
        onEnterManually={handleBarcodeEnterManually}
      />

      {/* 4. BYOK Setup Modal */}
      <BYOKSetupModal visible={isOpen('byokSetup')} onClose={closeModal} />

      {/* 5. Notification Center Modal */}
      <NotificationModal visible={isOpen('notifications')} onClose={closeModal} />

      {/* 6. Avatar Picker Modal */}
      <AvatarPickerModal
        visible={isOpen('avatarPicker')}
        currentAvatarUrl={userGoals?.avatarUrl || DEFAULT_AVATAR_URL}
        onClose={closeModal}
        onSelectAvatar={newUrl => updateGoals({ avatarUrl: newUrl })}
      />

      {/* 7. Ria AI Chat Modal */}
      <RiaChatModal
        visible={isOpen('riaChat')}
        onClose={closeModal}
        onOpenBYOKSetup={() => openModal({ type: 'byokSetup' })}
      />

      {/* 8. Sign Out Confirmation Modal */}
      <ConfirmationModal
        visible={isOpen('signOutConfirm')}
        title="Sign Out of Calorify?"
        message="You will need to sign back in to access your daily meal logs, streaks, and personalized coaching."
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmStyle="destructive"
        iconName="log-out-outline"
        onConfirm={() => {
          closeModal();
          onConfirmSignOut?.();
        }}
        onCancel={closeModal}
      />

      {/* 9. Slide-In Sub-Screen: Water Tracker */}
      {(isOpen('waterTracker') || closingSubScreen === 'waterTracker') && (
        <SlideInSubScreen
          screenWidth={boundedWidth}
          isClosing={closingSubScreen === 'waterTracker'}
          onClosed={handleSubScreenClosed}
          zIndex={200}
        >
          <WaterTrackerScreen onBack={() => handleStartClosingSubScreen('waterTracker')} />
        </SlideInSubScreen>
      )}

      {/* 10. Slide-In Sub-Screen: Weight Tracker */}
      {(isOpen('weightTracker') || closingSubScreen === 'weightTracker') && (
        <SlideInSubScreen
          screenWidth={boundedWidth}
          isClosing={closingSubScreen === 'weightTracker'}
          onClosed={handleSubScreenClosed}
          zIndex={200}
        >
          <WeightTrackerScreen onBack={() => handleStartClosingSubScreen('weightTracker')} />
        </SlideInSubScreen>
      )}

      {/* 11. Slide-In Sub-Screen: Step Tracker */}
      {(isOpen('stepTracker') || closingSubScreen === 'stepTracker') && (
        <SlideInSubScreen
          screenWidth={boundedWidth}
          isClosing={closingSubScreen === 'stepTracker'}
          onClosed={handleSubScreenClosed}
          zIndex={200}
        >
          <StepTrackerScreen onBack={() => handleStartClosingSubScreen('stepTracker')} />
        </SlideInSubScreen>
      )}
    </>
  );
};
