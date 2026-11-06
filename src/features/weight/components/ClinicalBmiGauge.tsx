import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

interface ClinicalBmiGaugeProps {
  bmi: string;
  bmiStatus: { label: string; color: string };
  heightCm: number | string;
}

export const ClinicalBmiGauge: React.FC<ClinicalBmiGaugeProps> = ({ bmi, bmiStatus, heightCm }) => {
  const bmiNum = parseFloat(bmi);
  // No height on file: show the scale without a reading
  const hasBmi = !Number.isNaN(bmiNum);
  // Standard scale: 15 to 40
  const minBmi = 15;
  const maxBmi = 40;
  const clampedBmi = hasBmi ? Math.max(minBmi, Math.min(maxBmi, bmiNum)) : minBmi;
  const thumbPercent = ((clampedBmi - minBmi) / (maxBmi - minBmi)) * 100;

  const getStatusTextStyle = (label?: string) => {
    const l = (label || '').toLowerCase();
    if (l.includes('under')) return styles.statusUnder;
    if (l.includes('over')) return styles.statusOver;
    if (l.includes('obese')) return styles.statusObese;
    return styles.statusNormal;
  };

  const getThumbBorderStyle = (label?: string) => {
    const l = (label || '').toLowerCase();
    if (l.includes('under')) return styles.thumbBorderUnder;
    if (l.includes('over')) return styles.thumbBorderOver;
    if (l.includes('obese')) return styles.thumbBorderObese;
    return styles.thumbBorderNormal;
  };

  const getThumbBgStyle = (label?: string) => {
    const l = (label || '').toLowerCase();
    if (l.includes('under')) return styles.thumbBgUnder;
    if (l.includes('over')) return styles.thumbBgOver;
    if (l.includes('obese')) return styles.thumbBgObese;
    return styles.thumbBgNormal;
  };

  return (
    <View
      style={styles.gaugeContainer}
      accessibilityRole="progressbar"
      accessibilityValue={hasBmi ? { min: minBmi, max: maxBmi, now: clampedBmi } : undefined}
      accessibilityLabel={
        hasBmi
          ? `Current BMI is ${bmi}, categorized as ${bmiStatus.label.replace(' 🟢', '')}`
          : 'BMI unavailable. Add your height in Goals.'
      }
    >
      {/* Title */}
      <Text style={styles.title}>Current BMI</Text>

      {/* Value & Health Status Row */}
      <View style={styles.valueRow}>
        <Text style={styles.bigValue}>{bmi}</Text>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, getStatusTextStyle(bmiStatus.label)]}>
            {bmiStatus.label.replace(' 🟢', '')}
          </Text>
        </View>
      </View>

      {/* Visual Clinical Spectrum Bar with Dynamic Indicator Thumb */}
      <View style={styles.barContainer}>
        {/* Spectrum Bar Segments */}
        <View style={styles.spectrumBar}>
          {/* 15 - 16: Deep Blue */}
          <View style={[styles.barSegment, styles.segDeepBlue]} />
          {/* 16 - 18.5: Cyan/Light Blue */}
          <View style={[styles.barSegment, styles.segLightBlue]} />
          {/* 18.5 - 25: Vibrant Healthy Green */}
          <View style={[styles.barSegment, styles.segGreen]} />
          {/* 25 - 30: Amber / Yellow */}
          <View style={[styles.barSegment, styles.segYellow]} />
          {/* 30 - 35: Warm Tangerine */}
          <View style={[styles.barSegment, styles.segOrange]} />
          {/* 35 - 40: Crimson Red */}
          <View style={[styles.barSegment, styles.segRed]} />
        </View>

        {/* Dynamic Indicator Thumb */}
        {hasBmi ? (
          <View style={[styles.thumbAnchor, { left: `${thumbPercent}%` }]}>
            <View style={[styles.thumbOuter, getThumbBorderStyle(bmiStatus.label)]}>
              <View style={[styles.thumbInner, getThumbBgStyle(bmiStatus.label)]} />
            </View>
          </View>
        ) : null}
      </View>

      {/* Tick Labels Row */}
      <View style={styles.ticksRow}>
        <Text style={styles.tickText}>15</Text>
        <Text style={styles.tickText}>16</Text>
        <Text style={styles.tickText}>18.5</Text>
        <Text style={styles.tickText}>25</Text>
        <Text style={styles.tickText}>30</Text>
        <Text style={styles.tickText}>35</Text>
        <Text style={styles.tickText}>40</Text>
      </View>

      {/* Context info */}
      <View style={styles.contextRow}>
        <Text style={styles.contextText}>
          {hasBmi ? (
            <>
              Based on height <Text style={styles.boldText}>{heightCm} cm</Text> • Normal range:
              18.5 – 24.9
            </>
          ) : (
            'Add your height in Goals to see your BMI.'
          )}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gaugeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  bigValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  statusText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
  },
  statusUnder: {
    color: '#3B82F6',
  },
  statusNormal: {
    color: Colors.success,
  },
  statusOver: {
    color: Colors.warning,
  },
  statusObese: {
    color: Colors.danger,
  },
  barContainer: {
    position: 'relative',
    height: 18,
    justifyContent: 'center',
  },
  spectrumBar: {
    flexDirection: 'row',
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
    width: '100%',
  },
  barSegment: {
    height: '100%',
  },
  segDeepBlue: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  segLightBlue: {
    flex: 2.5,
    backgroundColor: Colors.waterSecondary,
  },
  segGreen: {
    flex: 6.5,
    backgroundColor: Colors.success,
  },
  segYellow: {
    flex: 5,
    backgroundColor: Colors.carbs,
  },
  segOrange: {
    flex: 5,
    backgroundColor: Colors.primary,
  },
  segRed: {
    flex: 5,
    backgroundColor: Colors.danger,
  },
  thumbAnchor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  thumbBorderUnder: {
    borderColor: '#3B82F6',
  },
  thumbBorderNormal: {
    borderColor: Colors.success,
  },
  thumbBorderOver: {
    borderColor: Colors.warning,
  },
  thumbBorderObese: {
    borderColor: Colors.danger,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thumbBgUnder: {
    backgroundColor: '#3B82F6',
  },
  thumbBgNormal: {
    backgroundColor: Colors.success,
  },
  thumbBgOver: {
    backgroundColor: Colors.warning,
  },
  thumbBgObese: {
    backgroundColor: Colors.danger,
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  tickText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  contextRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLow,
  },
  contextText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  boldText: {
    fontFamily: Fonts.urbanist.semiBold,
    color: '#334155',
  },
});
