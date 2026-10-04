import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Fonts } from '@/theme/typography';

export interface BMICategory {
  id: string;
  name: string;
  rangeLabel: string;
  color: string;
  minBMI: number;
  maxBMI: number;
  span: number;
}

export const BMI_CATEGORIES: BMICategory[] = [
  {
    id: 'very_severely_underweight',
    name: 'Very severely underweight',
    rangeLabel: 'BMI < 16.0',
    color: '#0284C7',
    minBMI: 0,
    maxBMI: 16.0,
    span: 1.0, // Anchor: 15.0 - 16.0
  },
  {
    id: 'severely_underweight',
    name: 'Severely underweight',
    rangeLabel: 'BMI 16.0 - 16.9',
    color: '#0EA5E9',
    minBMI: 16.0,
    maxBMI: 17.0,
    span: 1.0,
  },
  {
    id: 'underweight',
    name: 'Underweight',
    rangeLabel: 'BMI 17.0 - 18.4',
    color: '#06B6D4',
    minBMI: 17.0,
    maxBMI: 18.5,
    span: 1.5,
  },
  {
    id: 'normal',
    name: 'Normal',
    rangeLabel: 'BMI 18.5 - 24.9',
    color: '#22C55E',
    minBMI: 18.5,
    maxBMI: 25.0,
    span: 6.5,
  },
  {
    id: 'overweight',
    name: 'Overweight',
    rangeLabel: 'BMI 25.0 - 29.9',
    color: '#EAB308',
    minBMI: 25.0,
    maxBMI: 30.0,
    span: 5.0,
  },
  {
    id: 'obese_1',
    name: 'Obese Class I',
    rangeLabel: 'BMI 30.0 - 34.9',
    color: '#F97316',
    minBMI: 30.0,
    maxBMI: 35.0,
    span: 5.0,
  },
  {
    id: 'obese_2',
    name: 'Obese Class II',
    rangeLabel: 'BMI 35.0 - 39.9',
    color: '#EF4444',
    minBMI: 35.0,
    maxBMI: 40.0,
    span: 5.0,
  },
  {
    id: 'obese_3',
    name: 'Obese Class III',
    rangeLabel: 'BMI ≥ 40.0',
    color: '#DC2626',
    minBMI: 40.0,
    maxBMI: 100,
    span: 2.0, // Anchor: 40.0 - 42.0
  },
];

export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 16.0) return BMI_CATEGORIES[0];
  if (bmi < 17.0) return BMI_CATEGORIES[1];
  if (bmi < 18.5) return BMI_CATEGORIES[2];
  if (bmi < 25.0) return BMI_CATEGORIES[3];
  if (bmi < 30.0) return BMI_CATEGORIES[4];
  if (bmi < 35.0) return BMI_CATEGORIES[5];
  if (bmi < 40.0) return BMI_CATEGORIES[6];
  return BMI_CATEGORIES[7];
}

// Geometric constants for the radial speedometer gauge
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 224;
const CX = CANVAS_WIDTH / 2; // 140
const CY = 116; // Pivot center for arc and needle
const RADIUS = 90; // Main gauge arc radius
const STROKE_WIDTH = 14; // Colored track thickness
const TOTAL_SWEEP = 240; // Total angular arc in degrees
const START_ANGLE = 150; // 7:30 bottom-left
const END_ANGLE = 390; // 4:30 bottom-right
const NEEDLE_BOX_SIZE = 180; // Size of rotating needle container
const NEEDLE_LENGTH = 64; // Distance from pivot to tip
const HUB_RADIUS = 16; // Center hollow hub radius

// Math helper to generate SVG arc path command
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;

  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);

  const angleDiff = endAngleDeg - startAngleDeg;
  const largeArcFlag = angleDiff <= 180 ? '0' : '1';

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export interface BMIGaugeCardProps {
  weightKg?: number | null;
  heightCm?: number | null;
  unit?: 'kg' | 'lbs';
  style?: StyleProp<ViewStyle>;
}

