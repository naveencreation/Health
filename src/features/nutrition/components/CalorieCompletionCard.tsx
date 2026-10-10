import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  LayoutChangeEvent,
  LayoutAnimation,
  } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { Fonts } from '@/theme/typography';
import { ChartTypeToggle, ChartType } from '@/components/report/ChartTypeToggle';
import { ChartTooltipPin } from '@/components/report/ChartTooltipPin';


export interface DayCalorieIntakeData {
  dateStr: string;
  dayNum: number | string;
  dayName: string;
  calories: number;
  goalCalories: number;
  burnedCalories?: number;
}

export interface CalorieCompletionCardProps {
  days: DayCalorieIntakeData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  calorieGoal?: number;
  activeColor?: string;
  defaultChartType?: ChartType;
}

const CHART_HEIGHT = 210;
const Y_AXIS_WIDTH = 42;
const TOP_PAD = 54; // Extra headroom for SVG teardrop pin
const BOTTOM_PAD = 12;
const USABLE_HEIGHT = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD;
const BASELINE_Y = TOP_PAD + USABLE_HEIGHT;

// Bar corner radius — architectural rounded-shoulder, matches DESIGN.md
const BAR_CORNER_RADIUS = 10;

const triggerLayoutAnim = () => {
  if (Platform.OS !== 'web' && typeof jest === 'undefined') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
};

/**
 * Rounded-shoulder bar using Q (quadratic bezier) corner arcs.
 * Immune to the W3C SVG arc auto-scaling bug that distorts the old
 * semicircular dome formula when barHeight < barWidth.
 */
function buildBarPath(barX: number, topY: number, barWidth: number, barHeight: number): string {
  const r = Math.min(BAR_CORNER_RADIUS, barWidth / 2, barHeight);
  const right = barX + barWidth;
  const bottom = topY + barHeight;
  return (
    `M ${barX} ${bottom} ` +
    `L ${barX} ${topY + r} ` +
    `Q ${barX} ${topY} ${barX + r} ${topY} ` +
    `L ${right - r} ${topY} ` +
    `Q ${right} ${topY} ${right} ${topY + r} ` +
    `L ${right} ${bottom} Z`
  );
}

