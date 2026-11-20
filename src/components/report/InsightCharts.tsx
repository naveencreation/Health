/**
 * Insights charts, in the shadcn/Recharts style: four soft grid lines, no axis lines or y labels,
 * weekday labels along the bottom and a white tooltip card pinned in the plot's headroom.
 * Every chart is measured with onLayout, places data at slot centres and overlays transparent
 * Pressable slots (one per day) so a tap selects a day.
 */
import React, { useEffect, useId, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { MotionCurves } from '@/theme/motion';
import { smoothPath, Point } from '@/services/insights/chartPaths';
import { trendProjection } from '@/services/insights/metricInsights';

// ---------------------------------------------------------------------------
// Geometry shared by every chart
// ---------------------------------------------------------------------------
const H = 220;
const TOP = 24;
const BOT = 192; // baseline; weekday labels sit below it
const ENTRANCE_MS = 400; // slightly slower than the UI tokens: charts settle, they don't snap
const TIP_W = 132;
const ROW_H = 17;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const cleanId = (s: string) => s.replace(/[^A-Za-z0-9]/g, '');

// ---------------------------------------------------------------------------
// Tooltip card
// ---------------------------------------------------------------------------
export interface TooltipRow {
  label: string;
  value: string;
  color: string;
}

export interface TooltipSpec {
  title: string;
  rows: TooltipRow[];
  /** Adds a divider and a bold Total row */
  total?: string;
}

export interface ChartTooltipCardProps extends TooltipSpec {
  plotWidth: number;
  /** When set, the card sits beside this x instead of the top-right corner */
  anchorX?: number;
}

/** White card, radius 8, hairline border and a soft floating shadow, with colour-keyed rows. */
export const ChartTooltipCard: React.FC<ChartTooltipCardProps> = ({
  title,
  rows,
  total,
  plotWidth,
  anchorX,
}) => {
  const w = TIP_W;
  const h = 24 + rows.length * ROW_H + (total ? 22 : 0);
  let x = plotWidth - w;
  if (anchorX !== undefined) {
    x = anchorX - w - 12;
    if (x < 0) x = Math.min(plotWidth - w, anchorX + 12);
  }
  x = clamp(x, 0, Math.max(0, plotWidth - w));
  return (
    <G x={x} y={0}>
      <Rect x={0} y={3} width={w} height={h} rx={8} fill={Colors.shadowColor} opacity={0.06} />
      <Rect
        width={w}
        height={h}
        rx={8}
        fill={Colors.card}
        stroke={Colors.borderSubtle}
        strokeWidth={1}
      />
      <SvgText
        x={10}
        y={17}
        fontSize={11.5}
        fontFamily={Fonts.urbanist.extraBold}
        fill={Colors.textPrimary}
      >
        {title}
      </SvgText>
      {rows.map((r, k) => {
        const yy = 34 + k * ROW_H;
        return (
          <G key={r.label}>
            <Rect x={10} y={yy - 8} width={8} height={8} rx={2} fill={r.color} />
            <SvgText
              x={23}
              y={yy}
              fontSize={11}
              fontFamily={Fonts.urbanist.semiBold}
              fill={Colors.textSecondary}
            >
              {r.label}
            </SvgText>
            <SvgText
              x={w - 10}
              y={yy}
              textAnchor="end"
              fontSize={11}
              fontFamily={Fonts.urbanist.extraBold}
              fill={Colors.textPrimary}
            >
              {r.value}
            </SvgText>
          </G>
        );
      })}
      {total ? (
        <G>
          <Line
            x1={10}
            x2={w - 10}
            y1={h - 23}
            y2={h - 23}
            stroke={Colors.chartGrid}
            strokeWidth={1}
          />
          <SvgText
            x={10}
            y={h - 9}
            fontSize={11}
            fontFamily={Fonts.urbanist.extraBold}
            fill={Colors.textPrimary}
          >
            Total
          </SvgText>
          <SvgText
            x={w - 10}
            y={h - 9}
            textAnchor="end"
            fontSize={11}
            fontFamily={Fonts.urbanist.extraBold}
            fill={Colors.textPrimary}
          >
            {total}
          </SvgText>
        </G>
      ) : null}
    </G>
  );
};

// ---------------------------------------------------------------------------
// Shared frame: layout, grid, entrance motion, slots, axis, tooltip
// ---------------------------------------------------------------------------
interface FrameBuild {
  /** Behind the data: bands, goal lines, empty-day markers */
  under?: React.ReactNode;
  /** The data itself (grows in) */
  data: React.ReactNode;
  /** Above the data: indicator lines, value labels */
  over?: React.ReactNode;
  /** Anchor the tooltip beside this x instead of the top-right corner */
  tipX?: number;
}

interface FrameProps {
  count: number;
  labels: string[];
  a11yLabels: string[];
  selectedIndex: number | null;
  onSelect?: (index: number) => void;
  /** Tooltip content for a day; null or undefined hides it */
  tooltip?: (index: number) => TooltipSpec | null;
  /** Change this to replay the entrance */
  entranceKey: string;
  growFromBaseline: boolean;
  build: (width: number) => FrameBuild;
}

const ChartFrame: React.FC<FrameProps> = ({
  count,
  labels,
  a11yLabels,
  selectedIndex,
  onSelect,
  tooltip,
  entranceKey,
  growFromBaseline,
  build,
}) => {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: ENTRANCE_MS, easing: MotionCurves.easeOut });
  }, [entranceKey, reduced, progress]);

  const dataStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: growFromBaseline
      ? [{ scaleY: 0.2 + 0.8 * progress.value }]
      : [{ translateY: 8 * (1 - progress.value) }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const built = width > 0 ? build(width) : null;
  const spec = selectedIndex !== null && tooltip ? tooltip(selectedIndex) : null;

  return (
    <View style={styles.frame} onLayout={onLayout} testID="insight-chart">
      {built ? (
        <>
          <Svg width={width} height={H} style={StyleSheet.absoluteFill}>
            {[0, 1, 2, 3].map(k => {
              const gy = TOP + (k * (BOT - TOP)) / 3;
              return (
                <Line
                  key={k}
                  x1={0}
                  x2={width}
                  y1={gy}
                  y2={gy}
                  stroke={Colors.chartGrid}
                  strokeWidth={1}
                />
              );
            })}
            {built.under}
          </Svg>
          <Animated.View
            style={[StyleSheet.absoluteFill, dataStyle, growFromBaseline && styles.originBaseline]}
            pointerEvents="none"
          >
            <Svg width={width} height={H}>
              {built.data}
            </Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]} pointerEvents="none">
            <Svg width={width} height={H}>
              {built.over}
            </Svg>
          </Animated.View>
          {spec ? (
            <Svg width={width} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
              <ChartTooltipCard {...spec} plotWidth={width} anchorX={built.tipX} />
            </Svg>
          ) : null}
        </>
      ) : null}

      <View
        style={styles.axisRow}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        {labels.map((l, i) => (
          <View key={i} style={styles.axisCell}>
            <Text
              style={[
                styles.axisLabel,
                styles.axisLabelBox,
                i === selectedIndex && styles.axisLabelActive,
              ]}
            >
              {l}
            </Text>
          </View>
        ))}
      </View>

      {onSelect ? (
        <View style={styles.slots}>
          {Array.from({ length: count }, (_, i) => (
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
      ) : null}
    </View>
  );
};

const DashedGoal: React.FC<{
  y: number;
  width: number;
  color: string;
  label: string;
  labelAt?: 'right' | 'left-below';
  opacity?: number;
}> = ({ y, width, color, label, labelAt = 'right', opacity = 1 }) => (
  <G>
    <Line
      x1={0}
      x2={width}
      y1={y}
      y2={y}
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray="4 4"
      opacity={opacity}
    />
    {label ? (
      <SvgText
        x={labelAt === 'right' ? width : 4}
        y={labelAt === 'right' ? y - 5 : y + 14}
        textAnchor={labelAt === 'right' ? 'end' : 'start'}
        fontSize={10.5}
        fontFamily={Fonts.urbanist.extraBold}
        fill={color}
      >
        {label}
      </SvgText>
    ) : null}
  </G>
);

interface SharedChartProps {
  /** Axis text per slot; '' hides one (month view shows Nov 1, 8, 15, 22, 29) */
  labels: string[];
  a11yLabels: string[];
  tooltip?: (index: number) => TooltipSpec | null;
  selectedIndex: number | null;
  onSelect?: (index: number) => void;
  /** Replays the entrance when it changes (period, metric) */
  entranceKey: string;
}

// ---------------------------------------------------------------------------
// StackedMacroChart (calories, week): protein / carbs / fat kcal per day
// ---------------------------------------------------------------------------
export interface StackedMacroChartProps extends SharedChartProps {
  /** Total kcal per slot; 0 = nothing logged / future */
  totals: number[];
  /** Macro kcal per slot; null draws a single primary bar */
  macroKcal: ({ protein: number; carbs: number; fat: number } | null)[];
  goal: number;
}

const MACRO_ORDER: { key: 'protein' | 'carbs' | 'fat'; color: string; label: string }[] = [
  { key: 'protein', color: Colors.protein, label: 'Protein' },
  { key: 'carbs', color: Colors.carbs, label: 'Carbs' },
  { key: 'fat', color: Colors.fat, label: 'Fat' },
];

export const StackedMacroChart: React.FC<StackedMacroChartProps> = ({
  totals,
  macroKcal,
  goal,
  ...shared
}) => {
  const uid = cleanId(useId());
  return (
    <View>
      <ChartFrame
        {...shared}
        count={totals.length}
        growFromBaseline
        build={width => {
          const slotW = width / totals.length;
          const xAt = (i: number) => slotW * (i + 0.5);
          const max = Math.max(goal * 1.1, ...totals) * 1.5;
          const y = (v: number) => BOT - (v / max) * (BOT - TOP);
          const bw = Math.min(30, slotW * 0.66);
          const sel = shared.selectedIndex;
          return {
            under: (
              <>
                <Rect
                  x={0}
                  y={y(goal * 1.1)}
                  width={width}
                  height={y(goal * 0.9) - y(goal * 1.1)}
                  fill={Colors.primary}
                  opacity={0.08}
                />
                <DashedGoal y={y(goal)} width={width} color={Colors.primary} label="" />
                <SvgText
                  x={4}
                  y={y(goal * 1.1) - 5}
                  fontSize={10.5}
                  fontFamily={Fonts.urbanist.extraBold}
                  fill={Colors.primaryDeep}
                >
                  YOUR ZONE
                </SvgText>
              </>
            ),
            data: (
              <>
                {totals.map((t, i) => {
                  const x = xAt(i) - bw / 2;
                  if (!(t > 0)) {
                    return (
                      <Rect
                        key={i}
                        x={x}
                        y={BOT - 4}
                        width={bw}
                        height={4}
                        rx={2}
                        fill={Colors.borderInset}
                      />
                    );
                  }
                  const m = macroKcal[i];
                  const sum = m ? m.protein + m.carbs + m.fat : 0;
                  const clipId = `clip${uid}${i}`;
                  let acc = 0;
                  return (
                    <G key={i}>
                      <Defs>
                        <ClipPath id={clipId}>
                          <Rect x={x} y={y(t)} width={bw} height={BOT - y(t)} rx={6} />
                        </ClipPath>
                      </Defs>
                      <G clipPath={`url(#${clipId})`} opacity={i === sel ? 1 : 0.55}>
                        {m && sum > 0 ? (
                          MACRO_ORDER.map(seg => {
                            const v = (m[seg.key] / sum) * t;
                            const top = y(acc + v);
                            acc += v;
                            return (
                              <Rect
                                key={seg.key}
                                x={x}
                                y={top}
                                width={bw}
                                height={y(acc - v) - top}
                                fill={seg.color}
                              />
                            );
                          })
                        ) : (
                          <Rect
                            x={x}
                            y={y(t)}
                            width={bw}
                            height={BOT - y(t)}
                            fill={Colors.primary}
                          />
                        )}
                      </G>
                      {i === sel ? (
                        <Rect
                          x={x - 3}
                          y={y(t) - 3}
                          width={bw + 6}
                          height={BOT - y(t) + 3}
                          rx={8}
                          fill="none"
                          stroke={Colors.textPrimary}
                          strokeOpacity={0.18}
                          strokeDasharray="3 3"
                        />
                      ) : null}
                    </G>
                  );
                })}
              </>
            ),
          };
        }}
      />
      <View style={styles.legend}>
        {MACRO_ORDER.map(m => (
          <View key={m.key} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: m.color }]} />
            <Text style={styles.legendText}>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// GoalBarChart (steps; any metric as daily bars in month and year views)
// ---------------------------------------------------------------------------
export interface GoalBarChartProps extends SharedChartProps {
  values: number[];
  goal: number;
  /** Uppercase label on the dashed goal line, e.g. 'GOAL 8K' */
  goalLabel: string;
  color: string;
  /** Fill colours for the selected, goal-met and missed bars; defaults to opacity steps of color */
  tones?: { selected: string; met: string; missed: string };
  variant?: 'week' | 'month';
  /** Goal is a target band (calories): within 10% counts as met, instead of at or above */
  band?: boolean;
  /** Value above each bar, e.g. '9.4k' (week only) */
  formatLabel?: (value: number) => string;
}

export const GoalBarChart: React.FC<GoalBarChartProps> = ({
  values,
  goal,
  goalLabel,
  color,
  tones,
  variant = 'week',
  band = false,
  formatLabel,
  ...shared
}) => {
  const isMonth = variant === 'month';
  return (
    <ChartFrame
      {...shared}
      count={values.length}
      growFromBaseline
      build={width => {
        const slotW = width / values.length;
        const xAt = (i: number) => slotW * (i + 0.5);
        const max = Math.max(goal, ...values) * 1.12 || 1;
        const y = (v: number) => BOT - (v / max) * (BOT - TOP);
        const bw = isMonth ? Math.max(3, slotW * 0.62) : Math.min(30, slotW * 0.66);
        const rx = isMonth ? 3 : 6;
        const stub = isMonth ? 3 : 4;
        const sel = shared.selectedIndex;
        const fillFor = (v: number, i: number) => {
          const met = band ? Math.abs(v - goal) <= goal * 0.1 : v >= goal;
          if (tones)
            return {
              fill: i === sel ? tones.selected : met ? tones.met : tones.missed,
              opacity: 1,
            };
          return { fill: color, opacity: i === sel ? 1 : met ? 0.75 : 0.3 };
        };
        return {
          under: <DashedGoal y={y(goal)} width={width} color={color} label={goalLabel} />,
          data: (
            <>
              {values.map((v, i) => {
                const x = xAt(i) - bw / 2;
                if (!(v > 0)) {
                  return (
                    <Rect
                      key={i}
                      x={x}
                      y={BOT - stub}
                      width={bw}
                      height={stub}
                      rx={stub / 2}
                      fill={Colors.borderInset}
                    />
                  );
                }
                const f = fillFor(v, i);
                return (
                  <G key={i}>
                    <Rect
                      x={x}
                      y={y(v)}
                      width={bw}
                      height={BOT - y(v)}
                      rx={rx}
                      fill={f.fill}
                      opacity={f.opacity}
                    />
                    {!isMonth && i === sel ? (
                      <Rect
                        x={x - 3}
                        y={y(v) - 3}
                        width={bw + 6}
                        height={BOT - y(v) + 3}
                        rx={8}
                        fill="none"
                        stroke={color}
                        strokeDasharray="3 3"
                      />
                    ) : null}
                  </G>
                );
              })}
            </>
          ),
          over: formatLabel ? (
            <>
              {values.map((v, i) =>
                v > 0 ? (
                  <ValueLabel
                    key={i}
                    x={xAt(i)}
                    y={y(v) - 8}
                    text={formatLabel(v)}
                    active={i === sel}
                  />
                ) : null
              )}
            </>
          ) : null,
          tipX: sel !== null && isMonth ? xAt(sel) : undefined,
        };
      }}
    />
  );
};

/** Text with a white halo so it stays readable over bars and lines. */
const ValueLabel: React.FC<{ x: number; y: number; text: string; active: boolean }> = ({
  x,
  y,
  text,
  active,
}) => (
  <G>
    <SvgText
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={11.5}
      fontFamily={Fonts.urbanist.extraBold}
      fill={Colors.card}
      stroke={Colors.card}
      strokeWidth={4}
      strokeLinejoin="round"
    >
      {text}
    </SvgText>
    <SvgText
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={11.5}
      fontFamily={Fonts.urbanist.extraBold}
      fill={active ? Colors.textPrimary : Colors.textSecondary}
    >
      {text}
    </SvgText>
  </G>
);

// ---------------------------------------------------------------------------
// WaterAreaChart (water, week): gradient area with a day indicator
// ---------------------------------------------------------------------------
export interface WaterAreaChartProps extends SharedChartProps {
  values: number[];
  goal: number;
  goalLabel: string;
}

export const WaterAreaChart: React.FC<WaterAreaChartProps> = ({
  values,
  goal,
  goalLabel,
  ...shared
}) => {
  const uid = cleanId(useId());
  const gradId = `water${uid}`;
  return (
    <ChartFrame
      {...shared}
      count={values.length}
      growFromBaseline={false}
      build={width => {
        const slotW = width / values.length;
        const xAt = (i: number) => slotW * (i + 0.5);
        const max = Math.max(goal, ...values) * 1.45 || 1;
        const y = (v: number) => BOT - (v / max) * (BOT - TOP);
        // The line runs through the last logged day; days after it have not happened yet
        let lastIdx = -1;
        values.forEach((v, i) => {
          if (v > 0) lastIdx = i;
        });
        const pts: (Point & { i: number })[] = [];
        for (let i = 0; i <= lastIdx; i++) pts.push({ i, x: xAt(i), y: y(values[i]) });
        const sel = shared.selectedIndex;
        const selPt = pts.find(p => p.i === sel);
        const line = smoothPath(pts);
        return {
          under: (
            <DashedGoal
              y={y(goal)}
              width={width}
              color={Colors.water}
              label={goalLabel}
              labelAt="left-below"
              opacity={0.7}
            />
          ),
          data:
            pts.length === 0 ? null : (
              <>
                <Defs>
                  <LinearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                    <Stop offset="0" stopColor={Colors.water} stopOpacity={0.45} />
                    <Stop offset="1" stopColor={Colors.water} stopOpacity={0.02} />
                  </LinearGradient>
                </Defs>
                {pts.length > 1 ? (
                  <>
                    <Path
                      d={`${line} L${pts[pts.length - 1].x},${BOT} L${pts[0].x},${BOT} Z`}
                      fill={`url(#${gradId})`}
                    />
                    <Path
                      d={line}
                      fill="none"
                      stroke={Colors.water}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : null}
              </>
            ),
          over: selPt ? (
            <>
              <Line
                x1={selPt.x}
                x2={selPt.x}
                y1={selPt.y}
                y2={BOT}
                stroke={Colors.textPrimary}
                strokeOpacity={0.2}
              />
              <Circle
                cx={selPt.x}
                cy={selPt.y}
                r={5}
                fill={Colors.water}
                stroke={Colors.card}
                strokeWidth={2.5}
              />
            </>
          ) : null,
        };
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// TrendLineChart (weight)
// ---------------------------------------------------------------------------
export interface TrendLineChartProps extends SharedChartProps {
  values: (number | null)[];
  /** Target weight, drawn only when it falls inside the chart's range */
  goal?: { value: number; label: string } | null;
  variant?: 'week' | 'month';
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  values,
  goal = null,
  variant = 'week',
  ...shared
}) => {
  const color = Colors.weight;
  const isMonth = variant === 'month';
  return (
    <ChartFrame
      {...shared}
      count={values.length}
      growFromBaseline={false}
      build={width => {
        const slotW = width / values.length;
        const xAt = (i: number) => slotW * (i + 0.5);
        const logged = values.filter((v): v is number => v !== null);
        if (logged.length === 0) return { data: null };
        const projection = trendProjection(values);
        const all = projection !== null ? [...logged, projection] : logged;
        const lo = Math.min(...all);
        const hi = Math.max(...all);
        const pad = Math.max(0.5, (hi - lo) * 0.35);
        const mn = lo - pad;
        const span = hi + pad - mn;
        const y = (v: number) => BOT - ((v - mn) / span) * (BOT - TOP);

        const pts: (Point & { i: number; v: number })[] = [];
        values.forEach((v, i) => {
          if (v !== null) pts.push({ i, v, x: xAt(i), y: y(v) });
        });
        const last = pts[pts.length - 1];
        const lastIdx = values.length - 1;
        const showTrend = projection !== null && last.i < lastIdx;
        const sel = shared.selectedIndex;
        const showGoal = goal !== null && goal.value > mn && goal.value < mn + span;

        return {
          under: showGoal ? (
            <DashedGoal
              y={y(goal!.value)}
              width={width}
              color={color}
              label={goal!.label}
              opacity={0.7}
            />
          ) : null,
          data: (
            <>
              {pts.length > 1 ? (
                <Path
                  d={smoothPath(pts)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {showTrend ? (
                <>
                  <Path
                    d={`M${last.x},${last.y} L${xAt(lastIdx)},${y(projection!)}`}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                    opacity={0.5}
                  />
                  <SvgText
                    x={xAt(lastIdx)}
                    y={y(projection!) + 18}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontFamily={Fonts.urbanist.extraBold}
                    fill={color}
                    opacity={0.75}
                  >
                    trend
                  </SvgText>
                </>
              ) : null}
              {pts.map(p => (
                <Circle
                  key={p.i}
                  cx={p.x}
                  cy={p.y}
                  r={p.i === sel ? 6 : isMonth ? 3 : 4.5}
                  fill={p.i === sel ? color : Colors.card}
                  stroke={color}
                  strokeWidth={2.5}
                />
              ))}
            </>
          ),
          over: isMonth ? null : (
            <>
              {pts.map(p => (
                <SvgText
                  key={p.i}
                  x={p.x}
                  y={p.y - 13}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily={Fonts.urbanist.extraBold}
                  fill={p.i === sel ? Colors.textPrimary : Colors.textSecondary}
                >
                  {p.v.toFixed(1)}
                </SvgText>
              ))}
            </>
          ),
          tipX: sel !== null && isMonth ? xAt(sel) : undefined,
        };
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// StatTiles: hairline-divided stat cells (Details header)
// ---------------------------------------------------------------------------
export interface StatTile {
  label: string;
  value: string;
  unit?: string;
}

/** Three-up stat tiles; the first is tinted with the page background. */
export const StatTiles: React.FC<{ stats: StatTile[] }> = ({ stats }) => (
  <View style={styles.tiles}>
    {stats.map((s, i) => (
      <View
        key={s.label}
        style={[styles.tile, i === 0 && styles.tileOn, i > 0 && styles.tileDivided]}
        accessible
        accessibilityLabel={`${s.label}: ${s.value}${s.unit ? ` ${s.unit}` : ''}`}
      >
        <Text style={styles.tileLabel}>{s.label}</Text>
        <Text numberOfLines={1} style={styles.tileValue}>
          {s.value}
          {s.unit ? <Text style={styles.tileUnit}>{` ${s.unit}`}</Text> : null}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  frame: {
    height: H,
    marginTop: 6,
  },
  originBaseline: {
    transformOrigin: ['50%', BOT, 0],
  },
  axisRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: H - 22,
    height: 16,
    flexDirection: 'row',
  },
  axisCell: {
    flex: 1,
    alignItems: 'center',
    overflow: 'visible',
  },
  axisLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textMuted,
    includeFontPadding: false,
  },
  // Centred over its slot but wider than it, so month labels ("Nov 15") aren't clipped in thin daily slots
  axisLabelBox: {
    position: 'absolute',
    left: '50%',
    width: 48,
    marginLeft: -24,
    textAlign: 'center',
  },
  axisLabelActive: {
    fontFamily: Fonts.urbanist.extraBold,
    color: Colors.textPrimary,
  },
  slots: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: H,
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  legendText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tiles: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  tile: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 2,
  },
  tileOn: {
    backgroundColor: Colors.background,
  },
  tileDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.borderSubtle,
  },
  tileLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tileValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 22,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  tileUnit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
