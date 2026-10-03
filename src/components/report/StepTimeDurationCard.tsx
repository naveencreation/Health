import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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

export interface DayTimeData {
  dateStr: string;
  dayNum: number | string;
  dayName: string;
  durationMinutes: number;
}

export interface StepTimeDurationCardProps {
  days: DayTimeData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  activeColor?: string;
  defaultChartType?: ChartType;
  periodDailyAvgMinutes?: number;
}

const CHART_HEIGHT = 175;
const Y_AXIS_WIDTH = 38;
const TOP_PAD = 14;
const BOTTOM_PAD = 10;
const USABLE_HEIGHT = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD; // 151px

export const StepTimeDurationCard: React.FC<StepTimeDurationCardProps> = ({
  days,
  selectedIndex,
  onSelectDay,
  activeColor = '#F97316',
  defaultChartType = 'bar',
  periodDailyAvgMinutes,
}) => {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== canvasWidth) {
      setCanvasWidth(width);
    }
  };

  // Calculate period daily average minutes
  const avgValue = useMemo(() => {
    if (typeof periodDailyAvgMinutes === 'number') {
      return Math.round(periodDailyAvgMinutes);
    }
    const count = Math.max(1, days.length);
    const sum = days.reduce((acc, d) => acc + (d.durationMinutes || 0), 0);
    return Math.round(sum / count);
  }, [days, periodDailyAvgMinutes]);

  // Format duration into readable "1h 24m" or "45m"
  const formatDurationDisplay = (mins: number) => {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${m}m`;
  };

  // Dynamic adaptive Y-axis bounds & ticks
  const { maxY, yTicks } = useMemo(() => {
    const maxVal = Math.max(0, ...days.map((d) => d.durationMinutes));
    let ceiling = 60;
    if (maxVal <= 30) ceiling = 30;
    else if (maxVal <= 60) ceiling = 60;
    else if (maxVal <= 90) ceiling = 90;
    else if (maxVal <= 120) ceiling = 120;
    else if (maxVal <= 180) ceiling = 180;
    else ceiling = Math.ceil(maxVal / 60) * 60;

    const step = ceiling / 5;
    const ticks = [ceiling, ceiling - step, ceiling - step * 2, ceiling - step * 3, ceiling - step * 4, 0].map(
      (v) => Math.round(v)
    );
    return { maxY: ceiling, yTicks: ticks };
  }, [days]);

  // Format tick labels (e.g. 2h, 1.5h, 60m, 30m, 0)
  const formatYTick = (mins: number) => {
    if (mins === 0) return '0';
    if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`;
    if (mins >= 60) return `${(mins / 60).toFixed(1)}h`;
    return `${mins}m`;
  };

  const numDays = Math.max(1, days.length);
  const colWidth = canvasWidth > 0 ? canvasWidth / numDays : 0;
  const barWidth = Math.min(34, Math.max(10, Math.round(colWidth * 0.62)));

  // Selected Day data
  const selectedDay = days[selectedIndex] ?? days[0];
  const selectedMinutes = selectedDay ? selectedDay.durationMinutes : 0;

  // Format pin text
  const getPinData = (mins: number) => {
    if (mins < 60) {
      return { valueText: `${mins}`, unitText: 'min' };
    }
    const hours = (mins / 60).toFixed(1);
    return {
      valueText: hours.endsWith('.0') ? hours.slice(0, -2) : hours,
      unitText: 'hr',
    };
  };

  // Helper function to map duration to Y pixel position
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(maxY, val));
    return CHART_HEIGHT - BOTTOM_PAD - (clamped / maxY) * USABLE_HEIGHT;
  };

  const avgY = getY(avgValue);

  // Calculate SVG line points for line chart mode
  const points = days.map((d, i) => {
    const x = (i + 0.5) * colWidth;
    const y = getY(d.durationMinutes);
    return { x, y, val: d.durationMinutes };
  });

  const linePath = points.length > 0
    ? points.reduce(
        (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
        ''
      )
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${CHART_HEIGHT - BOTTOM_PAD} L ${points[0].x} ${CHART_HEIGHT - BOTTOM_PAD} Z`
    : '';

  const selectedPoint = points[selectedIndex];
  const selectedPin = getPinData(selectedMinutes);

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header: Title and Chart Type Toggle */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Active Walking Time</Text>
        <ChartTypeToggle
          chartType={chartType}
          onChange={setChartType}
          activeColor={activeColor}
        />
      </View>

      {/* 2. Subheader Legend Row: [● Selected]  [--- Daily Avg (Xh Ym)] */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: activeColor }]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <Svg width={22} height={10} viewBox="0 0 22 10" style={styles.legendDashSvg}>
            <Line
              x1={0}
              y1={5}
              x2={22}
              y2={5}
              stroke={activeColor}
              strokeWidth={1.8}
              strokeDasharray="4, 3"
            />
          </Svg>
          <Text style={styles.legendText}>
            Daily Avg ({formatDurationDisplay(avgValue)})
          </Text>
        </View>
      </View>

      {/* 3. Main Chart View (Y-Axis + Canvas) */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Column */}
        <View style={styles.yAxisColumn}>
          {yTicks.map((tick, idx) => (
            <Text key={`time_tick_${tick}_${idx}`} style={styles.yTickText}>
              {formatYTick(tick)}
            </Text>
          ))}
        </View>

        {/* Canvas Area */}
        <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
          {/* SVG Overlay for Dashed Daily Average Benchmark Line */}
          {canvasWidth > 0 && (
            <Svg
              width={canvasWidth}
              height={CHART_HEIGHT}
              style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
              pointerEvents="none"
            >
              <Line
                x1={0}
                y1={avgY}
                x2={canvasWidth}
                y2={avgY}
                stroke={activeColor}
                strokeWidth={1.5}
                strokeDasharray="6, 5"
              />
            </Svg>
          )}

          {chartType === 'bar' ? (
            /* Bar Chart Mode */
            <Animated.View entering={FadeIn.duration(180)} style={styles.barColumnsRow}>
              {days.map((day, idx) => {
                const isSelected = idx === selectedIndex;
                const barHeight = day.durationMinutes <= 0
                  ? 8
                  : Math.max(12, (Math.min(day.durationMinutes, maxY) / maxY) * USABLE_HEIGHT);

                const pinBottom = Math.min(CHART_HEIGHT - 38, barHeight + BOTTOM_PAD + 2);
                const dayPin = getPinData(day.durationMinutes);

                return (
                  <Pressable
                    key={`bar_time_${day.dateStr}_${idx}`}
                    style={styles.dayColTouchable}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${day.dayNum}: ${formatDurationDisplay(day.durationMinutes)}`}
                  >
                    {/* Floating Tooltip Pin for Selected Bar */}
                    {isSelected && (
                      <View style={[styles.barPinContainer, { bottom: pinBottom }]}>
                        <ChartTooltipPin
                          valueText={dayPin.valueText}
                          unitText={dayPin.unitText}
                          activeColor={activeColor}
                        />
                      </View>
                    )}

                    {/* Rounded Top Capsule Bar */}
                    <View
                      style={[
                        styles.barPill,
                        {
                          width: barWidth,
                          height: barHeight,
                          backgroundColor: isSelected ? activeColor : '#FED7AA',
                          borderTopLeftRadius: barWidth / 2,
                          borderTopRightRadius: barWidth / 2,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : (
            /* Line / Area Chart Mode */
            <Animated.View entering={FadeIn.duration(180)} style={styles.lineAreaContainer}>
              {canvasWidth > 0 && points.length > 0 && (
                <Svg width={canvasWidth} height={CHART_HEIGHT} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="timeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={activeColor} stopOpacity="0.22" />
                      <Stop offset="0.65" stopColor={activeColor} stopOpacity="0.08" />
                      <Stop offset="1" stopColor={activeColor} stopOpacity="0" />
                    </LinearGradient>
                  </Defs>

                  {/* Gradient Area Fill */}
                  <Path d={areaPath} fill="url(#timeAreaGrad)" />

                  {/* Connecting Line */}
                  <Path
                    d={linePath}
                    stroke={activeColor}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Nodes on Line */}
                  {points.map((p, i) => (
                    <Circle
                      key={`time_node_${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={i === selectedIndex ? 6.5 : 5}
                      fill={i === selectedIndex ? activeColor : '#FFFFFF'}
                      stroke={activeColor}
                      strokeWidth={i === selectedIndex ? 0 : 3.5}
                    />
                  ))}
                </Svg>
              )}

              {/* Floating Tooltip Pin for Selected Line Node */}
              {selectedPoint && (
                <View
                  style={[
                    styles.linePinContainer,
                    {
                      left: Math.max(0, Math.min(canvasWidth - 42, selectedPoint.x - 21)),
                      top: Math.max(0, selectedPoint.y - 44),
                    },
                  ]}
                >
                  <ChartTooltipPin
                    valueText={selectedPin.valueText}
                    unitText={selectedPin.unitText}
                    activeColor={activeColor}
                  />
                </View>
              )}

              {/* Touch Overlay to Select Days in Line Mode */}
              <View style={styles.touchOverlayRow}>
                {days.map((day, idx) => (
                  <Pressable
                    key={`line_time_touch_${day.dateStr}_${idx}`}
                    style={styles.lineColTouch}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${day.dayNum}: ${formatDurationDisplay(day.durationMinutes)}`}
                  />
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      {/* 4. Bottom X-Axis Row (Day Numbers) */}
      <View style={styles.xAxisRow}>
        <View style={{ width: Y_AXIS_WIDTH }} />
        <View style={styles.xAxisLabelsContainer}>
          {days.map((day, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Pressable
                key={`x_time_label_${day.dateStr}_${idx}`}
                style={styles.xLabelCol}
                onPress={() => onSelectDay(idx)}
                hitSlop={{ top: 6, bottom: 8, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.xLabelText,
                    days.length > 7 && { fontSize: 10 },
                    isSelected && styles.xLabelTextSelected,
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
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDashSvg: {
    marginRight: -2,
  },
  legendText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
    position: 'relative',
  },
  yAxisColumn: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    paddingTop: TOP_PAD - 7,
    paddingBottom: BOTTOM_PAD - 7,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  yTickText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 14,
  },
  canvasContainer: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  barColumnsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    paddingBottom: BOTTOM_PAD,
  },
  dayColTouchable: {
    flex: 1,
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  barPill: {
    minHeight: 8,
  },
  lineAreaContainer: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  linePinContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  touchOverlayRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 20,
  },
  lineColTouch: {
    flex: 1,
    height: '100%',
  },
  xAxisRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  xAxisLabelsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  xLabelCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  xLabelText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#94A3B8',
  },
  xLabelTextSelected: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
});

export default StepTimeDurationCard;
