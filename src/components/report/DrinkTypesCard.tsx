import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Fonts } from '@/theme/typography';

export interface DrinkTypeBreakdown {
  id: string;
  name: string;
  color: string;
  amountMl: number;
  pct: number;
}

interface DrinkTypesCardProps {
  breakdown: DrinkTypeBreakdown[];
  totalIntakeMl: number;
  centerPct?: number;
  centerLabel?: string;
}

const DONUT_SIZE = 126;
const STROKE_WIDTH = 13;
const RADIUS = (DONUT_SIZE - STROKE_WIDTH) / 2; // 56.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~355.0

// Template sample breakdown matching the reference design
export const DEFAULT_SAMPLE_BREAKDOWN: DrinkTypeBreakdown[] = [
  { id: 'water', name: 'Water', color: '#0284C7', amountMl: 1250, pct: 50 },
  { id: 'juice', name: 'Juice', color: '#F97316', amountMl: 375, pct: 15 },
  { id: 'coffee', name: 'Coffee', color: '#78350F', amountMl: 300, pct: 12 },
  { id: 'tea', name: 'Tea', color: '#EA580C', amountMl: 200, pct: 8 },
  { id: 'beer', name: 'Beer', color: '#F59E0B', amountMl: 125, pct: 5 },
  { id: 'soda', name: 'Soda', color: '#F43F5E', amountMl: 100, pct: 4 },
  { id: 'wine', name: 'Wine', color: '#9333EA', amountMl: 75, pct: 3 },
  { id: 'carbonated', name: 'Carbon', color: '#FF5722', amountMl: 75, pct: 3 },
];

export const DrinkTypesCard: React.FC<DrinkTypesCardProps> = ({
  breakdown,
  totalIntakeMl,
  centerPct = 100,
  centerLabel = 'Water Intake',
}) => {
  // If no drinks logged in period, fallback to template reference breakdown for beautiful preview
  const activeBreakdown = useMemo(() => {
    if (!breakdown || breakdown.length === 0 || totalIntakeMl === 0) {
      return DEFAULT_SAMPLE_BREAKDOWN;
    }
    return breakdown;
  }, [breakdown, totalIntakeMl]);

  // Compute SVG stroke-dasharray and rotation angle for each arc segment
  const arcSegments = useMemo(() => {
    let accumulatedAngle = 0;
    return activeBreakdown.map((item) => {
      // Add slight 0.2px overlap to prevent any sub-pixel rendering gaps
      const segmentLength = Math.max(0.5, (item.pct / 100) * CIRCUMFERENCE + 0.2);
      const rotationAngle = accumulatedAngle - 90;
      accumulatedAngle += (item.pct / 100) * 360;
      return {
        ...item,
        segmentLength,
        rotationAngle,
      };
    });
  }, [activeBreakdown]);

  // Split into 2 columns for the legend grid
  const half = Math.ceil(activeBreakdown.length / 2);
  const leftColItems = activeBreakdown.slice(0, half);
  const rightColItems = activeBreakdown.slice(half);

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header with subtle hairline divider */}
      <Text style={styles.cardTitle}>Drink Types</Text>
      <View style={styles.headerDivider} />

      {/* 2. Donut Chart + 2-Column Legend Grid */}
      <View style={styles.contentRow}>
        {/* Left: Donut Chart */}
        <View style={styles.donutContainer}>
          <Svg
            width={DONUT_SIZE}
            height={DONUT_SIZE}
            viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
          >
            {/* Background Track Circle */}
            <Circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={RADIUS}
              stroke="#F1F5F9"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />

            {/* Multi-Segment Colored Arcs (Direct Circle children with per-arc rotation) */}
            {arcSegments.map((segment) => (
              <Circle
                key={`arc_${segment.id}`}
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={RADIUS}
                stroke={segment.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${segment.segmentLength.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
                strokeDashoffset={0}
                strokeLinecap="butt"
                fill="none"
                transform={`rotate(${segment.rotationAngle} ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}
              />
            ))}
          </Svg>

          {/* Center Cutout Text */}
          <View style={styles.donutCenterContent} pointerEvents="none">
            <Text style={styles.donutCenterPct}>{centerPct}%</Text>
            <Text style={styles.donutCenterLabel}>{centerLabel}</Text>
          </View>
        </View>

        {/* Right: 2-Column Legend Grid */}
        <View style={styles.legendContainer}>
          {/* Column 1 */}
          <View style={styles.legendColumn}>
            {leftColItems.map((item) => (
              <View key={`legend_left_${item.id}`} style={styles.legendItemRow}>
                <View
                  style={[styles.colorSwatch, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendItemText} numberOfLines={1}>
                  {item.name}{' '}
                  <Text style={styles.legendItemPct}>({item.pct}%)</Text>
                </Text>
              </View>
            ))}
          </View>

          {/* Column 2 */}
          <View style={styles.legendColumn}>
            {rightColItems.map((item) => (
              <View key={`legend_right_${item.id}`} style={styles.legendItemRow}>
                <View
                  style={[styles.colorSwatch, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendItemText} numberOfLines={1}>
                  {item.name}{' '}
                  <Text style={styles.legendItemPct}>({item.pct}%)</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutContainer: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterPct: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  donutCenterLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 9.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 13,
    marginTop: 1,
  },
  legendContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  legendColumn: {
    flex: 1,
    gap: 10,
  },
  legendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2.5,
  },
  legendItemText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#334155',
    flexShrink: 1,
  },
  legendItemPct: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11.5,
    color: '#64748B',
  },
});