export const CalorieCompletionCard: React.FC<CalorieCompletionCardProps> = ({
  days,
  selectedIndex,
  onSelectDay,
  calorieGoal = 2500,
  activeColor = '#8DBE3B',
  defaultChartType = 'bar',
}) => {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [canvasWidth, setCanvasWidth] = useState<number>(300);

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== canvasWidth) {
      setCanvasWidth(width);
    }
  };

  const handleSelectDay = (index: number) => {
    triggerLayoutAnim();
    onSelectDay(index);
  };

  const handleToggleChartType = (type: ChartType) => {
    triggerLayoutAnim();
    setChartType(type);
  };

  // Today reference date string for distinguishing future days
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Adaptive Y-Axis Scale
  const { maxY, yTicks } = useMemo<{ maxY: number; yTicks: number[] }>(() => {
    const goal = calorieGoal > 0 ? calorieGoal : 2500;
    const maxLogged = days.length > 0 ? Math.max(...days.map(d => d.calories || 0)) : 0;
    const highest = Math.max(goal, maxLogged);

    let ceiling = 3000;
    let step = 500;

    if (highest <= 1500) {
      ceiling = 1500;
      step = 500;
    } else if (highest <= 2000) {
      ceiling = 2000;
      step = 500;
    } else if (highest <= 2500) {
      ceiling = 2500;
      step = 500;
    } else if (highest <= 3000) {
      ceiling = 3000;
      step = 500;
    } else {
      ceiling = Math.ceil(highest / 500) * 500;
      step = Math.round(ceiling / 6);
    }

    // Only render positive ticks (> 0) to match reference image (500, 1000, 1500, 2000, 2500, 3000)
    const ticks: number[] = [];
    for (let v = step; v <= ceiling; v += step) {
      ticks.push(v);
    }

    return { maxY: ceiling, yTicks: ticks };
  }, [days, calorieGoal]);

  const safeIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, days.length - 1));

  // Check if entire period has no logged calories
  const hasAnyCalories = useMemo(() => {
    return days.some(d => (d.calories || 0) > 0);
  }, [days]);

  // Coordinates for each day
  const chartCoordinates = useMemo(() => {
    if (canvasWidth <= 0 || days.length === 0) return [];
    const count = days.length;
    const colWidth = canvasWidth / count;

    return days.map((day, idx) => {
      const x = idx * colWidth + colWidth / 2;
      const calories = day.calories || 0;
      const isZero = calories === 0;
      const isFuture = Boolean(day.dateStr && day.dateStr > todayStr);
      const ratio = Math.min(1, Math.max(0, calories / maxY));

      // Option 1: In Line mode, zero days clamp to baseline; Bar mode → 5px resting capsule
      const y = isZero ? BASELINE_Y : TOP_PAD + (1 - ratio) * USABLE_HEIGHT;
      // Min height = BAR_CORNER_RADIUS * 2 so Q-arc corners always fit cleanly
      const barHeight = isZero ? 5 : Math.max(BAR_CORNER_RADIUS * 2, ratio * USABLE_HEIGHT);
      const topY = BASELINE_Y - barHeight;
      const barWidth = Math.min(34, Math.max(18, colWidth * 0.62));
      const barX = x - barWidth / 2;

      return {
        x,
        y,
        barX,
        topY,
        barWidth,
        barHeight,
        calories,
        isZero,
        isFuture,
        dayNum: day.dayNum,
      };
    });
  }, [canvasWidth, days, maxY, todayStr]);

  // Goal Line Y position
  const goalY = useMemo(() => {
    const ratio = Math.min(1, Math.max(0, calorieGoal / maxY));
    return TOP_PAD + (1 - ratio) * USABLE_HEIGHT;
  }, [calorieGoal, maxY]);

  // Smooth Bezier Curve Path for Line Mode
  const { linePath, fillPath } = useMemo(() => {
    if (chartCoordinates.length === 0) return { linePath: '', fillPath: '' };
    if (chartCoordinates.length === 1) {
      const p = chartCoordinates[0];
      return { linePath: `M ${p.x} ${p.y}`, fillPath: '' };
    }

    let d = `M ${chartCoordinates[0].x} ${chartCoordinates[0].y}`;
    for (let i = 0; i < chartCoordinates.length - 1; i++) {
      const curr = chartCoordinates[i];
      const next = chartCoordinates[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 2;
      const cpY1 = curr.y;
      const cpX2 = curr.x + (next.x - curr.x) / 2;
      const cpY2 = next.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    const last = chartCoordinates[chartCoordinates.length - 1];
    const first = chartCoordinates[0];
    const fill = `${d} L ${last.x} ${BASELINE_Y} L ${first.x} ${BASELINE_Y} Z`;

    return { linePath: d, fillPath: fill };
  }, [chartCoordinates]);

  const selectedCoord = chartCoordinates[safeIndex];

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header: Title + Squircle Toggle */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Calorie (kcal)</Text>
        <ChartTypeToggle
          chartType={chartType}
          onChange={handleToggleChartType}
          activeColor={activeColor}
          activeIconColor="#0F172A"
        />
      </View>

      {/* Subtle Hairline Divider */}
      <View style={styles.headerDivider} />

      {/* 2. Legend Row: [â— Selected]  [--- Calorie Intake Goal] */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: activeColor }]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={styles.dashedGoalLine} />
          <Text style={styles.legendText}>Calorie Intake Goal</Text>
        </View>
      </View>

      {/* 3. Main Chart Surface */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Column (500, 1000, 1500, 2000, 2500, 3000) */}
        <View style={styles.yAxisColumn}>
          {yTicks.map(tick => {
            const ratio = tick / maxY;
            const topPos = TOP_PAD + (1 - ratio) * USABLE_HEIGHT - 8;
            return (
              <Text
                key={`ytick_${tick}`}
                style={[styles.yAxisLabel, { position: 'absolute', top: topPos }]}
                numberOfLines={1}
              >
                {tick}
              </Text>
            );
          })}
        </View>

        {/* SVG Drawing Canvas */}
        <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
          {canvasWidth > 0 && (
            <Svg width={canvasWidth} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="calorieLimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={activeColor} stopOpacity="0.26" />
                  <Stop offset="1" stopColor={activeColor} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Goal Reference Line (Horizontal Dashed placed behind bars) */}
              <Line
                x1={0}
                y1={goalY}
                x2={canvasWidth}
                y2={goalY}
                stroke="#A3D95B"
                strokeWidth={1.8}
                strokeDasharray="8, 6"
              />

              {/* BAR CHART MODE */}
              {chartType === 'bar' &&
                chartCoordinates.map((coord, idx) => {
                  const isSelected = idx === safeIndex;
                  // Both zero (5px capsule) and non-zero bars use the same
                  // Q-arc rounded-shoulder path — distortion-free at any height
                  return (
                    <Path
                      key={`bar_${idx}`}
                      d={buildBarPath(coord.barX, coord.topY, coord.barWidth, coord.barHeight)}
                      fill={
                        coord.isZero
                          ? isSelected
                            ? activeColor
                            : '#E2E8F0'
                          : isSelected
                            ? activeColor
                            : '#CEE89F'
                      }
                    />
                  );
                })}

              {/* LINE CHART MODE: Smooth Bezier Curve with Gradient Area */}
              {chartType === 'line' && (
                <>
                  {/* Subtle Gradient Area Fill */}
                  {fillPath !== '' && <Path d={fillPath} fill="url(#calorieLimeGrad)" />}

                  {/* Bezier Stroke */}
                  {linePath !== '' && (
                    <Path
                      d={linePath}
                      fill="none"
                      stroke={activeColor}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Circular Node Markers (Option 1: Hollow Node on Baseline for Zero Days) */}
                  {chartCoordinates.map((coord, idx) => {
                    const isSelected = idx === safeIndex;

                    if (coord.isZero) {
                      // Hollow resting node on baseline for 0/unlogged day
                      if (isSelected) {
                        return (
                          <Circle
                            key={`node_${idx}`}
                            cx={coord.x}
                            cy={coord.y}
                            r={6.5}
                            fill="#FFFFFF"
                            stroke={activeColor}
                            strokeWidth={3}
                          />
                        );
                      }
                      return (
                        <Circle
                          key={`node_${idx}`}
                          cx={coord.x}
                          cy={coord.y}
                          r={5}
                          fill="#FFFFFF"
                          stroke="#94A3B8"
                          strokeWidth={2}
                        />
                      );
                    }

                    // Non-zero day nodes
                    if (isSelected) {
                      return (
                        <Circle
                          key={`node_${idx}`}
                          cx={coord.x}
                          cy={coord.y}
                          r={7.5}
                          fill={activeColor}
                        />
                      );
                    }
                    return (
                      <Circle
                        key={`node_${idx}`}
                        cx={coord.x}
                        cy={coord.y}
                        r={6}
                        fill="#FFFFFF"
                        stroke={activeColor}
                        strokeWidth={3}
                      />
                    );
                  })}
                </>
              )}

            </Svg>
          )}

          {/* ── FLOATING TOOLTIP PIN (Unified bubble + tail + value/unit text) ── */}
          {selectedCoord &&
            (() => {
              const PIN_WIDTH = 42;
              const PIN_HEIGHT = 48;
              const apexY = chartType === 'bar' ? selectedCoord.topY : selectedCoord.y;
              const pinLeft = Math.max(
                0,
                Math.min(canvasWidth - PIN_WIDTH, selectedCoord.x - PIN_WIDTH / 2)
              );
              const pinTop = Math.max(0, apexY - PIN_HEIGHT - 2);
              return (
                <View
                  pointerEvents="none"
                  style={[
                    styles.floatingPinContainer,
                    {
                      left: pinLeft,
                      top: pinTop,
                    },
                  ]}
                >
                  <ChartTooltipPin
                    valueText={
                      selectedCoord.isFuture && selectedCoord.isZero
                        ? '--'
                        : String(selectedCoord.calories)
                    }
                    unitText="kcal"
                    activeColor={activeColor}
                  />
                </View>
              );
            })()}

          {/* Transparent Tap Hotspots spanning full chart height */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {chartCoordinates.map((coord, idx) => {
              const count = chartCoordinates.length;
              const colWidth = canvasWidth / count;
              return (
                <Pressable
                  key={`tap_${idx}`}
                  style={{
                    position: 'absolute',
                    left: idx * colWidth,
                    top: 0,
                    width: colWidth,
                    height: CHART_HEIGHT,
                  }}
                  onPress={() => handleSelectDay(idx)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${days[idx]?.dayNum || idx + 1}: ${coord.calories} kcal`}
                />
              );
            })}
          </View>
        </View>
      </View>

      {/* 4. X-Axis Day Numbers */}
      <View style={styles.xAxisRow}>
        <View style={{ width: Y_AXIS_WIDTH }} />
        <View style={styles.xAxisLabelsWrap}>
          {days.map((day, idx) => {
            const isSelected = idx === safeIndex;
            const coord = chartCoordinates[idx];
            return (
              <Pressable
                key={`xlabel_${idx}`}
                style={styles.xAxisLabelCol}
                onPress={() => handleSelectDay(idx)}
              >
                <Text
                  style={[
                    styles.xAxisText,
                    isSelected && styles.xAxisTextSelected,
                    coord?.isFuture && !isSelected && styles.xAxisTextFuture,
                  ]}
                >
                  {day.dayNum}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 5. Gentle Empty State Banner when all days are 0 */}
      {!hasAnyCalories && (
        <View style={styles.emptyPeriodBanner}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
              fill={activeColor}
            />
          </Svg>
          <Text style={styles.emptyPeriodText}>
            No meals logged for this period yet. Tap a day to inspect.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowOpacity: 0, // Zero Float Shadow Standard
    elevation: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 14,
    marginBottom: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#475569',
    letterSpacing: -0.1,
  },
  dashedGoalLine: {
    width: 24,
    height: 0,
    borderWidth: 1.5,
    borderColor: '#A3D95B',
    borderStyle: 'dashed',
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxisColumn: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    position: 'relative',
    paddingRight: 10,
  },
  yAxisLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    width: '100%',
  },
  canvasContainer: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  floatingPinContainer: {
    position: 'absolute',
    width: 42,
    alignItems: 'center',
    zIndex: 10,
  },
  xAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  xAxisLabelsWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  xAxisLabelCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  xAxisText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#64748B',
  },
  xAxisTextSelected: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
  xAxisTextFuture: {
    color: '#94A3B8',
  },
  emptyPeriodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyPeriodText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
});

export default CalorieCompletionCard;
