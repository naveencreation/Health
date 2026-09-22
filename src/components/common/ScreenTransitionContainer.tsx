import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
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

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration,
      // useNativeDriver: false is required on New Architecture (Fabric).
      // Opacity interpolations crash with forEach-of-null when native driver
      // tries to traverse the animated node graph on Android.
      useNativeDriver: false,
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
          transform: offset !== 0 ? [{ translateX }] : [],
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
