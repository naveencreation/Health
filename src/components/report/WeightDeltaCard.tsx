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
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ChartTypeToggle, ChartType } from './ChartTypeToggle';
import { ChartTooltipPin } from './ChartTooltipPin';

export interface DayWeightDeltaData {
  dateStr: string;
  dayNum: number | string;
  dayName: string;
  deltaKg: number | null;
  displayDelta: number | null; // in user unit
}

interface WeightDeltaCardProps {
  days: DayWeightDeltaData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  unit?: 'kg' | 'lbs';
  activeColor?: string;
  defaultChartType?: ChartType;
  subtitle?: string;
}

const CHART_HEIGHT = 160;
const Y_AXIS_WIDTH = 44;
const PADDING_V = 16;
const USABLE_HEIGHT = CHART_HEIGHT - PADDING_V * 2;
const ZERO_Y = CHART_HEIGHT / 2;

export const WeightDeltaCard: React.FC<WeightDeltaCardProps> = ({
  days,
  selectedIndex,
  onSelectDay,
  unit = 'kg',
  activeColor = Colors.weight,
  defaultChartType = 'bar',
  subtitle,
}) => {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== canvasWidth) {
      setCanvasWidth(width);
    }
  };

  // Find max absolute delta to scale symmetric Y-axis around 0
  const maxAbsDelta = useMemo(() => {
    let maxVal = 0;
    days.forEach((d) => {
      if (d.displayDelta !== null && !isNaN(d.displayDelta)) {
        const abs = Math.abs(d.displayDelta);
        if (abs > maxVal) maxVal = abs;
      }
    });
    // Default baseline clamp (e.g. 1.0 kg or 2.0 lbs)
    const baseMin = unit === 'lbs' ? 2.0 : 1.0;
    return Math.max(baseMin, Math.ceil(maxVal * 2) / 2);
  }, [days, unit]);

  const yTicks = useMemo(() => {
    return [
      `+${maxAbsDelta.toFixed(1)}`,
      `+${(maxAbsDelta / 2).toFixed(1)}`,
      '0.0',
      `-${(maxAbsDelta / 2).toFixed(1)}`,
      `-${maxAbsDelta.toFixed(1)}`,
    ];
  }, [maxAbsDelta]);

  const numDays = Math.max(1, days.length);
  const colWidth = canvasWidth > 0 ? canvasWidth / numDays : 0;
  const barWidth = Math.min(24, Math.max(16, Math.round(colWidth * 0.52)));

  // Calculate Y coordinate from delta value
  const getYCoordinate = (val: number): number => {
    const clamped = Math.max(-maxAbsDelta, Math.min(maxAbsDelta, val));
    // When clamped is +maxAbsDelta, y = PADDING_V
    // When clamped is 0, y = ZERO_Y
    // When clamped is -maxAbsDelta, y = CHART_HEIGHT - PADDING_V
    const normalized = clamped / maxAbsDelta; // -1 to +1
    return ZERO_Y - normalized * (USABLE_HEIGHT / 2);
  };

  // Line points for line chart mode
  const linePoints = useMemo(() => {
    if (canvasWidth === 0) return [];
    return days.map((d, i) => {
      const x = (i + 0.5) * colWidth;
      const delta = d.displayDelta ?? 0;
      const y = getYCoordinate(delta);
      return {
        x,
        y,
        hasLog: d.displayDelta !== null,
        delta: d.displayDelta,
      };
    });
  }, [days, canvasWidth, colWidth, maxAbsDelta]);

  const linePath = useMemo(() => {
    if (linePoints.length === 0) return '';
    return linePoints.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
      ''
    );
  }, [linePoints]);

  const selectedPoint = linePoints[selectedIndex];

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Weight Fluctuation</Text>
          <Text style={styles.cardSubtitle}>{subtitle || `Day-to-day ± variance (${unit})`}</Text>
        </View>

        <ChartTypeToggle
          chartType={chartType}
          onChange={setChartType}
          activeColor={activeColor}
        />
      </View>
      <View style={styles.headerDivider} />

      {/* 2. Chart Body */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Column */}
        <View style={styles.yAxisColumn}>
          {yTicks.map((tick, idx) => (
            <Text key={`delta_tick_${idx}`} style={styles.yTickText}>
              {tick}
            </Text>
          ))}
        </View>

        {/* Canvas Area */}
        <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
          {/* Centered Zero Guideline */}
          <View style={[styles.zeroBaseline, { top: ZERO_Y }]} />

          {chartType === 'bar' ? (
            /* Bar Chart Mode (Diverging bars from zero) */
            <Animated.View entering={FadeIn.duration(180)} style={styles.barColumnsRow}>
              {days.map((day, idx) => {
                const isSelected = idx === selectedIndex;
                const hasLog = day.displayDelta !== null;
                const delta = day.displayDelta ?? 0;

                // Calculate bar geometry from ZERO_Y
                const barTop = delta >= 0 ? getYCoordinate(delta) : ZERO_Y;
                const rawHeight = Math.abs(getYCoordinate(delta) - ZERO_Y);
                const barHeight = hasLog ? Math.max(4, rawHeight) : 2;

                const isLoss = delta < 0;
                const isZero = delta === 0;
                const barColor = !hasLog
                  ? '#F1F5F9'
                  : isZero
                  ? '#94A3B8' // Neutral slate for zero change
                  : isLoss
                  ? '#10B981' // Green for loss
                  : '#FF3B5C'; // Coral for gain

                const pinBottom =
                  delta >= 0
                    ? CHART_HEIGHT - barTop + 4
                    : CHART_HEIGHT - ZERO_Y + 4;

                const formattedDeltaText = hasLog
                  ? isZero
                    ? `0.0 ${unit}`
                    : delta > 0
                    ? `+${delta.toFixed(1)}`
                    : delta.toFixed(1)
                  : 'No entry';

                return (
                  <Pressable
                    key={`delta_bar_${day.dateStr}_${idx}`}
                    style={styles.dayColTouchable}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dayName}: ${formattedDeltaText} ${unit}`}
                  >
                    {/* Floating Pin */}
                    {isSelected && (
                      <View style={[styles.floatingPinContainer, { bottom: Math.min(CHART_HEIGHT - 38, pinBottom) }]}>
                        <ChartTooltipPin
                          valueText={formattedDeltaText}
                          unitText={hasLog ? unit : undefined}
                          activeColor={barColor}
                        />
                      </View>
                    )}

                    {/* Diverging Bar */}
                    <View
                      style={[
                        styles.divergingBar,
                        {
                          width: barWidth,
                          height: barHeight,
                          top: barTop,
                          backgroundColor: barColor,
                          opacity: isSelected ? 1 : 0.75,
                          borderRadius: barWidth / 2,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : (
            /* Line Chart Mode */
            <Animated.View entering={FadeIn.duration(180)} style={styles.lineContainer}>
              {canvasWidth > 0 && linePath.length > 0 && (
                <Svg width={canvasWidth} height={CHART_HEIGHT} style={StyleSheet.absoluteFill}>
                  {/* Zero Center Line */}
                  <Line
                    x1={0}
                    y1={ZERO_Y}
                    x2={canvasWidth}
                    y2={ZERO_Y}
                    stroke="#E2E8F0"
                    strokeWidth={1}
                  />

                  {/* Connected Delta Stroke */}
                  <Path
                    d={linePath}
                    stroke="#64748B"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Node Dots */}
                  {linePoints.map((p, i) => {
                    if (!p.hasLog) return null;
                    const isSelected = i === selectedIndex;
                    const isZero = (p.delta ?? 0) === 0;
                    const isLoss = (p.delta ?? 0) < 0;
                    const ptColor = isZero ? '#94A3B8' : isLoss ? '#10B981' : '#FF3B5C';

                    return (
                      <Circle
                        key={`delta_pt_${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={isSelected ? 5.5 : 3.5}
                        fill="#FFFFFF"
                        stroke={ptColor}
                        strokeWidth={isSelected ? 2.5 : 2}
                      />
                    );
                  })}
                </Svg>
              )}

              {/* Pin in Line Mode */}
              {selectedPoint && (
                <View
                  style={[
                    styles.floatingPinContainer,
                    {
                      left: selectedPoint.x - 19,
                      bottom: Math.min(CHART_HEIGHT - 38, CHART_HEIGHT - selectedPoint.y + 4),
                    },
                  ]}
                >
                  <ChartTooltipPin
                    valueText={
                      selectedPoint.hasLog && selectedPoint.delta !== null
                        ? (selectedPoint.delta === 0)
                          ? `0.0 ${unit}`
                          : selectedPoint.delta > 0
                          ? `+${selectedPoint.delta.toFixed(1)}`
                          : selectedPoint.delta.toFixed(1)
                        : 'No entry'
                    }
                    unitText={selectedPoint.hasLog && selectedPoint.delta !== 0 ? unit : undefined}
                    activeColor={
                      !selectedPoint.hasLog || selectedPoint.delta === null
                        ? '#94A3B8'
                        : selectedPoint.delta === 0
                        ? '#94A3B8'
                        : selectedPoint.delta < 0
                        ? '#10B981'
                        : activeColor
                    }
                  />
                </View>
              )}

              {/* Touch Area */}
              <View style={styles.touchColRow}>
                {days.map((d, idx) => (
                  <Pressable
                    key={`delta_touch_${d.dateStr}_${idx}`}
                    style={styles.dayColTouchable}
                    onPress={() => onSelectDay(idx)}
                  />
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      {/* 3. X-Axis Day Labels Row */}
      <View style={styles.xAxisRow}>
        <View style={{ width: Y_AXIS_WIDTH }} />
        <View style={styles.xAxisLabelsContainer}>
          {days.map((day, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Pressable
                key={`delta_label_${day.dateStr}_${idx}`}
                style={styles.xLabelCol}
                onPress={() => onSelectDay(idx)}
              >
                <Text
                  style={[
                    styles.dayNumText,
                    isSelected && { color: activeColor, fontFamily: Fonts.poppins.bold },
                  ]}
                >
                  {day.dayNum}
                </Text>
                <Text
                  style={[
                    styles.dayNameText,
                    isSelected && { color: activeColor, fontFamily: Fonts.poppins.bold },
                  ]}
                >
                  {day.dayName}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
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
    marginBottom: 10,
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxisColumn: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  yTickText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#94A3B8',
  },
  canvasContainer: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  zeroBaseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#CBD5E1',
    zIndex: 1,
  },
  barColumnsRow: {
    flex: 1,
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  lineContainer: {
    ...StyleSheet.absoluteFill,
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
    position: 'relative',
  },
  divergingBar: {
    position: 'absolute',
    alignSelf: 'center',
  },
  floatingPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  xAxisRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
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
  },
  dayNumText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 14,
  },
  dayNameText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 13,
  },
});
