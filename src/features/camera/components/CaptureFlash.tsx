import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

interface CaptureFlashProps {
  opacity: SharedValue<number>;
}

export const CaptureFlash: React.FC<CaptureFlashProps> = React.memo(({ opacity }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.flashOverlay, animatedStyle]}
      pointerEvents="none"
    />
  );
});

const styles = StyleSheet.create({
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 99,
  },
});
