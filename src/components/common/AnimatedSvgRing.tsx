import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedSvgRingProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  strokeColor: string;
  backgroundColor?: string;
  duration?: number;
}

export const AnimatedSvgRing: React.FC<AnimatedSvgRingProps> = ({
  size,
  strokeWidth,
  progress,
  strokeColor,
  backgroundColor = 'rgba(15, 23, 42, 0.08)',
  duration = 450,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const targetOffset = circumference * (1 - clampedProgress);

  const animatedOffset = useSharedValue(targetOffset);
  const isReducedMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReducedMotion.current = enabled;
    });
  }, []);

  useEffect(() => {
    if (isReducedMotion.current) {
      animatedOffset.value = targetOffset;
      return;
    }

    animatedOffset.value = withTiming(targetOffset, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetOffset, duration, animatedOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
};
