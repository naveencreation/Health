import React from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ShutterButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const OUTER_RING_SIZE = 76;
const INNER_DISC_SIZE = 64;

export const ShutterButton: React.FC<ShutterButtonProps> = React.memo(
  ({ onPress, disabled = false }) => {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
      'worklet';
      scale.value = withTiming(0.93, {
        duration: 90,
        easing: Easing.out(Easing.cubic),
      });
    };

    const handlePressOut = () => {
      'worklet';
      scale.value = withTiming(1, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
      });
    };

    const animatedInnerStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Take photo"
        style={styles.touchTarget}
      >
        <Animated.View style={styles.outerRing}>
          <Animated.View
            style={[
              styles.innerDisc,
              animatedInnerStyle,
              disabled && styles.innerDiscDisabled,
            ]}
          />
        </Animated.View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  touchTarget: {
    width: OUTER_RING_SIZE + 12,
    height: OUTER_RING_SIZE + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    borderRadius: OUTER_RING_SIZE / 2,
    borderWidth: 3.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerDisc: {
    width: INNER_DISC_SIZE,
    height: INNER_DISC_SIZE,
    borderRadius: INNER_DISC_SIZE / 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  innerDiscDisabled: {
    opacity: 0.6,
  },
});
