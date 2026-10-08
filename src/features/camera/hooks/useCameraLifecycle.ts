import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

interface UseCameraLifecycleOptions {
  isOpen: boolean;
}

export function useCameraLifecycle({ isOpen }: UseCameraLifecycleOptions) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isAppForeground, setIsAppForeground] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  // AppState listener to pause/unmount camera when backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const isForeground = nextState === 'active';
      setIsAppForeground(isForeground);
      if (!isForeground) {
        setIsCameraReady(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Request permission automatically once when sheet opens if undetermined
  const hasRequestedInitialRef = useRef(false);
  useEffect(() => {
    if (isOpen && permission && !permission.granted && permission.canAskAgain && !hasRequestedInitialRef.current) {
      hasRequestedInitialRef.current = true;
      requestPermission().catch(() => {});
    }
  }, [isOpen, permission, requestPermission]);

  // Reset ready state when sheet is closed
  useEffect(() => {
    if (!isOpen) {
      setIsCameraReady(false);
      setMountError(null);
    }
  }, [isOpen]);

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
    setMountError(null);
  }, []);

  const handleMountError = useCallback((error: { message: string }) => {
    setMountError(error.message || 'Failed to initialize camera sensor');
    setIsCameraReady(false);
  }, []);

  const shouldMountCamera = isOpen && isAppForeground && (permission?.granted ?? false);

  return {
    permission,
    requestPermission,
    isCameraReady,
    mountError,
    shouldMountCamera,
    handleCameraReady,
    handleMountError,
  };
}
