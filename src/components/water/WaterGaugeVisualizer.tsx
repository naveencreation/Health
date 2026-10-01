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
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { DropletVisualizer, DropletVisualizerRef } from './DropletVisualizer';

// Bind Reanimated to SVG Circle for 60fps GPU-accelerated progress arc
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface WaterGaugeVisualizerRef {
  triggerSlosh: (direction?: 'up' | 'down' | 'mount') => void;
}

export interface WaterGaugeVisualizerProps {
  currentWater: number;
  maxWater: number;
  activeColor?: string;
  onPressGoal?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Geometric constants for the prominent radial gauge
const CANVAS_SIZE = 300;
const CX = CANVAS_SIZE / 2; // 150
const CY = 138; // Gauge center
const RADIUS = 120; // Prominent outer arc radius (~292px outer diameter)
const STROKE_WIDTH = 26; // Chunky bold arc thickness
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~753.982

// 270-degree sweep (starts at 135° bottom-left, curves around top to 45° bottom-right)
const TOTAL_ARC_LENGTH = 0.75 * CIRCUMFERENCE; // ~565.487
const NUM_TICKS = 15;
const TICK_R_OUTER = 94;
const TICK_LENGTH = 7;

// Center droplet dimensions
const DROPLET_WIDTH = 98;
const DROPLET_HEIGHT = 122;

export const WaterGaugeVisualizer = forwardRef<WaterGaugeVisualizerRef, WaterGaugeVisualizerProps>(
  (
    {
      currentWater,
      maxWater,
      activeColor = '#2196F3',
      onPressGoal,
      style,
    },
    ref
  ) => {
    const dropletRef = useRef<DropletVisualizerRef>(null);

    // Expose triggerSlosh to parent
    useImperativeHandle(ref, () => ({
      triggerSlosh: (dir) => dropletRef.current?.triggerSlosh(dir),
    }));

    // Interactive Tap Slosh physics with squish spring
    const dropletScale = useSharedValue(1);

    const handleDropletPress = () => {
      dropletScale.value = withSequence(
        withTiming(0.94, { duration: 90 }),
        withSpring(1, { damping: 12, stiffness: 220 })
      );
      dropletRef.current?.triggerSlosh('up');
    };

    const animatedDropletStyle = useAnimatedStyle(() => ({
      transform: [{ scale: dropletScale.value }],
    }));

    // Target progress fraction clamped between 0 and 1
    const targetProgress = Math.min(1, Math.max(0, currentWater / Math.max(1, maxWater)));

    // Reanimated shared value initialized to current progress to eliminate initial mount jump
    const initialProgress = Math.min(1, Math.max(0, currentWater / Math.max(1, maxWater)));
    const animatedProgress = useSharedValue(initialProgress);
    const isReducedMotion = useRef(false);

    useEffect(() => {
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        isReducedMotion.current = enabled;
      });
    }, []);

    // Smoothly animate progress with harmonized spring physics matching DropletVisualizer
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

    // GPU Worklet Animated Props for the Active Arc
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

    // Precalculate the 15 precision radial instrument tick marks
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
        {/* 1. Base Radial Gauge SVG (Outer Bezel Shadow + Inactive Track + Active Progress + Radial Ticks) */}
        <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={styles.svgCanvas}>
          <Defs>
            {/* Vibrant gradient for the active progress arc */}
            <LinearGradient id="gaugeProgressGrad" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={activeColor} />
              <Stop offset="1" stopColor="#38BDF8" />
            </LinearGradient>
          </Defs>

          {/* A. Outer Bezel Shadow Track (3D depth underneath the gray track) */}
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

          {/* D. Active Progress Arc with Rounded End-Caps (Smooth GPU Animated) */}
          <AnimatedCircle
            cx={CX}
            cy={CY}
            r={RADIUS}
            stroke="url(#gaugeProgressGrad)"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(135 ${CX} ${CY})`}
            animatedProps={animatedArcProps}
          />
        </Svg>

        {/* 2. Floating Liquid Droplet (Direct teardrop halo, NO artificial outer oval) */}
        <Pressable
          style={styles.dropletPressable}
          onPress={handleDropletPress}
          accessibilityRole="button"
          accessibilityLabel="Water droplet. Tap to make water slosh"
        >
          <Animated.View style={animatedDropletStyle}>
            <DropletVisualizer
              ref={dropletRef}
              currentWater={currentWater}
              maxWater={maxWater}
              width={DROPLET_WIDTH}
              height={DROPLET_HEIGHT}
              showHalo={true}
            />
          </Animated.View>
        </Pressable>

        {/* 3. Integrated Bottom Metric Readout */}
        <View style={[styles.readoutContainer, { pointerEvents: 'box-none' as any }]}>
          <Text style={styles.largeMetricNumber} numberOfLines={1}>
            {currentWater}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.goalSubtitleRow,
              pressed && styles.goalSubtitlePressed,
            ]}
            onPress={onPressGoal}
            hitSlop={{ top: 8, bottom: 8, left: 14, right: 14 }}
            accessibilityRole="button"
            accessibilityLabel={`Daily goal ${maxWater} mL, tap to edit`}
          >
            <Text style={styles.goalSubtitle}>/{maxWater} mL</Text>
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
  // Floating Center Droplet without unnatural oval wrapper
  dropletPressable: {
    position: 'absolute',
    top: 58,
    left: (CANVAS_SIZE - DROPLET_WIDTH) / 2, // 101
    width: DROPLET_WIDTH,
    height: DROPLET_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Integrated Bottom Readout nestled right between the arc tips
  readoutContainer: {
    position: 'absolute',
    top: 190,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },
  largeMetricNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 42,
    color: '#0F172A',
    lineHeight: 46,
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 15,
    color: '#64748B',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  pencilIcon: {
    marginTop: 1,
  },
});
