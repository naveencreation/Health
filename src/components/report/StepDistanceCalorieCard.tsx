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
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { ChartTypeToggle, ChartType } from './ChartTypeToggle';
import { ChartTooltipPin } from './ChartTooltipPin';

export type MetricMode = 'distance' | 'calories';

export interface DayMetricData {
  dateStr: string;
  dayNum: number | string;
  dayName: string;
  steps: number;
  distanceKm: number;
  calories: number;
}

export interface StepDistanceCalorieCardProps {
  days: DayMetricData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  activeColor?: string;
  defaultChartType?: ChartType;
  defaultMetricMode?: MetricMode;
  periodTotalDistance?: number;
  periodTotalCalories?: number;
  periodAvgDistance?: number;
  periodAvgCalories?: number;
}

const CHART_HEIGHT = 175;
const Y_AXIS_WIDTH = 42;
const TOP_PAD = 14;
const BOTTOM_PAD = 10;
const USABLE_HEIGHT = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD; // 151px

export const StepDistanceCalorieCard: React.FC<StepDistanceCalorieCardProps> = ({
  days,
  selectedIndex,
  onSelectDay,
  activeColor = '#F97316',
  defaultChartType = 'bar',
  defaultMetricMode = 'distance',
  periodTotalDistance,
  periodTotalCalories,
  periodAvgDistance,
  periodAvgCalories,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>(defaultMetricMode);
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

  const isDistance = metricMode === 'distance';

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== canvasWidth) {
      setCanvasWidth(width);
    }
  };

  // Extract current values based on active metric mode
  const currentValues = useMemo(() => {
    return days.map((d) => (isDistance ? d.distanceKm : d.calories));
  }, [days, isDistance]);

  // Aggregate totals and period averages
  const { totalDistance, totalCalories, avgValue, maxValue } = useMemo(() => {
    const count = Math.max(1, days.length);
    const computedTotDist = days.reduce((sum, d) => sum + (d.distanceKm || 0), 0);
    const computedTotCal = days.reduce((sum, d) => sum + (d.calories || 0), 0);

    const finalTotDist = periodTotalDistance ?? Math.round(computedTotDist * 10) / 10;
    const finalTotCal = periodTotalCalories ?? Math.round(computedTotCal);

    const finalAvgDist = periodAvgDistance ?? Math.round((finalTotDist / count) * 10) / 10;
    const finalAvgCal = periodAvgCalories ?? Math.round(finalTotCal / count);

    const avg = isDistance ? finalAvgDist : finalAvgCal;
    const maxVal = Math.max(0, ...currentValues);

    return {
      totalDistance: finalTotDist,
      totalCalories: finalTotCal,
      avgValue: avg,
      maxValue: maxVal,
    };
  }, [
    days,
    isDistance,
    currentValues,
    periodTotalDistance,
    periodTotalCalories,
    periodAvgDistance,
    periodAvgCalories,
  ]);

  // Calculate dynamic adaptive Y-axis bounds & ticks
  const { maxY, yTicks } = useMemo(() => {
    if (isDistance) {
      // Distance bounds in km (e.g. 10.0, 8.0, 6.0, 4.0, 2.0, 0.0 or adaptive)
      let ceiling = 8;
      if (maxValue <= 4) ceiling = 5;
      else if (maxValue <= 8) ceiling = 10;
      else if (maxValue <= 15) ceiling = 16;
      else ceiling = Math.ceil(maxValue / 5) * 5;

      const step = ceiling / 5;
      const ticks = [ceiling, ceiling - step, ceiling - step * 2, ceiling - step * 3, ceiling - step * 4, 0].map(
        (v) => Math.round(v * 10) / 10
      );
      return { maxY: ceiling, yTicks: ticks };
    } else {
      // Calorie bounds in kcal (e.g. 500, 400, 300, 200, 100, 0 or adaptive)
      let ceiling = 400;
      if (maxValue <= 250) ceiling = 300;
      else if (maxValue <= 500) ceiling = 600;
      else if (maxValue <= 800) ceiling = 900;
      else ceiling = Math.ceil(maxValue / 200) * 200;

      const step = ceiling / 5;
      const ticks = [ceiling, ceiling - step, ceiling - step * 2, ceiling - step * 3, ceiling - step * 4, 0].map(
        (v) => Math.round(v)
      );
      return { maxY: ceiling, yTicks: ticks };
    }
  }, [isDistance, maxValue]);

  const numDays = Math.max(1, days.length);
  const colWidth = canvasWidth > 0 ? canvasWidth / numDays : 0;
  const barWidth = Math.min(34, Math.max(22, Math.round(colWidth * 0.62)));

  // Selected Day data
  const selectedDay = days[selectedIndex] ?? days[0];
  const selectedValue = selectedDay ? (isDistance ? selectedDay.distanceKm : selectedDay.calories) : 0;
  const selectedUnit = isDistance ? 'km' : 'kcal';

  // Helper function to map metric value to Y pixel position
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(maxY, val));
    return CHART_HEIGHT - BOTTOM_PAD - (clamped / maxY) * USABLE_HEIGHT;
  };

  const avgY = getY(avgValue);

  // Calculate SVG line points for line chart mode
  const points = days.map((d, i) => {
    const val = isDistance ? d.distanceKm : d.calories;
    const x = (i + 0.5) * colWidth;
    const y = getY(val);
    return { x, y, val };
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

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header: Title, Metric Segmented Switch, and Chart Type Toggle */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Distance & Calories</Text>
        <ChartTypeToggle
          chartType={chartType}
          onChange={setChartType}
          activeColor={activeColor}
        />
      </View>

      {/* Metric Mode Toggle Tabs (Distance | Calories) */}
      <View style={styles.modeToggleRow}>
        <Pressable
          style={[styles.modeTab, isDistance && styles.modeTabActive]}
          onPress={() => setMetricMode('distance')}
          accessibilityRole="button"
          accessibilityLabel="Distance mode"
        >
          <Ionicons
            name="location-sharp"
            size={14}
            color={isDistance ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.modeTabText, isDistance && styles.modeTabTextActive]}>
            Distance (km)
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modeTab, !isDistance && styles.modeTabActive]}
          onPress={() => setMetricMode('calories')}
          accessibilityRole="button"
          accessibilityLabel="Calories mode"
        >
          <Ionicons
            name="flame"
            size={14}
            color={!isDistance ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.modeTabText, !isDistance && styles.modeTabTextActive]}>
            Calories (kcal)
          </Text>
        </Pressable>
      </View>

      {/* 2. Subheader Legend Row: [● Selected]  [--- Daily Avg] */}
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
            Daily Avg ({avgValue} {selectedUnit})
          </Text>
        </View>
      </View>

      {/* 3. Main Chart View (Y-Axis + Canvas) */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Column */}
        <View style={styles.yAxisColumn}>
          {yTicks.map((tick, idx) => (
            <Text key={`tick_${tick}_${idx}`} style={styles.yTickText}>
              {tick}
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
                const val = isDistance ? day.distanceKm : day.calories;
                const barHeight = val <= 0
                  ? 8
                  : Math.max(12, (Math.min(val, maxY) / maxY) * USABLE_HEIGHT);

                const pinBottom = Math.min(CHART_HEIGHT - 38, barHeight + BOTTOM_PAD + 2);

                return (
                  <Pressable
                    key={`bar_metric_${day.dateStr}_${idx}`}
                    style={styles.dayColTouchable}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${day.dayNum}: ${val} ${selectedUnit}`}
                  >
                    {/* Floating Tooltip Pin for Selected Bar */}
                    {isSelected && (
                      <View style={[styles.barPinContainer, { bottom: pinBottom }]}>
                        <ChartTooltipPin
                          valueText={selectedValue.toString()}
                          unitText={selectedUnit}
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
                    <LinearGradient id="metricAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={activeColor} stopOpacity="0.22" />
                      <Stop offset="0.65" stopColor={activeColor} stopOpacity="0.08" />
                      <Stop offset="1" stopColor={activeColor} stopOpacity="0" />
                    </LinearGradient>
                  </Defs>

                  {/* Gradient Area Fill */}
                  <Path d={areaPath} fill="url(#metricAreaGrad)" />

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
                      key={`metric_node_${i}`}
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
                    valueText={selectedValue.toString()}
                    unitText={selectedUnit}
                    activeColor={activeColor}
                  />
                </View>
              )}

              {/* Touch Overlay to Select Days in Line Mode */}
              <View style={styles.touchOverlayRow}>
                {days.map((day, idx) => {
                  const val = isDistance ? day.distanceKm : day.calories;
                  return (
                    <Pressable
                      key={`line_metric_touch_${day.dateStr}_${idx}`}
                      style={styles.lineColTouch}
                      onPress={() => onSelectDay(idx)}
                      accessibilityRole="button"
                      accessibilityLabel={`Day ${day.dayNum}: ${val} ${selectedUnit}`}
                    />
                  );
                })}
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
                key={`x_metric_label_${day.dateStr}_${idx}`}
                style={styles.xLabelCol}
                onPress={() => onSelectDay(idx)}
                hitSlop={{ top: 6, bottom: 8, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.xLabelText,
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

      {/* 5. Period Total Summary Tiles: Distance & Calories */}
      <View style={styles.summaryFooterRow}>
        {/* Left Tile: Distance */}
        <View style={styles.summaryTile}>
          <View style={styles.summaryIconBox}>
            <Ionicons name="location-outline" size={18} color="#EA580C" />
          </View>
          <View style={styles.summaryTextBox}>
            <Text style={styles.summaryLabel}>Total Distance</Text>
            <Text style={styles.summaryValue}>{totalDistance} km</Text>
            <Text style={styles.summarySub}>
              ~{Math.round((totalDistance / numDays) * 10) / 10} km/day
            </Text>
          </View>
        </View>

        {/* Right Tile: Active Calories */}
        <View style={styles.summaryTile}>
          <View style={styles.summaryIconBox}>
            <Ionicons name="flame-outline" size={18} color="#EA580C" />
          </View>
          <View style={styles.summaryTextBox}>
            <Text style={styles.summaryLabel}>Active Calories</Text>
            <Text style={styles.summaryValue}>{totalCalories.toLocaleString()} kcal</Text>
            <Text style={styles.summarySub}>
              ~{Math.round(totalCalories / numDays)} kcal/day
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#F97316',
    ...Platform.select({
      ios: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modeTabText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
  modeTabTextActive: {
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
    paddingLeft: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendDashSvg: {
    marginTop: 1,
  },
  legendText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxisColumn: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    paddingTop: TOP_PAD - 7,
    paddingBottom: BOTTOM_PAD - 7,
    alignItems: 'flex-start',
  },
  yTickText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'left',
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
    zIndex: 10,
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
    alignSelf: 'center',
    zIndex: 30,
  },
  barPill: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  lineAreaContainer: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
    zIndex: 10,
  },
  linePinContainer: {
    position: 'absolute',
    zIndex: 30,
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
    height: CHART_HEIGHT,
  },
  xAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  xAxisLabelsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabelCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLabelText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
  xLabelTextSelected: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
  },
  summaryFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  summaryTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.04)',
    gap: 10,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextBox: {
    flex: 1,
  },
  summaryLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  summaryValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  summarySub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
});

export default StepDistanceCalorieCard;
