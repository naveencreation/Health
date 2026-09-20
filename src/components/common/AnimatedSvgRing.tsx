import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, AccessibilityInfo } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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

  const [currentOffset, setCurrentOffset] = useState(targetOffset);
  const animValue = useRef(new Animated.Value(targetOffset)).current;
  const isReducedMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReducedMotion.current = enabled;
    });
  }, []);

  useEffect(() => {
    if (isReducedMotion.current) {
      setCurrentOffset(targetOffset);
      return;
    }

    const listenerId = animValue.addListener(({ value }) => {
      setCurrentOffset(value);
    });

    Animated.timing(animValue, {
      toValue: targetOffset,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animValue.removeListener(listenerId);
    };
  }, [targetOffset, duration, animValue]);

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
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={currentOffset}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};
