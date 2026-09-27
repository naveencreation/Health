import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Fonts } from '@/theme/typography';

interface AppLoadingScreenProps {
  isReady?: boolean;
  fadeAnim?: SharedValue<number>;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}

const LETTERS = ['C', 'a', 'l', 'o', 'r', 'i', 'f', 'y'] as const;

interface AnimatedLetterProps {
  char: string;
  index: number;
  progress: SharedValue<number>;
}

const AnimatedLetter: React.FC<AnimatedLetterProps> = ({ char, index, progress }) => {
  const animatedStyle = useAnimatedStyle(() => {
    // Staggered reveal window across the single master progress (0 to 1)
    const start = index * 0.08;
    const end = Math.min(1, start + 0.38);
    const letterProgress = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP);

    return {
      opacity: letterProgress,
      transform: [
        {
          translateY: interpolate(letterProgress, [0, 1], [6, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Text style={styles.letterText}>{char}</Text>
    </Animated.View>
  );
};

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  isReady = true,
  fadeAnim,
  pointerEvents = 'auto',
}) => {
  // Flame horizontal glide: starts at 0 (exact native splash center), moves to -64dp
  const flameTranslateX = useSharedValue(0);

  // Single synchronized master progress for letter-by-letter reveal (0 to 1)
  const wordmarkProgress = useSharedValue(0);

  useEffect(() => {
    if (!isReady) return;

    // 1. After 160ms freeze-frame, flame smoothly glides leftward
    flameTranslateX.value = withDelay(
      160,
      withTiming(-64, {
        duration: 520,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Swift launch, silky deceleration
      })
    );

    // 2. Synchronized reveal of "Calorify" right behind the gliding flame
    wordmarkProgress.value = withDelay(
      220,
      withTiming(1, {
        duration: 440,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [isReady]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim ? fadeAnim.value : 1,
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: flameTranslateX.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, containerAnimatedStyle]}
      pointerEvents={pointerEvents}
    >
      {/* Anchored Brand Centerpiece: Exact 0px match with native splash, glides left */}
      <View style={styles.centerLockupAnchor} pointerEvents="none">
        <Animated.View style={[styles.flameContainer, flameAnimatedStyle]}>
          <Image
            source={require('../../../assets/splash-icon.png')}
            style={styles.flameImage}
            contentFit="contain"
            priority="high"
            cachePolicy="memory-disk"
          />
        </Animated.View>

        {/* Staggered Letter-by-Letter Reveal: Sits directly right of flame */}
        <View style={styles.wordmarkContainer}>
          {LETTERS.map((char, index) => (
            <AnimatedLetter
              key={index}
              char={char}
              index={index}
              progress={wordmarkProgress}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAF9F6',
    zIndex: 9999,
  },
  centerLockupAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameContainer: {
    position: 'absolute',
    width: 288,
    height: 288,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameImage: {
    width: 288,
    height: 288,
  },
  wordmarkContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -25, // Placed 12dp to the right of the flame's resting position (-37dp + 12dp = -25dp)
    marginTop: -16,  // Optical vertical baseline match with the flame's visual center
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  letterText: {
    fontFamily: Fonts.kurale || 'System',
    fontSize: 32,
    color: '#000000', // Solid black typography
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
});
