import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, StyleProp, ViewStyle, Platform } from 'react-native';

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
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounceAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -6,
            duration: 320,
            easing: Easing.bezier(0.2, 0.64, 0.21, 1),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 320,
            easing: Easing.bezier(0.42, 0, 0.58, 1),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.delay(320 - delay),
        ])
      );
    };

    const anim1 = createBounceAnimation(dot1, 0);
    const anim2 = createBounceAnimation(dot2, 140);
    const anim3 = createBounceAnimation(dot3, 280);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    marginHorizontal: gap / 2,
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[dotStyle, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[dotStyle, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[dotStyle, { transform: [{ translateY: dot3 }] }]} />
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
