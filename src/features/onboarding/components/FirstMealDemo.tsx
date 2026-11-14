import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MotionCurves, MotionDurations } from '@/theme/motion';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');
const THALI = require('../../../../assets/welcome/thali_arch.jpg');

export const DEMO_SCENE_MS = 3000;
const SCENE_COUNT = 4;
const DEMO_HEIGHT = 228;
const SAMPLE_KCAL = 620;
const SAMPLE_BUDGET = 1307;
const SAMPLE_FRACTION = SAMPLE_KCAL / SAMPLE_BUDGET;
const NBSP = '\u00A0';

export const DEMO_A11Y_LABEL =
  'Demo: take a photo of your meal, Ria estimates the calories, you check them, and it’s added to your day.';

const CAPTIONS = ['Snap your plate', 'Ria reads it', 'Check the numbers', 'It’s on your day'];

const SceneLayer: React.FC<{ active: boolean; children: React.ReactNode }> = ({
  active,
  children,
}) => {
  const opacity = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    opacity.set(
      withTiming(active ? 1 : 0, {
        duration: MotionDurations.sheet,
        easing: MotionCurves.easeInOut,
      })
    );
  }, [active, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {children}
    </Animated.View>
  );
};

const ProgressBar: React.FC<{ state: 'done' | 'current' | 'future'; running: boolean }> = ({
  state,
  running,
}) => {
  const fill = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    if (state === 'done') fill.set(1);
    else if (state === 'future') fill.set(0);
    else if (!running) cancelAnimation(fill);
    else {
      fill.set(0);
      fill.set(withTiming(1, { duration: DEMO_SCENE_MS, easing: Easing.linear }));
    }
  }, [state, running, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={styles.barTrack}>
      <View style={styles.barTrackTint} />
      <Animated.View style={[styles.barFill, fillStyle]} />
    </View>
  );
};

const Caption: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.caption}>
    <Text style={styles.captionText} maxFontSizeMultiplier={1.1}>
      {text}
    </Text>
  </View>
);

const ScanScene: React.FC<{ active: boolean; reduceMotion: boolean }> = ({
  active,
  reduceMotion,
}) => {
  const sweep = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(sweep);
    if (!active || reduceMotion) {
      sweep.set(reduceMotion ? 0.5 : 0);
      return;
    }
    sweep.set(0);
    sweep.set(
      withRepeat(withTiming(1, { duration: 1400, easing: MotionCurves.easeInOut }), -1, true)
    );
  }, [active, reduceMotion, sweep]);
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -46 + sweep.get() * 246 }],
  }));
  return (
    <>
      <View style={styles.dimLight} />
      <Animated.View style={[styles.sweep, sweepStyle]} />
      <View style={styles.chip}>
        <View style={styles.chipPill}>
          <Image source={RIA_AVATAR} style={styles.chipAvatar} contentFit="cover" />
          <Text style={styles.chipText} maxFontSizeMultiplier={1.1}>
            Ria is reading your plate…
          </Text>
        </View>
      </View>
    </>
  );
};

const SnapScene: React.FC<{ active: boolean; reduceMotion: boolean }> = ({
  active,
  reduceMotion,
}) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(scale);
    scale.set(1);
    if (!active || reduceMotion) return;
    scale.set(
      withDelay(
        1800,
        withSequence(
          withTiming(0.8, { duration: MotionDurations.instant }),
          withTiming(1, { duration: MotionDurations.micro })
        )
      )
    );
  }, [active, reduceMotion, scale]);
  const shutterStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <>
      <View style={styles.viewfinder}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>
      <Animated.View style={[styles.shutter, shutterStyle]} />
    </>
  );
};

const TodayBar: React.FC<{ active: boolean; reduceMotion: boolean }> = ({
  active,
  reduceMotion,
}) => {
  const fill = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(fill);
    if (!active) {
      fill.set(0);
    } else if (reduceMotion) {
      fill.set(SAMPLE_FRACTION);
    } else {
      fill.set(0);
      fill.set(
        withDelay(
          400,
          withTiming(SAMPLE_FRACTION, {
            duration: MotionDurations.sheet * 3,
            easing: MotionCurves.easeOut,
          })
        )
      );
    }
  }, [active, reduceMotion, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={styles.dayTrack}>
      <Animated.View style={[styles.dayFill, style]} />
    </View>
  );
};

