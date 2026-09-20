import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
  AccessibilityInfo,
  Platform,
} from 'react-native';

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
  const animValue = useRef(new Animated.Value(0)).current;
  const isReducedMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReducedMotionRef.current = enabled;
    });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        isReducedMotionRef.current = enabled;
      }
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isReducedMotionRef.current) {
      animValue.setValue(1);
      return;
    }

    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [transitionKey, duration]);

  const offset = direction === 'forward' ? 32 : direction === 'backward' ? -32 : 0;

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [offset, 0],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.7, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity,
          transform: offset !== 0 ? [{ translateX }] : undefined,
        },
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
