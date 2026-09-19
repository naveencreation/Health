import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Fonts } from '@/theme/typography';

interface ClinicalBmiGaugeProps {
  bmi: string;
  bmiStatus: { label: string; color: string };
  heightCm: number | string;
}

export const ClinicalBmiGauge: React.FC<ClinicalBmiGaugeProps> = ({
  bmi,
  bmiStatus,
  heightCm,
}) => {
  const bmiNum = parseFloat(bmi) || 24.5;
  // Standard scale: 15 to 40
  const minBmi = 15;
  const maxBmi = 40;
  const clampedBmi = Math.max(minBmi, Math.min(maxBmi, bmiNum));
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
      accessibilityValue={{ min: minBmi, max: maxBmi, now: clampedBmi }}
      accessibilityLabel={`Current BMI is ${bmi}, categorized as ${bmiStatus.label.replace(' 🟢', '')}`}
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
          {/* 25 - 31: Amber / Yellow */}
          <View style={[styles.barSegment, styles.segYellow]} />
          {/* 31 - 35: Warm Tangerine */}
          <View style={[styles.barSegment, styles.segOrange]} />
          {/* 35 - 40: Crimson Red */}
          <View style={[styles.barSegment, styles.segRed]} />
        </View>

        {/* Dynamic Indicator Thumb */}
        <View
          style={[
            styles.thumbAnchor,
            { left: `${thumbPercent}%` },
          ]}
        >
          <View style={[styles.thumbOuter, getThumbBorderStyle(bmiStatus.label)]}>
            <View style={[styles.thumbInner, getThumbBgStyle(bmiStatus.label)]} />
          </View>
        </View>
      </View>

      {/* Tick Labels Row */}
      <View style={styles.ticksRow}>
        <Text style={styles.tickText}>15</Text>
        <Text style={styles.tickText}>16</Text>
        <Text style={styles.tickText}>18.5</Text>
        <Text style={styles.tickText}>25</Text>
        <Text style={styles.tickText}>31</Text>
        <Text style={styles.tickText}>35</Text>
        <Text style={styles.tickText}>40</Text>
      </View>

      {/* Context info */}
      <View style={styles.contextRow}>
        <Text style={styles.contextText}>
          Based on height <Text style={styles.boldText}>{heightCm} cm</Text> • Normal range: 18.5 – 24.9
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gaugeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  bigValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  statusText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
  },
  statusUnder: {
    color: '#3B82F6',
  },
  statusNormal: {
    color: '#10B981',
  },
  statusOver: {
    color: '#F59E0B',
  },
  statusObese: {
    color: '#EF4444',
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
    backgroundColor: '#38BDF8',
  },
  segGreen: {
    flex: 6.5,
    backgroundColor: '#22C55E',
  },
  segYellow: {
    flex: 6,
    backgroundColor: '#FBBF24',
  },
  segOrange: {
    flex: 4,
    backgroundColor: '#F97316',
  },
  segRed: {
    flex: 5,
    backgroundColor: '#EF4444',
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbBorderUnder: {
    borderColor: '#3B82F6',
  },
  thumbBorderNormal: {
    borderColor: '#10B981',
  },
  thumbBorderOver: {
    borderColor: '#F59E0B',
  },
  thumbBorderObese: {
    borderColor: '#EF4444',
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
    backgroundColor: '#10B981',
  },
  thumbBgOver: {
    backgroundColor: '#F59E0B',
  },
  thumbBgObese: {
    backgroundColor: '#EF4444',
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  tickText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  contextRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  contextText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
  },
  boldText: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#334155',
  },
});
