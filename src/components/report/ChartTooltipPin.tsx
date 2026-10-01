import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Fonts } from '@/theme/typography';

interface ChartTooltipPinProps {
  valueText: string;
  unitText?: string;
  activeColor?: string;
}

export const ChartTooltipPin: React.FC<ChartTooltipPinProps> = ({
  valueText,
  unitText,
  activeColor = '#2563EB',
}) => {
  return (
    <View style={styles.pinWrapper} pointerEvents="none">
      {/* 1. Circular Badge */}
      <View style={[styles.bubbleCircle, { borderColor: activeColor }]}>
        <Text style={[styles.valueText, unitText ? styles.valueTextWithUnit : null]}>
          {valueText}
        </Text>
        {unitText && <Text style={styles.unitText}>{unitText}</Text>}
      </View>

      {/* 2. Downward Needle Pointer */}
      <Svg width={10} height={6} viewBox="0 0 10 6" style={styles.tailSvg}>
        <Path d="M0,0 L10,0 L5,6 Z" fill={activeColor} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 3.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  valueText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12,
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 14,
  },
  valueTextWithUnit: {
    fontSize: 11,
    lineHeight: 13,
  },
  unitText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 10,
    marginTop: -1,
    textTransform: 'lowercase',
  },
  tailSvg: {
    marginTop: -1,
  },
});
