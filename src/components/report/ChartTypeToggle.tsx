import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

export type ChartType = 'bar' | 'line';

interface ChartTypeToggleProps {
  chartType: ChartType;
  onChange: (type: ChartType) => void;
  activeColor?: string;
}

export const ChartTypeToggle: React.FC<ChartTypeToggleProps> = ({
  chartType,
  onChange,
  activeColor = '#2563EB',
}) => {
  const isBar = chartType === 'bar';
  const isLine = chartType === 'line';

  return (
    <View style={styles.toggleContainer}>
      {/* 1. Bar Chart Option */}
      <Pressable
        style={[styles.toggleBtn, isBar && [styles.toggleBtnActive, { backgroundColor: activeColor }]]}
        onPress={() => onChange('bar')}
        accessibilityRole="button"
        accessibilityLabel="Show Bar Chart view"
      >
        <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
          <Rect x="2" y="8" width="3" height="6" rx="1" fill={isBar ? '#FFFFFF' : '#94A3B8'} />
          <Rect x="6.5" y="3" width="3" height="11" rx="1" fill={isBar ? '#FFFFFF' : '#94A3B8'} />
          <Rect x="11" y="5.5" width="3" height="8.5" rx="1" fill={isBar ? '#FFFFFF' : '#94A3B8'} />
        </Svg>
      </Pressable>

      {/* 2. Line Chart Option */}
      <Pressable
        style={[styles.toggleBtn, isLine && [styles.toggleBtnActive, { backgroundColor: activeColor }]]}
        onPress={() => onChange('line')}
        accessibilityRole="button"
        accessibilityLabel="Show Line Chart view"
      >
        <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
          <Path
            d="M2.5 10.5L6.5 5.5L10 8.5L13.5 3.5"
            stroke={isLine ? '#FFFFFF' : '#94A3B8'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="2.5" cy="10.5" r="1.5" fill={isLine ? '#FFFFFF' : '#94A3B8'} />
          <Circle cx="6.5" cy="5.5" r="1.5" fill={isLine ? '#FFFFFF' : '#94A3B8'} />
          <Circle cx="10" cy="8.5" r="1.5" fill={isLine ? '#FFFFFF' : '#94A3B8'} />
          <Circle cx="13.5" cy="3.5" r="1.5" fill={isLine ? '#FFFFFF' : '#94A3B8'} />
        </Svg>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    width: 28,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 1,
  },
});
