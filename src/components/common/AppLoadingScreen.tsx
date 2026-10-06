import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
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
  fontSize: number;
  lineHeight: number;
}

const AnimatedLetter: React.FC<AnimatedLetterProps> = ({
  char,
  index,
  progress,
  fontSize,
  lineHeight,
}) => {
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
    <Animated.View style={[styles.letterWrapper, animatedStyle]}>
      <Text
        style={[
          styles.letterText,
          {
            fontSize,
            lineHeight,
          },
        ]}
        allowFontScaling={false}
      >
        {char}
      </Text>
    </Animated.View>
  );
};

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  isReady = true,
  fadeAnim,
  pointerEvents = 'auto',
}) => {
  const { width: screenWidth } = useWindowDimensions();

  // Dynamic responsive scale:
  // For compact devices (width < 360dp), scale slightly down to 0.85x so brand lockup breathes easily.
  // Standard phones (360dp - 430dp) and wider viewports use 1.0x scale.
  const scale = screenWidth < 360 ? Math.max(0.85, screenWidth / 375) : 1;
  const fontSize = Math.round(32 * scale);
  const lineHeight = Math.round(42 * scale);

  // Optical centering for the full lockup (Flame + "Calorify"):
  // Visible flame inside splash-icon.png is ~54dp * scale; gap is ~12dp * scale; wordmark is ~136dp * scale.
  // Total brand lockup width = ~202dp * scale.
  // When centered around screen origin (0, 0):
  // - Flame visual center rests at -72dp * scale
  // - Wordmark left edge starts at -34dp * scale
  // Resulting lockup span: [-99dp, +102dp] -> perfectly optically centered on any display width.
  const targetFlameTranslateX = Math.round(-72 * scale);
  const wordmarkMarginLeft = Math.round(-34 * scale);
  const wordmarkMarginTop = Math.round(-lineHeight / 2);

  // Flame horizontal glide: starts at 0 (exact native splash center), moves to targetFlameTranslateX
  const flameTranslateX = useSharedValue(0);

  // Single synchronized master progress for letter-by-letter reveal (0 to 1)
  const wordmarkProgress = useSharedValue(0);

  useEffect(() => {
    if (!isReady) return;

    // 1. After 160ms freeze-frame, flame smoothly glides leftward
    flameTranslateX.value = withDelay(
      160,
      withTiming(targetFlameTranslateX, {
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
  }, [isReady, targetFlameTranslateX]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim ? fadeAnim.value : 1,
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: flameTranslateX.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]} pointerEvents={pointerEvents}>
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
        <View
          style={[
            styles.wordmarkContainer,
            {
              marginLeft: wordmarkMarginLeft,
              marginTop: wordmarkMarginTop,
            },
          ]}
        >
          {LETTERS.map((char, index) => (
            <AnimatedLetter
              key={index}
              char={char}
              index={index}
              progress={wordmarkProgress}
              fontSize={fontSize}
              lineHeight={lineHeight}
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
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },
  letterWrapper: {
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6, // Prevents Android native RenderNode from clipping ascenders/descenders
    paddingHorizontal: 0.5,
  },
  letterText: {
    fontFamily: Fonts.kurale || 'System',
    color: '#000000', // Solid black typography
    letterSpacing: 0, // Clean spacing without negative kerning that cuts off character tails
    includeFontPadding: Platform.OS === 'android', // Preserve font padding so Android doesn't slice descenders
  },
});
