import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
} from 'react-native-svg';
import { Fonts } from '@/theme/typography';
import { ChartTypeToggle, ChartType } from './ChartTypeToggle';
import { ChartTooltipPin } from './ChartTooltipPin';

export interface DayWeightTrendData {
  dateStr: string;
  dayNum: number | string;
  dayName: string;
  weightKg: number | null;
  displayWeight: number | null; // already converted to user unit
}

interface WeightTrendCardProps {
  days: DayWeightTrendData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  targetWeightKg?: number;
  unit?: 'kg' | 'lbs';
  activeColor?: string;
  defaultChartType?: ChartType;
}

const CHART_HEIGHT = 185;
const TOP_PAD = 14;
const BOTTOM_PAD = 10;
const USABLE_HEIGHT = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD; // 161px

export const WeightTrendCard: React.FC<WeightTrendCardProps> = ({
  days,
  selectedIndex,
  onSelectDay,
  targetWeightKg,
  unit = 'kg',
  activeColor = '#F43F5E',
  defaultChartType = 'line',
}) => {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

  const unitFactor = unit === 'lbs' ? 2.20462 : 1;
  const targetWeightDisplay = targetWeightKg ? targetWeightKg * unitFactor : null;

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== canvasWidth) {
      setCanvasWidth(width);
    }
  };

  // Extract all valid weights in current range to compute Y-Axis bounds
  const validWeights = useMemo(() => {
    const list: number[] = [];
    days.forEach((d) => {
      if (d.displayWeight !== null && !isNaN(d.displayWeight) && d.displayWeight > 0) {
        list.push(d.displayWeight);
      }
    });
    if (targetWeightDisplay) {
      list.push(targetWeightDisplay);
    }
    return list;
  }, [days, targetWeightDisplay]);

  // Compute adaptive Y-Axis starting at 0 up to 100 (or higher multiple of 20) matching reference
  const { maxY, yTicks } = useMemo(() => {
    const maxLogged = validWeights.length > 0 ? Math.max(...validWeights) : 75;
    const target = targetWeightDisplay || 75;
    const highest = Math.max(maxLogged, target);

    let ceiling = 100;
    let step = 20;

    if (unit === 'lbs') {
      if (highest > 240) {
        ceiling = Math.ceil(highest / 50) * 50;
        step = ceiling / 5;
      } else if (highest > 190) {
        ceiling = 250;
        step = 50;
      } else {
        ceiling = 200;
        step = 40;
      }
    } else {
      // kg mode: default 100 with step 20 (matching reference [100, 80, 60, 40, 20, 0])
      if (highest > 95) {
        ceiling = Math.ceil(highest / 20) * 20;
        step = ceiling / 5;
      } else {
        ceiling = 100;
        step = 20;
      }
    }

    const ticks = [
      ceiling,
      Math.round(ceiling - step),
      Math.round(ceiling - step * 2),
      Math.round(ceiling - step * 3),
      Math.round(ceiling - step * 4),
      0,
    ];

    return { maxY: ceiling, yTicks: ticks };
  }, [validWeights, targetWeightDisplay, unit]);

  const numDays = Math.max(1, days.length);
  const colWidth = canvasWidth > 0 ? canvasWidth / numDays : 0;
  // Bold, wide pill bars like reference Image 2
  const barWidth = Math.min(32, Math.max(20, Math.round(colWidth * 0.72)));

  // Y coordinate calculation helper (0 is at baseline, maxY is at TOP_PAD)
  const getYCoordinate = (val: number): number => {
    const normalized = Math.max(0, Math.min(1, val / maxY));
    return CHART_HEIGHT - BOTTOM_PAD - normalized * USABLE_HEIGHT;
  };

  // Interpolate weights for connected line path across empty days
  const linePoints = useMemo(() => {
    if (canvasWidth === 0) return [];

    const validIndices = days
      .map((d, i) => (d.displayWeight !== null ? i : -1))
      .filter((i) => i !== -1);

    if (validIndices.length === 0) return [];

    return days.map((d, i) => {
      const x = (i + 0.5) * colWidth;
      let effectiveWeight = d.displayWeight;

      if (effectiveWeight === null) {
        const prevIdx = [...validIndices].reverse().find((idx) => idx < i);
        const nextIdx = validIndices.find((idx) => idx > i);

        if (prevIdx !== undefined && nextIdx !== undefined) {
          const prevVal = days[prevIdx].displayWeight!;
          const nextVal = days[nextIdx].displayWeight!;
          const ratio = (i - prevIdx) / (nextIdx - prevIdx);
          effectiveWeight = prevVal + (nextVal - prevVal) * ratio;
        } else if (prevIdx !== undefined) {
          effectiveWeight = days[prevIdx].displayWeight;
        } else if (nextIdx !== undefined) {
          effectiveWeight = days[nextIdx].displayWeight;
        }
      }

      const y = effectiveWeight !== null ? getYCoordinate(effectiveWeight) : CHART_HEIGHT - BOTTOM_PAD;
      return {
        x,
        y,
        hasLog: d.displayWeight !== null,
        weight: d.displayWeight,
      };
    });
  }, [days, canvasWidth, colWidth, maxY]);

  // Construct SVG Path for Line & Area
  const { linePath, areaPath } = useMemo(() => {
    if (linePoints.length === 0) return { linePath: '', areaPath: '' };

    const validIndices = linePoints
      .map((p, i) => (p.hasLog ? i : -1))
      .filter((i) => i !== -1);

    if (validIndices.length <= 1) {
      return { linePath: '', areaPath: '' };
    }

    const firstValidIdx = validIndices[0];
    const lastValidIdx = validIndices[validIndices.length - 1];
    const segmentPoints = linePoints.slice(firstValidIdx, lastValidIdx + 1);

    const path = segmentPoints.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
      ''
    );

    const area = `${path} L ${segmentPoints[segmentPoints.length - 1].x} ${CHART_HEIGHT - BOTTOM_PAD} L ${segmentPoints[0].x} ${CHART_HEIGHT - BOTTOM_PAD} Z`;

    return { linePath: path, areaPath: area };
  }, [linePoints]);

  const goalY = targetWeightDisplay ? getYCoordinate(targetWeightDisplay) : null;
  const selectedPoint = linePoints[selectedIndex];

  return (
    <View style={styles.cardContainer}>
      {/* 1. Card Header Row: Title & Toggle */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Weight ({unit})</Text>

        <ChartTypeToggle
          chartType={chartType}
          onChange={setChartType}
          activeColor={activeColor}
        />
      </View>

      {/* 2. Legend Row: "● Selected" and "--- Weight Goal" */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: activeColor }]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>

        {targetWeightDisplay && (
          <View style={styles.legendItem}>
            <View style={styles.legendDashLine}>
              <Svg width={22} height={4}>
                <Line
                  x1={0}
                  y1={2}
                  x2={22}
                  y2={2}
                  stroke={activeColor}
                  strokeWidth={1.8}
                  strokeDasharray="4 3"
                />
              </Svg>
            </View>
            <Text style={styles.legendText}>Weight Goal</Text>
          </View>
        )}
      </View>

      {/* 3. Main Chart View (Y-Axis + Canvas) */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Column (100, 80, 60, 40, 20, 0) */}
        <View style={styles.yAxisColumn}>
          {yTicks.map((tick, idx) => (
            <Text key={`weight_tick_${idx}`} style={styles.yTickText}>
              {tick}
            </Text>
          ))}
        </View>

        {/* Canvas Area */}
        <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
          {/* Subtle Base Guideline at 0 */}
          <View style={[styles.chartBaseline, { bottom: BOTTOM_PAD }]} />

          {/* Goal Reference Dashed Line (Overlaid at target) */}
          {goalY !== null && canvasWidth > 0 && (
            <View
              style={[
                styles.goalDashedLineOverlay,
                { top: goalY },
              ]}
              pointerEvents="none"
            >
              <Svg width={canvasWidth} height={2}>
                <Line
                  x1={0}
                  y1={1}
                  x2={canvasWidth}
                  y2={1}
                  stroke={activeColor}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </Svg>
            </View>
          )}

          {chartType === 'bar' ? (
            /* Bar Chart Mode (Image 2) */
            <Animated.View entering={FadeIn.duration(180)} style={styles.barColumnsRow}>
              {days.map((day, idx) => {
                const isSelected = idx === selectedIndex;
                const hasLog = day.displayWeight !== null && day.displayWeight > 0;
                const barHeight = hasLog
                  ? Math.max(16, (day.displayWeight! / maxY) * USABLE_HEIGHT)
                  : 0;

                const pinBottom = barHeight + BOTTOM_PAD - 2;

                return (
                  <Pressable
                    key={`weight_bar_${day.dateStr}_${idx}`}
                    style={styles.dayColTouchable}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dayName}: ${hasLog ? day.displayWeight + ' ' + unit : 'No log'}`}
                  >
                    {/* Floating Pin directly above selected bar */}
                    {isSelected && (
                      <View
                        style={[
                          styles.floatingPinContainer,
                          { bottom: pinBottom },
                        ]}
                      >
                        <ChartTooltipPin
                          valueText={hasLog ? `${day.displayWeight!.toFixed(1)}` : 'No entry'}
                          unitText={hasLog ? unit : undefined}
                          activeColor={hasLog ? activeColor : '#94A3B8'}
                        />
                      </View>
                    )}

                    {/* Capsule Pillar Bar */}
                    {hasLog && (
                      <View
                        style={[
                          styles.capsuleBar,
                          {
                            width: barWidth,
                            height: barHeight,
                            backgroundColor: isSelected ? activeColor : '#FFAA94',
                            borderTopLeftRadius: barWidth / 2,
                            borderTopRightRadius: barWidth / 2,
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                          },
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : (
            /* Line Chart Mode (Image 1) */
            <Animated.View entering={FadeIn.duration(180)} style={styles.lineContainer}>
              {canvasWidth > 0 && (
                <Svg width={canvasWidth} height={CHART_HEIGHT} style={StyleSheet.absoluteFill}>
                  {linePath.length > 0 && (
                    <>
                      <Defs>
                        <LinearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor={activeColor} stopOpacity="0.25" />
                          <Stop offset="75%" stopColor={activeColor} stopOpacity="0.06" />
                          <Stop offset="100%" stopColor={activeColor} stopOpacity="0" />
                        </LinearGradient>
                      </Defs>

                      {/* Gradient Area Fill under trendline */}
                      <Path d={areaPath} fill="url(#weightAreaGrad)" />

                      {/* Smooth Trend Stroke Line */}
                      <Path
                        d={linePath}
                        stroke={activeColor}
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </>
                  )}

                  {/* Data Point Circles: Hollow donut for unselected, solid orange for selected */}
                  {linePoints.map((p, i) => {
                    if (!p.hasLog) return null;
                    const isSelected = i === selectedIndex;
                    return isSelected ? (
                      /* Selected: Solid vibrant orange circle */
                      <Circle
                        key={`line_pt_${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={7}
                        fill={activeColor}
                      />
                    ) : (
                      /* Unselected: White center with thick orange border */
                      <Circle
                        key={`line_pt_${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={6.5}
                        fill="#FFFFFF"
                        stroke={activeColor}
                        strokeWidth={3}
                      />
                    );
                  })}
                </Svg>
              )}

              {/* Floating Tooltip Pin in Line Mode */}
              {selectedPoint && (
                <View
                  style={[
                    styles.floatingPinContainer,
                    {
                      left: selectedPoint.x - 21,
                      bottom: CHART_HEIGHT - selectedPoint.y + 4,
                    },
                  ]}
                >
                  <ChartTooltipPin
                    valueText={
                      selectedPoint.hasLog && selectedPoint.weight !== null
                        ? `${selectedPoint.weight.toFixed(1)}`
                        : 'No entry'
                    }
                    unitText={selectedPoint.hasLog ? unit : undefined}
                    activeColor={selectedPoint.hasLog ? activeColor : '#94A3B8'}
                  />
                </View>
              )}

              {/* Transparent Touch Columns for Line scrubbing/selection */}
              <View style={styles.touchColRow}>
                {days.map((d, idx) => (
                  <Pressable
                    key={`line_touch_${d.dateStr}_${idx}`}
                    style={styles.dayColTouchable}
                    onPress={() => onSelectDay(idx)}
                  />
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      {/* 4. X-Axis Day Numbers Row */}
      <View style={styles.xAxisRow}>
        <View style={styles.yAxisOffset} />
        <View style={styles.xAxisLabelsContainer}>
          {days.map((day, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Pressable
                key={`label_${day.dateStr}_${idx}`}
                style={styles.xLabelCol}
                onPress={() => onSelectDay(idx)}
              >
                <Text
                  style={[
                    styles.dayNumText,
                    isSelected && styles.dayNumTextSelected,
                  ]}
                >
                  {day.dayNum}
                </Text>
              </Pressable>
            );
          })}
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
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 8,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDashLine: {
    width: 22,
    height: 4,
    justifyContent: 'center',
  },
  legendText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxisColumn: {
    width: 28,
    height: CHART_HEIGHT - BOTTOM_PAD,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 1,
  },
  yTickText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
  },
  canvasContainer: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  chartBaseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  goalDashedLineOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
  },
  barColumnsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  touchColRow: {
    flex: 1,
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  dayColTouchable: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: BOTTOM_PAD,
  },
  capsuleBar: {
    alignSelf: 'center',
  },
  floatingPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  xAxisRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  yAxisOffset: {
    width: 28,
  },
  xAxisLabelsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  xLabelCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayNumText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  dayNumTextSelected: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
});