export const BMIGaugeCard: React.FC<BMIGaugeCardProps> = ({ weightKg, heightCm, style }) => {
  // Safe fallbacks matching clinical defaults across the app
  const safeWeight = typeof weightKg === 'number' && weightKg > 0 ? weightKg : 72.5;
  const safeHeight = typeof heightCm === 'number' && heightCm > 0 ? heightCm : 178;

  // Standard WHO BMI formula: weight (kg) / [height (m)]^2
  const heightM = safeHeight / 100;
  const calculatedBMI = Number((safeWeight / (heightM * heightM)).toFixed(1));
  const activeCategory = getBMICategory(calculatedBMI);

  // Map BMI onto 240° sweep:
  // Range: 15.0 to 42.0 (span = 27.0)
  const clampedBMI = Math.max(15.0, Math.min(42.0, calculatedBMI));
  const progressRatio = (clampedBMI - 15.0) / 27.0;
  const targetAngle = START_ANGLE + progressRatio * TOTAL_SWEEP;

  // React Native Animated value for silky smooth 60fps GPU native needle physics
  const needleAnim = useRef(new Animated.Value(START_ANGLE)).current;
  const isReducedMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      isReducedMotion.current = enabled;
    });
  }, []);

  useEffect(() => {
    if (isReducedMotion.current) {
      needleAnim.setValue(targetAngle);
      return;
    }

    // Natural precision instrument spring physics with native driver
    Animated.spring(needleAnim, {
      toValue: targetAngle,
      friction: 7,
      tension: 45,
      useNativeDriver: true,
    }).start();
  }, [targetAngle, needleAnim]);

  // Interpolate angle to rotation degrees
  // At angle = 270° (pointing straight up), rotation is 0°
  const needleRotate = needleAnim.interpolate({
    inputRange: [START_ANGLE, END_ANGLE],
    outputRange: [`${START_ANGLE - 270}deg`, `${END_ANGLE - 270}deg`],
  });

  // Calculate arc segments based on category spans
  const arcSegments = useMemo(() => {
    let currentAngle = START_ANGLE;
    const totalSpan = 27.0;

    return BMI_CATEGORIES.map((cat, index) => {
      const segSweep = (cat.span / totalSpan) * TOTAL_SWEEP;
      const start = currentAngle;
      const end = currentAngle + segSweep;
      currentAngle = end;

      // Add a tiny 0.4° overlap between segments to eliminate anti-aliasing seams
      const renderEnd = index === BMI_CATEGORIES.length - 1 ? end : end + 0.4;
      const pathD = describeArc(CX, CY, RADIUS, start, renderEnd);

      return {
        id: cat.id,
        color: cat.color,
        pathD,
      };
    });
  }, []);

  // Calculate end cap centers for perfect semicircular rounded ends
  const startCapCoords = useMemo(() => {
    const rad = (START_ANGLE * Math.PI) / 180;
    return {
      cx: CX + RADIUS * Math.cos(rad),
      cy: CY + RADIUS * Math.sin(rad),
    };
  }, []);

  const endCapCoords = useMemo(() => {
    const rad = (END_ANGLE * Math.PI) / 180;
    return {
      cx: CX + RADIUS * Math.cos(rad),
      cy: CY + RADIUS * Math.sin(rad),
    };
  }, []);

  // 17 precision instrument tick marks along inner radius
  const ticks = useMemo(() => {
    const count = 17;
    const step = TOTAL_SWEEP / (count - 1);
    const rInner = 73;
    const rOuter = 80;

    return Array.from({ length: count }, (_, i) => {
      const angleDeg = START_ANGLE + i * step;
      const rad = (angleDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      return {
        id: `bmi_tick_${i}`,
        x1: CX + rInner * cos,
        y1: CY + rInner * sin,
        x2: CX + rOuter * cos,
        y2: CY + rOuter * sin,
      };
    });
  }, []);

  return (
    <View style={[styles.cardContainer, style]}>
      {/* 1. Header Row: Title & Active Status Pill */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>BMI (kg/m2)</Text>
        <View style={[styles.statusPill, { backgroundColor: activeCategory.color }]}>
          <Text style={styles.statusPillText}>{activeCategory.name}</Text>
        </View>
      </View>

      {/* 2. Speedometer Radial Gauge Visualizer */}
      <View style={styles.gaugeArea}>
        {/* Base SVG Canvas: Colored Segments, End Caps, and Inner Ticks */}
        <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={styles.svgCanvas}>
          {/* A. 8 WHO Category Colored Segments */}
          {arcSegments.map(seg => (
            <Path
              key={seg.id}
              d={seg.pathD}
              stroke={seg.color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="butt"
            />
          ))}

          {/* B. Semicircular Rounded End Caps */}
          <Circle
            cx={startCapCoords.cx}
            cy={startCapCoords.cy}
            r={STROKE_WIDTH / 2}
            fill={BMI_CATEGORIES[0].color}
          />
          <Circle
            cx={endCapCoords.cx}
            cy={endCapCoords.cy}
            r={STROKE_WIDTH / 2}
            fill={BMI_CATEGORIES[BMI_CATEGORIES.length - 1].color}
          />

          {/* C. 17 Concentric Inner Instrument Ticks */}
          {ticks.map(t => (
            <Line
              key={t.id}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="#CBD5E1"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}
        </Svg>

        {/* 3. Smooth Hardware-Accelerated Animated Needle */}
        <Animated.View
          style={[
            styles.needleWrapper,
            {
              left: CX - NEEDLE_BOX_SIZE / 2,
              top: CY - NEEDLE_BOX_SIZE / 2,
              width: NEEDLE_BOX_SIZE,
              height: NEEDLE_BOX_SIZE,
              transform: [{ rotate: needleRotate }],
            },
          ]}
          pointerEvents="none"
        >
          <Svg
            width={NEEDLE_BOX_SIZE}
            height={NEEDLE_BOX_SIZE}
            viewBox={`0 0 ${NEEDLE_BOX_SIZE} ${NEEDLE_BOX_SIZE}`}
          >
            <Defs>
              <LinearGradient id="bmiNeedleGrad" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={activeCategory.color} stopOpacity="0.25" />
                <Stop offset="0.6" stopColor={activeCategory.color} stopOpacity="0.85" />
                <Stop offset="1" stopColor={activeCategory.color} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            {/* Tapered pointer needle pointing North (straight UP) */}
            <Path
              d={`M ${NEEDLE_BOX_SIZE / 2 - 6.5} ${NEEDLE_BOX_SIZE / 2} L ${
                NEEDLE_BOX_SIZE / 2 - 2.5
              } ${NEEDLE_BOX_SIZE / 2 - NEEDLE_LENGTH + 3} A 2.5 2.5 0 0 1 ${
                NEEDLE_BOX_SIZE / 2 + 2.5
              } ${NEEDLE_BOX_SIZE / 2 - NEEDLE_LENGTH + 3} L ${
                NEEDLE_BOX_SIZE / 2 + 6.5
              } ${NEEDLE_BOX_SIZE / 2} Z`}
              fill="url(#bmiNeedleGrad)"
            />
          </Svg>
        </Animated.View>

        {/* 4. Center Hollow Donut Hub Ring */}
        <View
          style={[
            styles.hubRing,
            {
              left: CX - HUB_RADIUS,
              top: CY - HUB_RADIUS,
              width: HUB_RADIUS * 2,
              height: HUB_RADIUS * 2,
              borderColor: activeCategory.color,
            },
          ]}
          pointerEvents="none"
        />

        {/* 5. Center Readout Display nestled between gauge arc ends */}
        <View style={styles.centerReadoutContainer} pointerEvents="none">
          <Text style={styles.centerBMINumber}>{calculatedBMI.toFixed(1)}</Text>
          <Text style={styles.centerBMILabel}>BMI (kg/m2)</Text>
        </View>
      </View>

      {/* 6. WHO Classification Table with Active Row Highlight */}
      <View style={styles.categoriesTable}>
        {BMI_CATEGORIES.map(cat => {
          const isActive = cat.id === activeCategory.id;
          return (
            <View key={cat.id} style={[styles.categoryRow, isActive && styles.categoryRowActive]}>
              <View style={styles.categoryLeftCol}>
                <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                <Text
                  style={[styles.categoryName, isActive && styles.categoryTextActive]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </View>

              <Text style={[styles.categoryRange, isActive && styles.categoryTextActive]}>
                {cat.rangeLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  gaugeArea: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    alignSelf: 'center',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  svgCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  needleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 4,
    backgroundColor: '#FFFFFF',
  },
  centerReadoutContainer: {
    position: 'absolute',
    top: CY + 20, // 136
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBMINumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 38,
    color: '#0F172A',
    lineHeight: 44,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  centerBMILabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 16,
    letterSpacing: -0.1,
    textAlign: 'center',
    marginTop: -2,
  },
  categoriesTable: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5.5,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  categoryRowActive: {
    backgroundColor: 'rgba(15, 23, 42, 0.02)',
  },
  categoryLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  categoryName: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13.5,
    color: '#64748B',
    letterSpacing: -0.1,
  },
  categoryRange: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13.5,
    color: '#64748B',
    letterSpacing: -0.1,
  },
  categoryTextActive: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
});
