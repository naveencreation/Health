import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  trackColor?: string;
  fillColor?: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = 6,
  trackColor = '#E2E8F0',
  fillColor = '#10B981',
  duration = 400,
  style,
  fillStyle,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const animatedProgress = useSharedValue(clamped);
  const isReducedMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReducedMotion.current = enabled;
    });
  }, []);

  useEffect(() => {
    if (isReducedMotion.current) {
      animatedProgress.value = clamped;
      return;
    }

    animatedProgress.value = withTiming(clamped, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, duration, animatedProgress]);

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: `${interpolate(animatedProgress.value, [0, 1], [0, 100])}%`,
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            backgroundColor: fillColor,
            borderRadius: height / 2,
          },
          fillAnimatedStyle,
          fillStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
