import { useState, useRef, useCallback } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import {
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { FocusPoint } from '../types';

export function useCameraGestures() {
  const [zoom, setRawZoom] = useState(0);
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

  const setZoom = useCallback((val: number | ((prev: number) => number)) => {
    setRawZoom((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      return Math.min(1, Math.max(0, next));
    });
  }, []);

  // Reanimated shared values for focus reticle micro-animation
  const focusScale = useSharedValue(1);
  const focusOpacity = useSharedValue(0);

  // Surface dimensions for bounds checking
  const surfaceWidthRef = useRef(300);
  const surfaceHeightRef = useRef(400);

  // Pinch tracking state
  const initialDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef(0);
  const isPinchingRef = useRef(false);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    surfaceWidthRef.current = e.nativeEvent.layout.width;
    surfaceHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  const handleTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      const touches = e.nativeEvent.touches;
      if (touches.length === 2) {
        // Multi-touch pinch started
        isPinchingRef.current = true;
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        initialDistanceRef.current = Math.hypot(dx, dy);
        initialZoomRef.current = zoom;
      } else if (touches.length === 1 && !isPinchingRef.current) {
        // Single touch tap for visual focus reticle
        const touch = touches[0];
        const x = touch.locationX;
        const y = touch.locationY;

        setFocusPoint({ x, y });

        // Trigger reticle animation: pop in (scale 1.35 -> 1.0) then smooth fade out
        focusScale.value = 1.35;
        focusOpacity.value = 1;
        focusScale.value = withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
        });

        focusOpacity.value = withSequence(
          withTiming(1, { duration: 180 }),
          withTiming(1, { duration: 800 }), // Reticle dwell
          withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) })
        );
      }
    },
    [zoom, focusScale, focusOpacity]
  );

  const handleTouchMove = useCallback((e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    if (touches.length === 2 && initialDistanceRef.current !== null) {
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      const currentDistance = Math.hypot(dx, dy);
      const ratio = currentDistance / initialDistanceRef.current;

      // Map scale ratio smoothly to 0..1 zoom range
      const newZoom = Math.min(
        1,
        Math.max(0, initialZoomRef.current + (ratio - 1) * 0.6)
      );
      setZoom(newZoom);
    }
  }, [setZoom]);

  const handleTouchEnd = useCallback((e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length < 2) {
      initialDistanceRef.current = null;
      isPinchingRef.current = false;
    }
  }, []);

  const resetZoom = useCallback(() => {
    setRawZoom(0);
  }, []);

  return {
    zoom,
    setZoom,
    resetZoom,
    focusPoint,
    focusScale,
    focusOpacity,
    handleLayout,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
