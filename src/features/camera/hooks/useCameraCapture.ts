import { useState, useCallback, useRef } from 'react';
import { CameraView } from 'expo-camera';
import { CaptureState, CapturedPhoto } from '../types';
import { haptics } from '@/utils/haptics';
import { readBase64FromUri } from '@/utils/imageUtils';

interface UseCameraCaptureOptions {
  isCameraReady: boolean;
  onPhotoCaptured?: (photo: CapturedPhoto) => void;
  triggerFlash: () => void;
}

export function useCameraCapture({
  isCameraReady,
  onPhotoCaptured,
  triggerFlash,
}: UseCameraCaptureOptions) {
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Synchronous lock ref to prevent rapid double-taps
  const isCapturingRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);

  const capturePhoto = useCallback(async () => {
    // Synchronous guards: must be idle and camera sensor must be ready
    if (isCapturingRef.current || !isCameraReady || !cameraRef.current) {
      return;
    }

    isCapturingRef.current = true;
    setCaptureState('capturing');
    setCaptureError(null);

    // Immediate tactile feedback & visual brightness flash on UI thread
    haptics.impactMedium().catch(() => {});
    triggerFlash();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo || !photo.uri) {
        throw new Error('Camera produced an empty or invalid picture');
      }

      // Ensure base64 is populated (fallback to reading from file URI if native bridge omitted it)
      let base64 = photo.base64;
      if (!base64 && photo.uri) {
        base64 = await readBase64FromUri(photo.uri);
      }

      const result: CapturedPhoto = {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        base64,
      };

      setCapturedPhoto(result);
      setCaptureState('captured');
      onPhotoCaptured?.(result);
    } catch (err: any) {
      const message = err?.message || 'Failed to capture photo';
      setCaptureError(message);
      setCaptureState('error');
      // Reset lock on error
      isCapturingRef.current = false;
    }
  }, [isCameraReady, triggerFlash, onPhotoCaptured]);

  const resetCapture = useCallback(() => {
    isCapturingRef.current = false;
    setCaptureState('idle');
    setCapturedPhoto(null);
    setCaptureError(null);
  }, []);

  return {
    cameraRef,
    captureState,
    capturedPhoto,
    captureError,
    capturePhoto,
    resetCapture,
    isCapturing: captureState === 'capturing' || isCapturingRef.current,
  };
}
