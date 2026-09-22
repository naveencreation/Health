import React, { useEffect } from 'react';
import {
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface ScreenTransitionContainerProps {
  children: React.ReactNode;
  direction?: 'forward' | 'backward' | 'fade';
  transitionKey: string | number;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}

export const ScreenTransitionContainer: React.FC<ScreenTransitionContainerProps> = ({
  children,
  direction = 'forward',
  transitionKey,
  style,
  duration = 240,
}) => {
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = 0;
    animValue.value = withTiming(1, { duration });
  }, [transitionKey, duration, animValue]);

  const offset = direction === 'forward' ? 32 : direction === 'backward' ? -32 : 0;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animValue.value, [0, 0.4, 1], [0, 0.7, 1]),
    transform: offset !== 0 ? [{ translateX: interpolate(animValue.value, [0, 1], [offset, 0]) }] : [],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
