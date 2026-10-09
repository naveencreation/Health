import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { ActiveModal, ActiveModalType, OverlayContextValue } from './types';

const OverlayContext = createContext<OverlayContextValue | null>(null);

export interface OverlayProviderProps {
  children: React.ReactNode;
}

export const OverlayProvider: React.FC<OverlayProviderProps> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const activeModalRef = useRef<ActiveModal | null>(null);

  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  const openModal = useCallback((modal: ActiveModal) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const isOpen = useCallback(
    (type: ActiveModalType) => activeModal?.type === type,
    [activeModal]
  );

  // Centralized Android Hardware Back Handler
  useEffect(() => {
    const onHardwareBackPress = () => {
      if (activeModalRef.current !== null) {
        setActiveModal(null);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, []);

  const value: OverlayContextValue = {
    activeModal,
    openModal,
    closeModal,
    isOpen,
  };

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
};

export function useOverlay(): OverlayContextValue {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
}

export function useOptionalOverlay(): OverlayContextValue | null {
  return useContext(OverlayContext);
}
