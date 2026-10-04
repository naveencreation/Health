import React, { useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  AccessibilityInfo,
} from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { RunningShoeSvg } from './RunningShoeSvg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface StepGaugeVisualizerRef {
  triggerSquish: () => void;
}

export interface StepGaugeVisualizerProps {
  currentSteps: number;
  maxSteps: number;
  activeColor?: string;
  onPressGoal?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Geometric constants matching WaterGaugeVisualizer instrument architecture
const CANVAS_SIZE = 300;
const CX = CANVAS_SIZE / 2; // 150
const CY = 138; // Gauge center
const RADIUS = 120; // Outer arc radius
const STROKE_WIDTH = 26; // Bold instrument arc thickness
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~753.982

// 270-degree sweep (starts at 135° bottom-left, curves around top to 45° bottom-right)
const TOTAL_ARC_LENGTH = 0.75 * CIRCUMFERENCE; // ~565.487
const NUM_TICKS = 15;
const TICK_R_OUTER = 94;
const TICK_LENGTH = 7;

// Center Shoe Dimensions
const SHOE_WIDTH = 100;
const SHOE_HEIGHT = 60;

export const StepGaugeVisualizer = forwardRef<StepGaugeVisualizerRef, StepGaugeVisualizerProps>(
  (
    {
      currentSteps,
      maxSteps,
      activeColor = '#EA580C',
      onPressGoal,
      style,
    },
    ref
  ) => {
    // Interactive Tap spring squish physics
    const shoeScale = useSharedValue(1);

    const triggerSquish = () => {
      shoeScale.value = withSequence(
        withTiming(0.92, { duration: 80 }),
        withSpring(1, { damping: 12, stiffness: 220 })
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    useImperativeHandle(ref, () => ({
      triggerSquish,
    }));

    const animatedShoeStyle = useAnimatedStyle(() => ({
      transform: [{ scale: shoeScale.value }],
    }));

    // Target progress fraction clamped between 0 and 1
    const targetProgress = Math.min(1, Math.max(0, currentSteps / Math.max(1, maxSteps)));

    // Reanimated shared value initialized to current progress
    const animatedProgress = useSharedValue(targetProgress);
    const isReducedMotion = useRef(false);

    useEffect(() => {
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        isReducedMotion.current = enabled;
      });
    }, []);

    // Smoothly animate progress with spring physics
    useEffect(() => {
      if (isReducedMotion.current) {
        animatedProgress.value = targetProgress;
        return;
      }

      animatedProgress.value = withSpring(targetProgress, {
        damping: 18,
        stiffness: 85,
      });
    }, [targetProgress, animatedProgress]);

    // GPU Worklet Animated Props for the Active Flame Arc
    const animatedArcProps = useAnimatedProps(() => {
      'worklet';
      const progress = animatedProgress.value;
      const activeLen = progress * TOTAL_ARC_LENGTH;
      const offset = CIRCUMFERENCE - activeLen;
      return {
        strokeDashoffset: offset,
        opacity: progress > 0.005 ? 1 : 0,
      };
    });

    // 15 Precision Radial Instrument Tick Marks
    const ticks = useMemo(() => {
      const stepAngleDeg = 270 / (NUM_TICKS - 1); // ~19.2857°
      return Array.from({ length: NUM_TICKS }, (_, i) => {
        const angleDeg = 135 + i * stepAngleDeg;
        const angleRad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const x1 = CX + TICK_R_OUTER * cos;
        const y1 = CY + TICK_R_OUTER * sin;
        const x2 = CX + (TICK_R_OUTER - TICK_LENGTH) * cos;
        const y2 = CY + (TICK_R_OUTER - TICK_LENGTH) * sin;

        return { id: `tick_${i}`, x1, y1, x2, y2 };
      });
    }, []);

    return (
      <View style={[styles.rootContainer, style]}>
        {/* 1. Base Radial Gauge SVG */}
        <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={styles.svgCanvas}>
          <Defs>
            {/* Vibrant gradient for active flame progress arc */}
            <LinearGradient id="stepProgressGrad" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={activeColor} />
              <Stop offset="1" stopColor="#FB923C" />
            </LinearGradient>
          </Defs>

          {/* A. Outer Bezel Shadow Track */}
          <Circle
            cx={CX}
            cy={CY + 3}
            r={RADIUS}
            stroke="rgba(15, 23, 42, 0.05)"
            strokeWidth={STROKE_WIDTH + 3}
            strokeDasharray={`${TOTAL_ARC_LENGTH} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(135 ${CX} ${CY + 3})`}
          />

          {/* B. Inactive Background Track (Soft light gray #EEF2F6) */}
          <Circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            stroke="#EEF2F6"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${TOTAL_ARC_LENGTH} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(135 ${CX} ${CY})`}
          />

          {/* C. 15 Precision Radial Instrument Ticks */}
          {ticks.map((t) => (
            <Line
              key={t.id}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="#CBD5E1"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}

          {/* D. Active Progress Arc with Rounded End-Caps */}
          <AnimatedCircle
            cx={CX}
            cy={CY}
            r={RADIUS}
            stroke="url(#stepProgressGrad)"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(135 ${CX} ${CY})`}
            animatedProps={animatedArcProps}
          />
        </Svg>

        {/* 2. Floating Center Running Shoe with Ambient Halo */}
        <Pressable
          style={styles.shoePressable}
          onPress={triggerSquish}
          accessibilityRole="button"
          accessibilityLabel="Athletic shoe. Tap for motion feedback"
        >
          <Animated.View style={[styles.shoeContainer, animatedShoeStyle]}>
            {/* Soft Ambient Radial Halo */}
            <View style={styles.haloRing} />
            <RunningShoeSvg
              width={SHOE_WIDTH}
              height={SHOE_HEIGHT}
              primaryColor={activeColor}
            />
          </Animated.View>
        </Pressable>

        {/* 3. Integrated Bottom Metric Readout */}
        <View style={styles.readoutContainer} pointerEvents="box-none">
          <Text style={styles.largeMetricNumber} numberOfLines={1}>
            {currentSteps.toLocaleString()}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.goalSubtitleRow,
              pressed && styles.goalSubtitlePressed,
            ]}
            onPress={onPressGoal}
            hitSlop={{ top: 8, bottom: 8, left: 14, right: 14 }}
            accessibilityRole="button"
            accessibilityLabel={`Daily step goal ${maxSteps.toLocaleString()} steps, tap to edit`}
          >
            <Text style={styles.goalSubtitle}>
              /{maxSteps.toLocaleString()} steps
            </Text>
            {onPressGoal && (
              <Ionicons
                name="pencil-outline"
                size={13}
                color="#94A3B8"
                style={styles.pencilIcon}
              />
            )}
          </Pressable>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  rootContainer: {
    width: CANVAS_SIZE,
    height: 268,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  svgCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Floating Center Shoe
  shoePressable: {
    position: 'absolute',
    top: 88,
    left: (CANVAS_SIZE - SHOE_WIDTH) / 2, // 100
    width: SHOE_WIDTH,
    height: SHOE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shoeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  haloRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
    top: -12,
  },
  // Integrated Bottom Readout nestled right between the arc tips
  readoutContainer: {
    position: 'absolute',
    top: 184,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },
  largeMetricNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 38,
    color: '#0F172A',
    lineHeight: 44,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  goalSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 0,
  },
  goalSubtitlePressed: {
    opacity: 0.7,
  },
  goalSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  pencilIcon: {
    marginTop: 1,
  },
});
