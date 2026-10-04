import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Defs, ClipPath, G, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// Bind Reanimated to SVG Group
const AnimatedG = Animated.createAnimatedComponent(G);

// Exact Droplet SVG Path with Softly Rounded Apex
export const DROPLET_PATH =
  'M 50,11 C 48,13 15,50 15,75 C 15,94.3 30.7,110 50,110 C 69.3,110 85,94.3 85,75 C 85,50 52,13 50,11 Z';

// Generate a smooth cubic-bezier wave path with refined minute sinusoidal curvature
// Each half-cycle uses two smooth cubic bezier segments with horizontal tangents at crests and troughs
export const buildWavePath = (amplitude: number): string => {
  const wavelength = 80;
  const startX = -148;
  const totalCycles = 5; // Spans from -148 to 252 (covers 0..100 viewBox cleanly)
  let d = `M ${startX},0`;

  for (let i = 0; i < totalCycles; i++) {
    const x0 = startX + i * wavelength;
    // 1. Rise from x0 to crest
    d += ` C ${x0 + 9},${(-amplitude * 0.55).toFixed(2)} ${x0 + 13},${-amplitude} ${x0 + 20},${-amplitude}`;
    // 2. Fall from crest to mid-line
    d += ` C ${x0 + 27},${-amplitude} ${x0 + 31},${(-amplitude * 0.55).toFixed(2)} ${x0 + 40},0`;
    // 3. Fall from mid-line to trough
    d += ` C ${x0 + 49},${(amplitude * 0.55).toFixed(2)} ${x0 + 53},${amplitude} ${x0 + 60},${amplitude}`;
    // 4. Rise from trough to end-line
    d += ` C ${x0 + 67},${amplitude} ${x0 + 71},${(amplitude * 0.55).toFixed(2)} ${x0 + 80},0`;
  }

  // Extend solidly to bottom and close path
  d += ` L ${startX + totalCycles * wavelength},140 L ${startX},140 Z`;
  return d;
};

// Calibrated minute wave amplitudes matching reference screenshots:
// Foreground: 3.6px, Background: 2.8px
export const FG_WAVE_PATH = buildWavePath(3.6);
export const BG_WAVE_PATH = buildWavePath(2.8);

export interface DropletVisualizerRef {
  triggerSlosh: (direction?: 'up' | 'down' | 'mount') => void;
}

