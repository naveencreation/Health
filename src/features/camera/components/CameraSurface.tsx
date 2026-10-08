import React from 'react';
import {
  StyleSheet,
  View,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { CameraFacing, CameraFlashMode } from '../types';

interface CameraSurfaceProps {
  cameraRef: React.RefObject<CameraView | null>;
  facing: CameraFacing;
  flashMode: CameraFlashMode;
  zoom: number;
  isCameraReady: boolean;
  onCameraReady: () => void;
  onMountError: (error: { message: string }) => void;
  onTouchStart: (e: GestureResponderEvent) => void;
  onTouchMove: (e: GestureResponderEvent) => void;
  onTouchEnd: (e: GestureResponderEvent) => void;
  onLayout: (e: LayoutChangeEvent) => void;
}

export const CameraSurface: React.FC<CameraSurfaceProps> = React.memo(
  ({
    cameraRef,
    facing,
    flashMode,
    zoom,
    isCameraReady,
    onCameraReady,
    onMountError,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onLayout,
  }) => {
    return (
      <View
        style={styles.surfaceContainer}
        onLayout={onLayout}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Dark placeholder until hardware sensor is initialized */}
        <View style={styles.sensorPlaceholder} />

        {/* Live Hardware Camera Surface */}
        <CameraView
          ref={cameraRef as any}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flashMode}
          zoom={zoom}
          animateShutter={false}
          onCameraReady={onCameraReady}
          onMountError={onMountError}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  surfaceContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  sensorPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
  },
});
