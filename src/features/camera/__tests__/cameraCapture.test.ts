import { renderHook, act } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    withSequence: (...args: any[]) => args[0],
    runOnJS: (fn: any) => fn,
    Easing: {
      out: () => ({}),
      in: () => ({}),
      inOut: () => ({}),
      cubic: {},
      linear: {},
      ease: {},
    },
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

jest.mock('@/utils/haptics', () => ({
  haptics: {
    impactMedium: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    selection: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/imageUtils', () => ({
  readBase64FromUri: jest.fn().mockResolvedValue('mockFallbackBase64'),
}));

import { useCameraCapture } from '../hooks/useCameraCapture';
import { useCameraGestures } from '../hooks/useCameraGestures';
import * as CameraIndex from '../index';

describe('Camera Feature Tests', () => {
  describe('Exports', () => {
    it('exports CameraSheet and primitive components correctly', () => {
      expect(CameraIndex.CameraSheet).toBeDefined();
      expect(CameraIndex.CameraControls).toBeDefined();
      expect(CameraIndex.ShutterButton).toBeDefined();
      expect(CameraIndex.CameraMenu).toBeDefined();
      expect(CameraIndex.CaptureFlash).toBeDefined();
      expect(CameraIndex.FocusIndicator).toBeDefined();
    });
  });

  describe('useCameraCapture hook', () => {
    it('initializes with idle capture state and no captured photo', async () => {
      const { result } = await renderHook(() =>
        useCameraCapture({
          isCameraReady: true,
          triggerFlash: jest.fn(),
        })
      );

      expect(result.current.captureState).toBe('idle');
      expect(result.current.isCapturing).toBe(false);
      expect(result.current.capturedPhoto).toBeNull();
    });

    it('does not capture if camera is not ready', async () => {
      const onPhotoCaptured = jest.fn();
      const { result } = await renderHook(() =>
        useCameraCapture({
          isCameraReady: false,
          onPhotoCaptured,
          triggerFlash: jest.fn(),
        })
      );

      await act(async () => {
        await result.current.capturePhoto();
      });

      expect(result.current.captureState).toBe('idle');
      expect(onPhotoCaptured).not.toHaveBeenCalled();
    });

    it('successfully captures photo when camera ref is populated and ready', async () => {
      const mockTakePictureAsync = jest.fn().mockResolvedValue({
        uri: 'file:///path/to/test.jpg',
        width: 1080,
        height: 1440,
        base64: 'mockBase64String',
      });
      const onPhotoCaptured = jest.fn();
      const triggerFlash = jest.fn();

      const { result } = await renderHook(() =>
        useCameraCapture({
          isCameraReady: true,
          onPhotoCaptured,
          triggerFlash,
        })
      );

      // Attach mock camera ref instance
      (result.current.cameraRef as any).current = {
        takePictureAsync: mockTakePictureAsync,
      };

      await act(async () => {
        await result.current.capturePhoto();
      });

      expect(triggerFlash).toHaveBeenCalled();
      expect(mockTakePictureAsync).toHaveBeenCalledWith({
        quality: 0.8,
        base64: true,
      });
      expect(result.current.captureState).toBe('captured');
      expect(result.current.capturedPhoto).toEqual({
        uri: 'file:///path/to/test.jpg',
        width: 1080,
        height: 1440,
        base64: 'mockBase64String',
      });
      expect(onPhotoCaptured).toHaveBeenCalled();
    });

    it('resets capture state cleanly when resetCapture is invoked', async () => {
      const mockTakePictureAsync = jest.fn().mockResolvedValue({
        uri: 'file:///path/to/test.jpg',
        width: 1080,
        height: 1440,
      });

      const { result } = await renderHook(() =>
        useCameraCapture({
          isCameraReady: true,
          triggerFlash: jest.fn(),
        })
      );

      (result.current.cameraRef as any).current = {
        takePictureAsync: mockTakePictureAsync,
      };

      await act(async () => {
        await result.current.capturePhoto();
      });

      expect(result.current.captureState).toBe('captured');

      await act(async () => {
        result.current.resetCapture();
      });

      expect(result.current.captureState).toBe('idle');
      expect(result.current.capturedPhoto).toBeNull();
    });
  });

  describe('useCameraGestures hook', () => {
    it('initializes zoom at 0 with no focus reticle visible', async () => {
      const { result } = await renderHook(() => useCameraGestures());

      expect(result.current.zoom).toBe(0);
      expect(result.current.focusPoint).toBeNull();
      expect(result.current.focusOpacity.value).toBe(0);
    });

    it('clamps zoom between 0 and 1', async () => {
      const { result } = await renderHook(() => useCameraGestures());

      await act(async () => {
        result.current.setZoom(1.5);
      });
      expect(result.current.zoom).toBe(1);

      await act(async () => {
        result.current.setZoom(-0.2);
      });
      expect(result.current.zoom).toBe(0);
    });
  });
});
