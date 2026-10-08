import React, { useEffect } from 'react';
import { StyleSheet, Platform, ViewStyle, StyleProp, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { MotionDurations, MotionCurves } from '@/theme/motion';

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
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (!isMounted) return;
        if (reduced) {
          translateX.value = 0;
        } else {
          translateX.value = withTiming(0, {
            duration: MotionDurations.screen,
            easing: MotionCurves.easeOut,
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        translateX.value = withTiming(0, {
          duration: MotionDurations.screen,
          easing: MotionCurves.easeOut,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [screenWidth, translateX]);

  useEffect(() => {
    if (isClosing) {
      AccessibilityInfo.isReduceMotionEnabled()
        .then(reduced => {
          if (reduced) {
            translateX.value = screenWidth;
            onClosed();
          } else {
            translateX.value = withTiming(
              screenWidth,
              {
                duration: MotionDurations.emphasized,
                easing: MotionCurves.easeIn,
              },
              finished => {
                if (finished) {
                  runOnJS(onClosed)();
                }
              }
            );
          }
        })
        .catch(() => {
          translateX.value = withTiming(
            screenWidth,
            {
              duration: MotionDurations.emphasized,
              easing: MotionCurves.easeIn,
            },
            finished => {
              if (finished) {
                runOnJS(onClosed)();
              }
            }
          );
        });
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
