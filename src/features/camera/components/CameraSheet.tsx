import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraSurface } from './CameraSurface';
import { CameraControls } from './CameraControls';
import { CameraMenu } from './CameraMenu';
import { CaptureFlash } from './CaptureFlash';
import { FocusIndicator } from './FocusIndicator';
import { useCameraLifecycle } from '../hooks/useCameraLifecycle';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useCameraGestures } from '../hooks/useCameraGestures';
import { CameraFacing, CameraFlashMode, CameraSheetProps, CapturedPhoto } from '../types';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

export const CameraSheet: React.FC<CameraSheetProps> = ({
  visible,
  onClose,
  onPhotoCaptured,
  onOpenGallery,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Bottom sheet height: ~64% of screen height
  const sheetHeight = Math.round(windowHeight * 0.64);

  // Reanimated transition values
  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  // Local UI state
  const [isRenderMounted, setIsRenderMounted] = useState(false);
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [flashMode, setFlashMode] = useState<CameraFlashMode>('off');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [frozenPreviewUri, setFrozenPreviewUri] = useState<string | null>(null);

  // 1. Camera Lifecycle
  const {
    permission,
    requestPermission,
    isCameraReady,
    mountError,
    shouldMountCamera,
    handleCameraReady,
    handleMountError,
  } = useCameraLifecycle({ isOpen: visible && isRenderMounted });

  // 2. Gesture Handling
  const {
    zoom,
    focusPoint,
    focusScale,
    focusOpacity,
    handleLayout,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useCameraGestures();

  // Flash trigger helper
  const triggerFlash = useCallback(() => {
    'worklet';
    flashOpacity.value = withSequence(
      withTiming(0.9, { duration: 35, easing: Easing.linear }),
      withTiming(0, { duration: 45, easing: Easing.out(Easing.cubic) })
    );
  }, [flashOpacity]);

  const capturedPhotoRef = useRef<CapturedPhoto | null>(null);
  const handoffTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasHandedOffRef = useRef<boolean>(false);

  // 3. Capture State Machine
  const {
    cameraRef,
    capturePhoto,
    isCapturing,
    resetCapture,
  } = useCameraCapture({
    isCameraReady,
    triggerFlash,
    onPhotoCaptured: (photo) => {
      // Store full photo with base64 for handoff
      capturedPhotoRef.current = photo;
      setFrozenPreviewUri(photo.uri);
    },
  });

  const handleDismiss = useCallback(() => {
    if (handoffTimeoutRef.current) {
      clearTimeout(handoffTimeoutRef.current);
      handoffTimeoutRef.current = null;
    }
    translateY.value = withTiming(
      sheetHeight,
      { duration: 190, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setIsRenderMounted)(false);
          runOnJS(setFrozenPreviewUri)(null);
          runOnJS(resetCapture)();
          runOnJS(onClose)();
        }
      }
    );
    backdropOpacity.value = withTiming(0, { duration: 160 });
  }, [sheetHeight, translateY, backdropOpacity, onClose, resetCapture]);

  // Handoff to parent once frozen preview image loads
  const handleImageLoaded = useCallback(() => {
    if (hasHandedOffRef.current) return;

    if (handoffTimeoutRef.current) {
      clearTimeout(handoffTimeoutRef.current);
      handoffTimeoutRef.current = null;
    }

    const photo = capturedPhotoRef.current;
    if (photo) {
      hasHandedOffRef.current = true;
      handleDismiss();
      onPhotoCaptured(photo);
    } else if (frozenPreviewUri) {
      hasHandedOffRef.current = true;
      handleDismiss();
      onPhotoCaptured({
        uri: frozenPreviewUri,
        width: 0,
        height: 0,
      });
    }
  }, [frozenPreviewUri, onPhotoCaptured, handleDismiss]);

  // Fallback safety timeout if image onLoad does not fire
  useEffect(() => {
    if (frozenPreviewUri) {
      if (handoffTimeoutRef.current) clearTimeout(handoffTimeoutRef.current);
      handoffTimeoutRef.current = setTimeout(() => {
        handleImageLoaded();
      }, 350);
    }
    return () => {
      if (handoffTimeoutRef.current) {
        clearTimeout(handoffTimeoutRef.current);
        handoffTimeoutRef.current = null;
      }
    };
  }, [frozenPreviewUri, handleImageLoaded]);

  // Open & Close Sheet Animations
  useEffect(() => {
    if (visible) {
      setIsRenderMounted(true);
      setFrozenPreviewUri(null);
      capturedPhotoRef.current = null;
      hasHandedOffRef.current = false;
      if (handoffTimeoutRef.current) {
        clearTimeout(handoffTimeoutRef.current);
        handoffTimeoutRef.current = null;
      }
      resetCapture();
      setIsMenuOpen(false);

      translateY.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 180 });
    } else {
      handleDismiss();
    }
  }, [visible, handleDismiss, resetCapture, translateY, backdropOpacity]);

  // Hardware Android back button support
  useEffect(() => {
    if (!visible || !isRenderMounted) return;

    const backAction = () => {
      handleDismiss();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, isRenderMounted, handleDismiss]);

  const toggleFlash = useCallback(() => {
    setFlashMode((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
  }, []);

  const flipCamera = useCallback(() => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible && !isRenderMounted) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Top 36% Backdrop (tapping dismisses) */}
      <Animated.View
        style={[styles.backdrop, animatedBackdropStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
          accessibilityLabel="Dismiss camera sheet"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Bottom Sheet Container */}
      <Animated.View
        style={[
          styles.sheetContainer,
          { height: sheetHeight, width: windowWidth },
          animatedSheetStyle,
        ]}
      >
        {/* Subtle Top Drag/Notch Handle */}
        <View style={styles.topHandleContainer} pointerEvents="none">
          <View style={styles.topHandleBar} />
        </View>

        {/* Permission Denied / Loading State */}
        {permission && !permission.granted ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionSubtitle}>
              Calorify needs camera permission to snap and analyze your meals instantly.
            </Text>
            <Pressable
              style={styles.permissionBtn}
              onPress={() => requestPermission()}
              accessibilityRole="button"
              accessibilityLabel="Enable camera permission"
            >
              <Text style={styles.permissionBtnText}>Enable Camera</Text>
            </Pressable>
          </View>
        ) : shouldMountCamera ? (
          <View style={StyleSheet.absoluteFill}>
            {/* Live Camera Viewfinder Surface */}
            <CameraSurface
              cameraRef={cameraRef}
              facing={facing}
              flashMode={flashMode}
              zoom={zoom}
              isCameraReady={isCameraReady}
              onCameraReady={handleCameraReady}
              onMountError={handleMountError}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onLayout={handleLayout}
            />

            {/* Tap Focus Reticle Indicator */}
            <FocusIndicator
              point={focusPoint}
              scale={focusScale}
              opacity={focusOpacity}
            />

            {/* UI-Thread Flash Overlay */}
            <CaptureFlash opacity={flashOpacity} />

            {/* Frozen Capture Image Layer (Bridge for Zero-Flicker Handoff) */}
            {frozenPreviewUri && (
              <Image
                source={{ uri: frozenPreviewUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                onLoad={handleImageLoaded}
                priority="high"
              />
            )}

            {/* Popover Menu (Flash / Flip / Photos) */}
            <CameraMenu
              visible={isMenuOpen}
              flashMode={flashMode}
              facing={facing}
              onToggleFlash={toggleFlash}
              onFlipCamera={flipCamera}
              onOpenGallery={onOpenGallery}
              onClose={() => setIsMenuOpen(false)}
            />

            {/* Bottom Controls Row */}
            <CameraControls
              onBack={handleDismiss}
              onShutter={capturePhoto}
              onToggleMenu={() => setIsMenuOpen((prev) => !prev)}
              isMenuOpen={isMenuOpen}
              isCapturing={isCapturing}
              bottomInset={insets.bottom}
            />
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    zIndex: 900,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderCurve: 'continuous',
    overflow: 'hidden',
    zIndex: 901,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 16,
  },
  topHandleContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  topHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0F172A',
  },
  permissionTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  permissionBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
