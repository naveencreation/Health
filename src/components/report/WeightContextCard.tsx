import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

export interface WeightContextBreakdown {
  id: string;
  name: string;
  color: string;
  count: number;
  pct: number;
}

interface WeightContextCardProps {
  breakdown: WeightContextBreakdown[];
  totalLogs: number;
  centerText?: string;
  centerLabel?: string;
}

const DONUT_SIZE = 126;
const STROKE_WIDTH = 13;
const RADIUS = (DONUT_SIZE - STROKE_WIDTH) / 2; // 56.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~355.0

export const DEFAULT_SAMPLE_CONTEXT_BREAKDOWN: WeightContextBreakdown[] = [
  { id: 'Morning fasted', name: 'Morning fasted', color: Colors.weight, count: 8, pct: 60 },
  { id: 'Post workout', name: 'Post workout', color: '#10B981', count: 3, pct: 20 },
  { id: 'Pre meal', name: 'Pre meal', color: '#F59E0B', count: 2, pct: 12 },
  { id: 'Evening', name: 'Evening', color: '#3B82F6', count: 1, pct: 8 },
];

export const WeightContextCard: React.FC<WeightContextCardProps> = ({
  breakdown,
  totalLogs,
  centerText,
  centerLabel = 'Fasted Logs',
}) => {
  const activeBreakdown = useMemo(() => {
    if (!breakdown || breakdown.length === 0 || totalLogs === 0) {
      return [];
    }
    return breakdown;
  }, [breakdown, totalLogs]);

  // Compute SVG arc segments
  const arcSegments = useMemo(() => {
    if (activeBreakdown.length === 0) return [];
    let accumulatedAngle = 0;
    return activeBreakdown.map((item) => {
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

  // Center percentage calculation (defaults to Morning fasted %)
  const displayCenterPct = useMemo(() => {
    if (centerText) return centerText;
    if (totalLogs === 0) return '0';
    const fastedItem = activeBreakdown.find((item) => item.id.toLowerCase().includes('fasted'));
    return fastedItem ? `${fastedItem.pct}%` : `${activeBreakdown[0]?.pct ?? 100}%`;
  }, [centerText, activeBreakdown, totalLogs]);

  const displayCenterLabel = totalLogs === 0 ? 'No Logs' : centerLabel;

  // Split into 2 columns for legend
  const half = Math.ceil(activeBreakdown.length / 2);
  const leftColItems = activeBreakdown.slice(0, half);
  const rightColItems = activeBreakdown.slice(half);

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Weigh-In Conditions</Text>
        <Text style={styles.cardSubtitle}>Routine & habit consistency</Text>
      </View>
      <View style={styles.headerDivider} />

      {/* 2. Donut Chart + 2-Column Legend */}
      <View style={styles.contentRow}>
        {/* Left: Donut */}
        <View style={styles.donutContainer}>
          <Svg
            width={DONUT_SIZE}
            height={DONUT_SIZE}
            viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
          >
            {/* Background Circle */}
            <Circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={RADIUS}
              stroke="#F1F5F9"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />

            {/* Colored Segment Arcs */}
            {arcSegments.map((segment) => (
              <Circle
                key={`context_arc_${segment.id}`}
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
            <Text style={styles.donutCenterPct}>{displayCenterPct}</Text>
            <Text style={styles.donutCenterLabel}>{displayCenterLabel}</Text>
          </View>
        </View>

        {/* Right: Legend Grid or Zero-State */}
        {totalLogs === 0 ? (
          <View style={styles.emptyLegendContainer}>
            <Text style={styles.emptyTitleText}>No logs in period</Text>
            <Text style={styles.emptySubText}>
              Tag weigh-in conditions (Fasted, Post-workout) when logging to view routine habits.
            </Text>
          </View>
        ) : (
          <View style={styles.legendContainer}>
            {/* Column 1 */}
            <View style={styles.legendColumn}>
              {leftColItems.map((item) => (
                <View key={`context_left_${item.id}`} style={styles.legendItemRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: item.color }]} />
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
                <View key={`context_right_${item.id}`} style={styles.legendItemRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: item.color }]} />
                  <Text style={styles.legendItemText} numberOfLines={1}>
                    {item.name}{' '}
                    <Text style={styles.legendItemPct}>({item.pct}%)</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    paddingBottom: 8,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: DONUT_SIZE - STROKE_WIDTH * 2 - 8,
  },
  donutCenterPct: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  donutCenterLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 11,
    marginTop: 1,
  },
  legendContainer: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 14,
    gap: 8,
  },
  emptyLegendContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  emptyTitleText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#475569',
    marginBottom: 3,
  },
  emptySubText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#94A3B8',
    lineHeight: 15,
  },
  legendColumn: {
    flex: 1,
    gap: 8,
  },
  legendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendItemText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#334155',
    flex: 1,
  },
  legendItemPct: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
  },
});
