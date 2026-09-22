import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface BrandRingLoaderProps {
  size?: number;
  primaryColor?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const BrandRingLoader: React.FC<BrandRingLoaderProps> = ({
  size = 48,
  primaryColor = '#F47551',
  accentColor = '#CDE26D',
  style,
}) => {
  const rotateAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    rotateAnim.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      false
    );

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
  }, [rotateAnim, pulseAnim]);

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotateAnim.value, [0, 1], [0, 360])}deg` },
      { scale: pulseAnim.value },
    ],
  }));

  const innerCoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const outerSize = size;
  const innerSize = Math.round(size * 0.72);

  return (
    <View style={[styles.wrapper, { width: outerSize, height: outerSize }, style]}>
      <Animated.View
        style={[
          styles.outerRing,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderTopColor: primaryColor,
            borderRightColor: accentColor,
            borderBottomColor: 'transparent',
            borderLeftColor: primaryColor,
          },
          outerRingStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.innerCore,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: `${primaryColor}18`,
          },
          innerCoreStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderStyle: 'solid',
  },
  innerCore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
