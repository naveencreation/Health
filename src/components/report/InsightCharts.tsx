/**
 * Embedded (card-less) chart blocks for the Insights screen.
 * One selected index drives the chart and the readout above it, so there are no tooltip pins.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { BMI_SPECTRUM_CATEGORIES } from '@/features/weight/utils/bmiCalculator';

const CHART_H = 180;
const AXIS_W = 44; // right gutter for the goal / grid labels

interface AxisProps {
  labels: string[];
  selectedIndex: number;
}

const AxisLabels: React.FC<AxisProps> = ({ labels, selectedIndex }) => (
  <View style={styles.axisRow} importantForAccessibility="no-hide-descendants">
    {labels.map((l, i) => (
      <Text key={i} style={[styles.axisLabel, i === selectedIndex && styles.axisLabelActive]}>
        {l}
      </Text>
    ))}
  </View>
);

export interface InsightBarChartProps extends AxisProps {
  values: number[];
  a11yLabels: string[];
  onSelect: (index: number) => void;
  color: string;
  goal?: number;
  goalLabel?: string;
}

export const InsightBarChart: React.FC<InsightBarChartProps> = ({
  values,
  labels,
  a11yLabels,
  selectedIndex,
  onSelect,
  color,
  goal,
  goalLabel,
}) => {
  const max = Math.max(goal ?? 0, ...values) * 1.15 || 1;
  const y = (v: number) => Math.round((v / max) * CHART_H);

  return (
    <View>
      <View style={styles.plot}>
        <View style={styles.baseline} />
        {goal ? (
          <>
            <View style={[styles.goalLine, { bottom: y(goal) }]} />
            <Text style={[styles.goalLabel, { bottom: y(goal) - 14 }]}>{goalLabel}</Text>
          </>
        ) : null}
        <View style={styles.slots}>
          {values.map((v, i) => (
            <Pressable
              key={i}
              style={styles.slot}
              onPress={() => onSelect(i)}
              accessibilityRole="button"
              accessibilityLabel={a11yLabels[i]}
              accessibilityState={{ selected: i === selectedIndex }}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: v > 0 ? Math.max(3, y(v)) : 0,
                    backgroundColor: i === selectedIndex ? color : `${color}66`,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>
      <AxisLabels labels={labels} selectedIndex={selectedIndex} />
    </View>
  );
};

export interface InsightLineChartProps extends AxisProps {
  values: (number | null)[];
  a11yLabels: string[];
  onSelect: (index: number) => void;
  color: string;
  fill: string;
}

export const InsightLineChart: React.FC<InsightLineChartProps> = ({
  values,
  labels,
  a11yLabels,
  selectedIndex,
  onSelect,
  color,
  fill,
}) => {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - AXIS_W);

  const logged = values.filter((v): v is number => v !== null);
  const lo = Math.min(...logged);
  const hi = Math.max(...logged);
  const pad = Math.max(0.5, (hi - lo) * 0.25);
  const min = lo - pad;
  const span = hi + pad - min;
  const slotW = width / Math.max(1, values.length);
  const pts = values
    .map((v, i) =>
      v === null ? null : { i, x: slotW * (i + 0.5), y: CHART_H - ((v - min) / span) * CHART_H }
    )
    .filter((p): p is { i: number; x: number; y: number } => p !== null);
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area =
    pts.length > 1 ? `${line} L${pts[pts.length - 1].x} ${CHART_H} L${pts[0].x} ${CHART_H} Z` : '';
  const grid = [min + span / 3, min + (span * 2) / 3];

  return (
    <View>
      <View style={styles.plot} onLayout={onLayout}>
        {width > 0 && pts.length > 0 ? (
          <Svg width={width} height={CHART_H} style={StyleSheet.absoluteFill}>
            {grid.map(g => {
              const gy = CHART_H - ((g - min) / span) * CHART_H;
              return (
                <Line
                  key={g}
                  x1={0}
                  x2={width}
                  y1={gy}
                  y2={gy}
                  stroke={Colors.borderSubtle}
                  strokeWidth={1}
                />
              );
            })}
            <Line
              x1={0}
              x2={width}
              y1={CHART_H - 0.5}
              y2={CHART_H - 0.5}
              stroke={Colors.borderInset}
              strokeWidth={1}
            />
            {area ? <Path d={area} fill={fill} /> : null}
            <Path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {pts.map(p =>
              p.i === selectedIndex ? (
                <Circle
                  key={p.i}
                  cx={p.x}
                  cy={p.y}
                  r={5.5}
                  fill={color}
                  stroke={Colors.card}
                  strokeWidth={2}
                />
              ) : (
                <Circle
                  key={p.i}
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill={Colors.card}
                  stroke={color}
                  strokeWidth={2}
                />
              )
            )}
          </Svg>
        ) : null}
        {width > 0
          ? grid.map(g => (
              <Text
                key={g}
                style={[styles.gridLabel, { top: CHART_H - ((g - min) / span) * CHART_H - 7 }]}
              >
                {g.toFixed(1)}
              </Text>
            ))
          : null}
        <View style={styles.slots}>
          {values.map((_, i) => (
            <Pressable
              key={i}
              style={styles.slot}
              onPress={() => onSelect(i)}
              accessibilityRole="button"
              accessibilityLabel={a11yLabels[i]}
              accessibilityState={{ selected: i === selectedIndex }}
            />
          ))}
        </View>
      </View>
      <AxisLabels labels={labels} selectedIndex={selectedIndex} />
    </View>
  );
};

export interface InsightStat {
  label: string;
  value: string;
  unit?: string;
}

/** Hairline-divided stat cells; `columns` 3 for a row, 2 for a 2×2 grid. */
export const InsightStatRow: React.FC<{ stats: InsightStat[]; columns?: number }> = ({
  stats,
  columns = 3,
}) => (
  <View style={styles.statGrid}>
    {stats.map((s, i) => (
      <View
        key={s.label}
        style={[
          styles.statCell,
          { width: `${100 / columns}%` },
          i % columns !== 0 && styles.statCellDivided,
        ]}
        accessible
        accessibilityLabel={`${s.label}: ${s.value}${s.unit ? ` ${s.unit}` : ''}`}
      >
        <Text style={styles.statLabel}>{s.label}</Text>
        <Text style={styles.statValue}>
          {s.value}
          {s.unit ? <Text style={styles.statUnit}>{` ${s.unit}`}</Text> : null}
        </Text>
      </View>
    ))}
  </View>
);

