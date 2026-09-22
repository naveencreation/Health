import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface BouncingDotsLoaderProps {
  color?: string;
  size?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export const BouncingDotsLoader: React.FC<BouncingDotsLoaderProps> = ({
  color = '#FFFFFF',
  size = 7,
  gap = 5,
  style,
}) => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (toValue: number, delay: number, rest: number, restTarget: number) => {
      return withRepeat(
        withSequence(
          withDelay(delay, withTiming(toValue, { duration: 320, easing: Easing.bezier(0.2, 0.64, 0.21, 1) })),
          withTiming(0, { duration: 320, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
          withDelay(rest, withTiming(restTarget, { duration: 0 })),
        ),
        -1,
        false
      );
    };

    dot1.value = bounce(-6, 0, 320, 0);
    dot2.value = bounce(-6, 140, 180, 0);
    dot3.value = bounce(-6, 280, 40, 0);
  }, [dot1, dot2, dot3]);

  const dot1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const dot2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const dot3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  const dotBaseStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    marginHorizontal: gap / 2,
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[dotBaseStyle, dot1Style]} />
      <Animated.View style={[dotBaseStyle, dot2Style]} />
      <Animated.View style={[dotBaseStyle, dot3Style]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
});
