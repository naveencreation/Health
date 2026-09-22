import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

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
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    pulseLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
    };
  }, [rotateAnim, pulseAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const outerSize = size;
  const innerSize = Math.round(size * 0.72);

  return (
    <View style={[styles.wrapper, { width: outerSize, height: outerSize }, style]}>
      {/* Outer Glowing Ring */}
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
            transform: [{ rotate: spin }, { scale: pulseAnim }],
          },
        ]}
      />

      {/* Inner Soft Pulsing Core */}
      <Animated.View
        style={[
          styles.innerCore,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: `${primaryColor}18`,
            transform: [{ scale: pulseAnim }],
          },
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
