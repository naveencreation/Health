import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MotionCurves } from '@/theme/motion';

const MASCOT = require('../../../assets/ria_avatar.webp');

export interface InsightHeroCardProps {
  eyebrow: string;
  headline: string;
  body: string;
}

const CARD_H = 188;
const MASCOT_ENTRANCE_MS = 420;

/** Coral gradient verdict card with the mascot leaning in from the corner. */
export const InsightHeroCard: React.FC<InsightHeroCardProps> = ({ eyebrow, headline, body }) => {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: MASCOT_ENTRANCE_MS, easing: MotionCurves.easeOut });
  }, [reduced, progress]);
  const mascotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 8 * (1 - progress.value) }],
  }));

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${headline.replace('\n', ', ')}. ${body}`}
    >
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 372 188"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id="insightHeroGradient" x1="0" y1="0" x2="0.55" y2="1">
            <Stop offset="0" stopColor={Colors.heroGradientStart} />
            <Stop offset="0.55" stopColor={Colors.primary} />
            <Stop offset="1" stopColor={Colors.heroGradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={372} height={188} fill="url(#insightHeroGradient)" />
        <Circle cx={300} cy={40} r={90} fill={Colors.card} opacity={0.08} />
        <Path d="M0 170 Q90 150 190 166 T372 156 V188 H0Z" fill={Colors.card} opacity={0.14} />
      </Svg>

      <View style={styles.textColumn}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>

      <Animated.View style={[styles.mascotWrap, mascotStyle]} pointerEvents="none">
        <Image source={MASCOT} style={styles.mascot} contentFit="contain" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: CARD_H,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    elevation: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
  },
  textColumn: {
    maxWidth: '55%',
  },
  eyebrow: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 12,
    letterSpacing: 0.72,
    color: Colors.textInverse,
    opacity: 0.85,
  },
  headline: {
    marginTop: 8,
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: Colors.textInverse,
  },
  body: {
    marginTop: 12,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textInverse,
  },
  mascotWrap: {
    position: 'absolute',
    right: -14,
    bottom: -10,
    width: 150,
    height: 150,
  },
  mascot: {
    width: 150,
    height: 150,
  },
});
