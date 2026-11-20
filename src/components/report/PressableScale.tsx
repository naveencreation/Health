import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MotionDurations, MotionCurves } from '@/theme/motion';

interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Pressable whose content eases down to 0.98 while held (withTiming, never a spring). */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      {...rest}
      onPressIn={e => {
        scale.value = withTiming(0.98, {
          duration: MotionDurations.instant,
          easing: MotionCurves.easeOut,
        });
        onPressIn?.(e);
      }}
      onPressOut={e => {
        scale.value = withTiming(1, {
          duration: MotionDurations.micro,
          easing: MotionCurves.easeOut,
        });
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};