export interface DropletVisualizerProps {
  currentWater: number;
  maxWater: number;
  width?: number;
  height?: number;
  showHalo?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const DropletVisualizer = forwardRef(function DropletVisualizer(
  {
    currentWater,
    maxWater,
    width = 76,
    height = 96,
    showHalo = false,
    style,
  }: DropletVisualizerProps,
  ref: React.ForwardedRef<DropletVisualizerRef>
) {
  // Map water amount (mL) to droplet Y baseline (112 at 0% down to 14 at 100%)
  const calculateBaseY = (amount: number) => {
    const fraction = Math.min(1, Math.max(0, amount / Math.max(1, maxWater)));
    return 112 - fraction * 98;
  };

  // Reanimated Shared Values for Interactive "Slosh & Settle" Physics
  const animatedWaterLevel = useSharedValue(calculateBaseY(currentWater));
  const fgTranslateX = useSharedValue(0);
  const bgTranslateX = useSharedValue(-40); // Resting pose: background crest peaks on the right
  const sloshBob = useSharedValue(0);

  // Interactive Slosh & Settle:
  // Liquid sloshes back and forth with minute curvature and returns to serene rest
  const triggerSlosh = (direction: 'up' | 'down' | 'mount' = 'up') => {
    const isUp = direction === 'up';
    const sign = isUp ? 1 : -1;

    // 1. Foreground wave: delicate slosh (+10px -> -7px -> +3px -> -1.5px -> 0px)
    fgTranslateX.value = withSequence(
      withTiming(sign * 10, { duration: 250, easing: Easing.out(Easing.quad) }),
      withTiming(-sign * 7, { duration: 380, easing: Easing.inOut(Easing.quad) }),
      withTiming(sign * 3, { duration: 420, easing: Easing.inOut(Easing.quad) }),
      withTiming(-sign * 1.5, { duration: 420, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 450, easing: Easing.out(Easing.quad) })
    );

    // 2. Background wave: sloshes slightly delayed & out-of-phase, then settles to resting pose (-40px)
    bgTranslateX.value = withSequence(
      withTiming(-40 - sign * 8, { duration: 280, easing: Easing.out(Easing.quad) }),
      withTiming(-40 + sign * 5, { duration: 400, easing: Easing.inOut(Easing.quad) }),
      withTiming(-40 - sign * 2, { duration: 440, easing: Easing.inOut(Easing.quad) }),
      withTiming(-40, { duration: 480, easing: Easing.out(Easing.quad) })
    );

    // 3. Fluid bounce & vertical damping
    if (direction === 'mount') {
      sloshBob.value = withSequence(
        withTiming(-1.2, { duration: 250, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 15, stiffness: 85 })
      );
    } else {
      sloshBob.value = withSequence(
        withTiming(isUp ? -2.2 : 1.8, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(isUp ? 1.4 : -1.1, { duration: 340, easing: Easing.inOut(Easing.quad) }),
        withTiming(isUp ? -0.5 : 0.4, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        withSpring(0, { damping: 15, stiffness: 85 })
      );
    }
  };

  // Expose triggerSlosh via ref for parent components
  useImperativeHandle(ref, () => ({
    triggerSlosh,
  }));

  // Initial mount gentle settle
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      triggerSlosh('mount');
    }
  }, []);

  // Watch for water level changes from props
  const prevWaterRef = useRef(currentWater);
  useEffect(() => {
    if (prevWaterRef.current !== currentWater) {
      const direction = currentWater > prevWaterRef.current ? 'up' : 'down';
      prevWaterRef.current = currentWater;
      animatedWaterLevel.value = withSpring(calculateBaseY(currentWater), {
        damping: 18,
        stiffness: 85,
      });
      triggerSlosh(direction);
    }
  }, [currentWater, maxWater]);

  // GPU Transform props for Background Wave
  const bgAnimatedProps = useAnimatedProps(() => {
    'worklet';
    return {
      transform: [
        { translateX: bgTranslateX.value },
        { translateY: animatedWaterLevel.value - 1.2 + sloshBob.value * 0.7 },
      ],
    };
  });

  // GPU Transform props for Foreground Wave
  const fgAnimatedProps = useAnimatedProps(() => {
    'worklet';
    return {
      transform: [
        { translateX: fgTranslateX.value },
        { translateY: animatedWaterLevel.value + sloshBob.value },
      ],
    };
  });

  return (
    <View style={[styles.container, style]}>
      {/* Animated SVG Droplet */}
      <Svg width={width} height={height} viewBox="0 0 100 120">
        <Defs>
          <ClipPath id={`dropletClip_${width}`}>
            <Path d={DROPLET_PATH} />
          </ClipPath>
          <LinearGradient id={`dropletCavityGrad_${width}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E2E8F0" stopOpacity="0.45" />
            <Stop offset="0.3" stopColor="#F1F5F9" stopOpacity="0.2" />
            <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* 1. Soft Teardrop Halo Silhouette (Exact outer contour matching reference) */}
        {showHalo && (
          <Path
            d={DROPLET_PATH}
            fill="#F0F2F6"
            stroke="#F0F2F6"
            strokeWidth={14}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* 2. Static Droplet Shell with Soft Border */}
        <Path d={DROPLET_PATH} fill="#FAFAFC" stroke="#ECEEF2" strokeWidth={2.5} />

        {/* 3. Clipped Liquid Layers (Calm, buttery-smooth GPU animated) */}
        <G clipPath={`url(#dropletClip_${width})`}>
          {/* Soft 3D Cavity Top Vignette */}
          <Path d={DROPLET_PATH} fill={`url(#dropletCavityGrad_${width})`} />

          {/* Background Wave Layer (Darker royal blue, offset phase & speed) */}
          <AnimatedG animatedProps={bgAnimatedProps}>
            <Path d={BG_WAVE_PATH} fill="#0058DD" />
          </AnimatedG>

          {/* Foreground Wave Layer (Bright azure blue, larger amplitude) */}
          <AnimatedG animatedProps={fgAnimatedProps}>
            <Path d={FG_WAVE_PATH} fill="#007DFE" />
          </AnimatedG>
        </G>

        {/* 4. Static Droplet Inner Rim Highlight */}
        <Path d={DROPLET_PATH} fill="none" stroke="rgba(255, 255, 255, 0.65)" strokeWidth={1.5} />
      </Svg>
    </View>
  );
});

DropletVisualizer.displayName = 'DropletVisualizer';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