export const InsightSectionHeader: React.FC<{ title: string; caption?: string }> = ({
  title,
  caption,
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </Text>
    {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
  </View>
);

/** Thin 100% stacked bar; segments with weight 0 are dropped. */
export const InsightSplitBar: React.FC<{ segments: { weight: number; color: string }[] }> = ({
  segments,
}) => (
  <View style={styles.splitBar} importantForAccessibility="no-hide-descendants">
    {segments
      .filter(s => s.weight > 0)
      .map((s, i) => (
        <View key={i} style={{ flex: s.weight, backgroundColor: s.color }} />
      ))}
  </View>
);

const BMI_MIN = 15;
const BMI_MAX = 40;
const BMI_SEGMENTS = BMI_SPECTRUM_CATEGORIES.map(c => ({
  color: c.color,
  span: Math.max(0, Math.min(c.maxBMI, BMI_MAX) - Math.max(c.minBMI, BMI_MIN)),
})).filter(s => s.span > 0);
const BMI_TICKS = [18.5, 25, 30, 35];
const bmiPct = (v: number) =>
  `${((Math.min(BMI_MAX, Math.max(BMI_MIN, v)) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100}%` as const;

/** Linear WHO BMI scale (15–40) with a marker at the user's value. */
export const InsightBmiScale: React.FC<{ bmi: number }> = ({ bmi }) => (
  <View importantForAccessibility="no-hide-descendants">
    <View style={styles.bmiTrack}>
      {BMI_SEGMENTS.map((s, i) => (
        <View key={i} style={{ flex: s.span, backgroundColor: s.color }} />
      ))}
    </View>
    <View style={[styles.bmiMarker, { left: bmiPct(bmi) }]} />
    <View style={styles.bmiTicks}>
      {BMI_TICKS.map(t => (
        <Text key={t} style={[styles.bmiTick, { left: bmiPct(t) }]}>
          {t}
        </Text>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  plot: {
    height: CHART_H,
    position: 'relative',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: Colors.borderInset,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: AXIS_W,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.textSecondary,
  },
  goalLabel: {
    position: 'absolute',
    right: 0,
    width: AXIS_W - 6,
    textAlign: 'right',
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textPrimary,
  },
  gridLabel: {
    position: 'absolute',
    right: 0,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  slots: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: AXIS_W,
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '62%',
    maxWidth: 28,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  axisRow: {
    flexDirection: 'row',
    marginRight: AXIS_W,
    marginTop: 8,
  },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  axisLabelActive: {
    fontFamily: Fonts.urbanist.extraBold,
    color: Colors.textPrimary,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderMedium,
  },
  statCell: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderMedium,
    gap: 2,
  },
  statCellDivided: {
    paddingLeft: 14,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  statLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  statUnit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  sectionCaption: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  splitBar: {
    flexDirection: 'row',
    gap: 2,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  bmiTrack: {
    flexDirection: 'row',
    gap: 2,
    height: 8,
    marginTop: 10,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bmiMarker: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 28,
    marginLeft: -4,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.background,
    backgroundColor: Colors.textPrimary,
    elevation: 0,
  },
  bmiTicks: {
    height: 16,
    marginTop: 8,
  },
  bmiTick: {
    position: 'absolute',
    width: 32,
    marginLeft: -16,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
