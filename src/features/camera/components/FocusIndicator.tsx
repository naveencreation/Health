import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { FocusPoint } from '../types';

interface FocusIndicatorProps {
  point: FocusPoint | null;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
}

const RETICLE_SIZE = 54;

/**
 * FocusIndicator:
 * NOTE: Expo Camera does NOT support autofocus at a specific coordinate point.
 * This component provides essential visual confirmation feedback only, indicating
 * where the user tapped on the viewfinder.
 */
export const FocusIndicator: React.FC<FocusIndicatorProps> = React.memo(
  ({ point, scale, opacity }) => {
    const animatedStyle = useAnimatedStyle(() => {
      if (!point) return { opacity: 0 };
      return {
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
        left: point.x - RETICLE_SIZE / 2,
        top: point.y - RETICLE_SIZE / 2,
      };
    });

    if (!point) return null;

    return (
      <Animated.View
        style={[styles.container, animatedStyle]}
        pointerEvents="none"
      >
        <View style={styles.reticleBox}>
          {/* Corner accents */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  reticleBox: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 8,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 4,
  },
});
