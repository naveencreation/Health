import React, { useEffect } from 'react';
import { StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';

export interface SlideInSubScreenProps {
  children: React.ReactNode;
  isClosing: boolean;
  onClosed: () => void;
  screenWidth: number;
  zIndex?: number;
  style?: StyleProp<ViewStyle>;
}

export const SlideInSubScreen: React.FC<SlideInSubScreenProps> = ({
  children,
  isClosing,
  onClosed,
  screenWidth,
  zIndex = 100,
  style,
}) => {
  const translateX = useSharedValue(screenWidth);

  useEffect(() => {
    translateX.value = withTiming(0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [screenWidth, translateX]);

  useEffect(() => {
    if (isClosing) {
      translateX.value = withTiming(
        screenWidth,
        {
          duration: 220,
          easing: Easing.in(Easing.cubic),
        },
        finished => {
          if (finished) {
            runOnJS(onClosed)();
          }
        }
      );
    }
  }, [isClosing, screenWidth, translateX, onClosed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.subScreenContainer, { zIndex }, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  subScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    ...(Platform.OS !== 'android'
      ? {
          shadowColor: '#0F172A',
          shadowOffset: { width: -3, height: 0 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        }
      : {}),
  },
});
