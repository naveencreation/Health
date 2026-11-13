import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AccessibilityActionEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

interface WheelPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  accessibilityLabel: string;
  testID?: string;
  itemHeight?: number;
  visibleItems?: number;
}

// RN types have no onKeyDown on View; react-native-web does.
type WebKeyEvent = { key: string; preventDefault: () => void };

const WEB_SNAP_DELAY_MS = 120;

interface WheelItemProps {
  label: number;
  index: number;
  itemHeight: number;
  scrollY: SharedValue<number>;
  onPress: (index: number) => void;
}

const WheelItem = React.memo(function WheelItem({
  label,
  index,
  itemHeight,
  scrollY,
  onPress,
}: WheelItemProps) {
  const boxStyle = useAnimatedStyle(() => {
    const d = (index * itemHeight - scrollY.value) / itemHeight;
    const a = Math.abs(d);
    const c = Math.max(-3, Math.min(3, d));
    return {
      opacity: interpolate(a, [0, 1, 2, 3], [1, 0.7, 0.35, 0.12], Extrapolation.CLAMP),
      transform: [
        { perspective: 600 },
        { rotateX: `${c * -22}deg` },
        { scale: 1 - Math.min(a, 3) * 0.09 },
      ],
    };
  });
  const textStyle = useAnimatedStyle(() => {
    const a = Math.abs((index * itemHeight - scrollY.value) / itemHeight);
    return {
      color: interpolateColor(a, [0, 0.6], [Colors.primaryDeep, Colors.textMuted]),
    };
  });

  return (
    <Pressable
      onPress={() => onPress(index)}
      style={[styles.item, { height: itemHeight }]}
      accessible={false}
    >
      <Animated.View style={boxStyle}>
        <Animated.Text style={[styles.itemText, textStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
});

export const WheelPicker: React.FC<WheelPickerProps> = ({
  min,
  max,
  value,
  onChange,
  unit,
  accessibilityLabel,
  testID,
  itemHeight = 40,
  visibleItems = 5,
}) => {
  const reduceMotion = useReducedMotion();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const ready = useSharedValue(false);
  const isLaidOut = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  // Index a programmatic jump (tap, keys, a11y) is rolling to; detents are silent until it lands.
  const targetRef = useRef<number | null>(null);
  // Last value the wheel itself reported, so the sync effect never fights a live scroll.
  const emittedRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    valueRef.current = value;
  }, [value]);

  const count = max - min + 1;
  const values = useMemo(() => Array.from({ length: count }, (_, i) => min + i), [min, count]);
  const lastIndex = count - 1;
  const clampIndex = useCallback((i: number) => Math.max(0, Math.min(lastIndex, i)), [lastIndex]);

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      scrollRef.current?.scrollTo({ y: clampIndex(index) * itemHeight, animated });
    },
    [scrollRef, clampIndex, itemHeight]
  );

  const handleLayout = useCallback(() => {
    if (isLaidOut.current) return;
    isLaidOut.current = true;
    scrollToIndex(valueRef.current - min, false);
    ready.value = true;
  }, [scrollToIndex, min, ready]);

  // Live value + detent tick, called from the UI-thread reaction.
  const emitIndex = useCallback(
    (index: number) => {
      if (targetRef.current !== null) {
        if (index === targetRef.current) targetRef.current = null;
        return;
      }
      const next = min + index;
      if (next === valueRef.current) return;
      haptics.selection();
      emittedRef.current = next;
      onChange(next);
    },
    [min, onChange]
  );

  // Programmatic jump: report the final value once, then roll there silently.
  const jumpTo = useCallback(
    (index: number) => {
      const i = clampIndex(index);
      const next = min + i;
      if (next !== valueRef.current) {
        haptics.selection();
        onChange(next);
      }
      if (clampIndex(Math.round(scrollY.value / itemHeight)) === i) return;
      targetRef.current = i;
      scrollToIndex(i, !reduceMotion);
    },
    [clampIndex, min, onChange, scrollY, itemHeight, scrollToIndex, reduceMotion]
  );

  useAnimatedReaction(
    () => clampIndex(Math.round(scrollY.value / itemHeight)),
    (current, previous) => {
      if (previous === null || previous === undefined || !ready.value) return;
      if (current !== previous) scheduleOnRN(emitIndex, current);
    },
    [emitIndex, clampIndex, itemHeight]
  );

  // Values set from outside the wheel (e.g. a restored draft) move it; its own reports and jumps don't.
  useEffect(() => {
    if (!isLaidOut.current || value === emittedRef.current) return;
    const i = clampIndex(value - min);
    if (i === targetRef.current) return;
    if (clampIndex(Math.round(scrollY.value / itemHeight)) === i) return;
    targetRef.current = i;
    scrollToIndex(i, !reduceMotion);
  }, [value, min, itemHeight, reduceMotion, clampIndex, scrollToIndex, scrollY]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    []
  );

  // react-native-web ignores snapToInterval and has no momentum events.
  const snapAfterIdle = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      scrollToIndex(Math.round(scrollY.value / itemHeight), !reduceMotion);
    }, WEB_SNAP_DELAY_MS);
  }, [scrollToIndex, scrollY, itemHeight, reduceMotion]);

  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
    if (Platform.OS === 'web') scheduleOnRN(snapAfterIdle);
  });

  const step = useCallback(
    (delta: number) => jumpTo(valueRef.current - min + delta),
    [jumpTo, min]
  );

  const handleAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') step(1);
    else if (e.nativeEvent.actionName === 'decrement') step(-1);
  };

  const webProps =
    Platform.OS === 'web'
      ? {
          focusable: true,
          onKeyDown: (e: WebKeyEvent) => {
            const delta =
              e.key === 'ArrowUp'
                ? -1
                : e.key === 'ArrowDown'
                  ? 1
                  : e.key === 'PageUp'
                    ? -10
                    : e.key === 'PageDown'
                      ? 10
                      : 0;
            if (!delta) return;
            e.preventDefault();
            step(delta);
          },
        }
      : {};

  const pad = (itemHeight * (visibleItems - 1)) / 2;

  return (
    <View
      style={[styles.container, { height: itemHeight * visibleItems }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: `${value} ${unit ?? ''}`.trim() }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAction}
      testID={testID ? `${testID}-container` : undefined}
      {...webProps}
    >
      <View style={[styles.band, { top: pad, height: itemHeight }]} pointerEvents="none">
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={handleLayout}
        onScrollBeginDrag={() => {
          targetRef.current = null;
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: pad }}
        testID={testID}
      >
        {values.map((v, i) => (
          <WheelItem
            key={v}
            label={v}
            index={i}
            itemHeight={itemHeight}
            scrollY={scrollY}
            onPress={jumpTo}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
    elevation: 0,
  },
  band: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  unit: {
    marginRight: 18,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.primaryDeep,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 26,
  },
});
