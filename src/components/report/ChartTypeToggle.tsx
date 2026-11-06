import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { ControlRadii } from '@/theme/controls';

export type ChartType = 'bar' | 'line';

// 34x32 buttons + slop reach the 48dp touch target
const HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 };

interface ChartTypeToggleProps {
  chartType: ChartType;
  onChange: (type: ChartType) => void;
  activeColor?: string;
  activeIconColor?: string;
}

export const ChartTypeToggle: React.FC<ChartTypeToggleProps> = ({
  chartType,
  onChange,
  activeColor = Colors.primary,
  activeIconColor,
}) => {
  const isBar = chartType === 'bar';
  const isLine = chartType === 'line';

  const resolvedActiveIcon = activeIconColor || Colors.onPrimary;

  return (
    <View style={styles.toggleContainer}>
      {/* 1. Bar Chart Option */}
      <Pressable
        style={({ pressed }) => [
          styles.toggleBtn,
          isBar && [styles.toggleBtnActive, { backgroundColor: activeColor }],
          pressed ? styles.btnPressed : null,
        ]}
        onPress={() => onChange('bar')}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Show Bar Chart view"
        accessibilityState={{ selected: isBar }}
      >
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Rect
            x="2"
            y="7.5"
            width="3.2"
            height="6.5"
            rx="1.2"
            fill={isBar ? resolvedActiveIcon : Colors.textMuted}
          />
          <Rect
            x="6.4"
            y="2.5"
            width="3.2"
            height="11.5"
            rx="1.2"
            fill={isBar ? resolvedActiveIcon : Colors.textMuted}
          />
          <Rect
            x="10.8"
            y="5"
            width="3.2"
            height="9"
            rx="1.2"
            fill={isBar ? resolvedActiveIcon : Colors.textMuted}
          />
        </Svg>
      </Pressable>

      {/* 2. Line Chart Option */}
      <Pressable
        style={({ pressed }) => [
          styles.toggleBtn,
          isLine && [styles.toggleBtnActive, { backgroundColor: activeColor }],
          pressed ? styles.btnPressed : null,
        ]}
        onPress={() => onChange('line')}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Show Line Chart view"
        accessibilityState={{ selected: isLine }}
      >
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path
            d="M2.5 10.5L6.5 5.5L10 8.5L13.5 3.5"
            stroke={isLine ? resolvedActiveIcon : Colors.textMuted}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="2.5" cy="10.5" r="1.6" fill={isLine ? resolvedActiveIcon : Colors.textMuted} />
          <Circle cx="6.5" cy="5.5" r="1.6" fill={isLine ? resolvedActiveIcon : Colors.textMuted} />
          <Circle cx="10" cy="8.5" r="1.6" fill={isLine ? resolvedActiveIcon : Colors.textMuted} />
          <Circle cx="13.5" cy="3.5" r="1.6" fill={isLine ? resolvedActiveIcon : Colors.textMuted} />
        </Svg>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: ControlRadii.segmentedTrack,
    borderCurve: 'continuous',
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    width: 34,
    height: 32,
    borderRadius: ControlRadii.segmentedThumb,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  toggleBtnActive: {
    shadowOpacity: 0,
    elevation: 0,
  },
});