export const FirstMealDemo: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const running = !paused && !reduceMotion;

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setScene(s => (s + 1) % SCENE_COUNT), DEMO_SCENE_MS);
    return () => clearTimeout(id);
  }, [scene, running]);

  const handlePress = () => {
    if (reduceMotion) setScene(s => (s + 1) % SCENE_COUNT);
    else setPaused(p => !p);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.demo}
      accessibilityRole="button"
      accessibilityLabel={DEMO_A11Y_LABEL}
      accessibilityHint={
        reduceMotion
          ? 'Double tap to show the next step.'
          : paused
            ? 'Paused. Double tap to play.'
            : 'Double tap to pause.'
      }
      testID="first-meal-demo"
    >
      <Image source={THALI} style={StyleSheet.absoluteFill} contentFit="cover" />

      <SceneLayer active={scene === 0}>
        <SnapScene active={scene === 0} reduceMotion={reduceMotion} />
        <Caption text={CAPTIONS[0]} />
      </SceneLayer>
      <SceneLayer active={scene === 1}>
        <ScanScene active={scene === 1} reduceMotion={reduceMotion} />
        <Caption text={CAPTIONS[1]} />
      </SceneLayer>
      <SceneLayer active={scene === 2}>
        <View style={styles.dimDark} />
        <View style={styles.card}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.1}>
            Dal, rice, roti & sabzi
          </Text>
          <Text style={styles.cardKcal} maxFontSizeMultiplier={1.1}>
            {SAMPLE_KCAL}
            <Text style={styles.cardKcalUnit}> kcal</Text>
          </Text>
          <View style={styles.macroRow}>
            {[
              { g: 22, color: Colors.protein },
              { g: 98, color: Colors.carbs },
              { g: 15, color: Colors.fat },
            ].map(m => (
              <View key={m.color} style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                <Text style={styles.macroText} maxFontSizeMultiplier={1.1}>
                  {`${m.g}${NBSP}g`}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Caption text={CAPTIONS[2]} />
      </SceneLayer>
      <SceneLayer active={scene === 3}>
        <View style={styles.dimDark} />
        <View style={styles.card}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.1}>
            Today
          </Text>
          <TodayBar active={scene === 3} reduceMotion={reduceMotion} />
          <View style={styles.dayLine}>
            <Text style={styles.macroText} maxFontSizeMultiplier={1.1}>
              {`${SAMPLE_KCAL} of ${SAMPLE_BUDGET.toLocaleString('en-US')} kcal`}
            </Text>
            <Text style={styles.macroText} maxFontSizeMultiplier={1.1}>
              {`${SAMPLE_BUDGET - SAMPLE_KCAL} left`}
            </Text>
          </View>
        </View>
        <Caption text={CAPTIONS[3]} />
      </SceneLayer>

      <View style={styles.bars} pointerEvents="none">
        {Array.from({ length: SCENE_COUNT }, (_, i) => (
          <ProgressBar
            key={i}
            state={i < scene ? 'done' : i === scene ? 'current' : 'future'}
            running={running}
          />
        ))}
      </View>
      <View style={styles.demoPill} pointerEvents="none">
        <Text style={styles.demoPillText} maxFontSizeMultiplier={1.1}>
          DEMO
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  demo: {
    height: DEMO_HEIGHT,
    marginTop: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    backgroundColor: Colors.textPrimary,
    elevation: 0,
  },
  bars: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  barTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barTrackTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.textInverse,
    opacity: 0.35,
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.textInverse,
  },
  demoPill: {
    position: 'absolute',
    top: 18,
    right: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: Colors.overlayDark,
  },
  demoPillText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: Colors.textInverse,
  },
  viewfinder: {
    position: 'absolute',
    top: 34,
    left: 40,
    right: 40,
    bottom: 52,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: Colors.textInverse,
  },
  cornerTL: { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 6 },
  cornerBL: {
    left: 0,
    bottom: 0,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    right: 0,
    bottom: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: 6,
  },
  shutter: {
    position: 'absolute',
    left: '50%',
    bottom: 44,
    marginLeft: -19,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: Colors.textInverse,
    backgroundColor: Colors.overlayScrim,
    elevation: 0,
  },
  dimLight: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlayScrim },
  dimDark: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlayDark },
  sweep: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 46,
    backgroundColor: Colors.primary,
    opacity: 0.35,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  chip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 44,
    alignItems: 'center',
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 10,
    paddingLeft: 6,
    borderRadius: 999,
    backgroundColor: Colors.card,
  },
  chipAvatar: { width: 20, height: 20, borderRadius: 10 },
  chipText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.overlayDark,
  },
  captionText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textInverse,
  },
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 44,
    padding: 12,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    elevation: 0,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  cardKcal: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 22,
    marginTop: 2,
    color: Colors.textPrimary,
  },
  cardKcalUnit: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  macroRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  macroItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroDot: { width: 7, height: 7, borderRadius: 4 },
  macroText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dayTrack: {
    height: 9,
    borderRadius: 5,
    marginVertical: 8,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
  },
  dayFill: { height: '100%', borderRadius: 5, backgroundColor: Colors.primary },
  dayLine: { flexDirection: 'row', justifyContent: 'space-between' },
});
