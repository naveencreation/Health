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

export interface DayStepData {
  dateStr: string;
  dayNum: number | string;
  dayName: string;
  steps: number;
  goalSteps: number;
  completionPct: number;
}

export interface StepCompletionCardProps {
  days: DayStepData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  stepGoal?: number;
  activeColor?: string;
  defaultChartType?: ChartType;
}

const CHART_HEIGHT = 185;
const Y_AXIS_WIDTH = 42;
const TOP_PAD = 14;
const BOTTOM_PAD = 10;
const USABLE_HEIGHT = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD; // 161px

export const StepCompletionCard: React.FC<StepCompletionCardProps> = ({
  days,
  selectedIndex,
  onSelectDay,
  stepGoal = 6000,
  activeColor = '#F97316',
  defaultChartType = 'bar',
}) => {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== canvasWidth) {
      setCanvasWidth(width);
    }
  };

  // Adaptive Y-Axis calculation (matching 7000 down to 1000 or custom)
  const { maxY, yTicks, stepGoalDisplay } = useMemo(() => {
    const goal = stepGoal && stepGoal > 0 ? stepGoal : 6000;
    const maxLogged = days.length > 0 ? Math.max(...days.map((d) => d.steps || 0)) : 0;
    const highest = Math.max(goal, maxLogged);

    let ceiling = 7000;
    let step = 1000;

    if (highest <= 3500) {
      ceiling = 4000;
      step = 500;
    } else if (highest <= 7000) {
      ceiling = 7000;
      step = 1000;
    } else if (highest <= 12000) {
      ceiling = 12000;
      step = 2000;
    } else {
      ceiling = Math.ceil(highest / 2000) * 2000;
      step = Math.round(ceiling / 6);
    }

    const ticks: number[] = [];
    const minTick = ceiling >= 7000 && step === 1000 ? 1000 : 0;
    for (let v = ceiling; v >= minTick; v -= step) {
      ticks.push(Math.round(v));
    }

    return { maxY: ceiling, yTicks: ticks, stepGoalDisplay: goal };
  }, [days, stepGoal]);

  const numDays = Math.max(1, days.length);
  const colWidth = canvasWidth > 0 ? canvasWidth / numDays : 0;
  // Chunky capsule bar width matching reference screenshot
  const barWidth = Math.min(34, Math.max(22, Math.round(colWidth * 0.62)));

  // Selected Day step data
  const selectedDay = days[selectedIndex] ?? days[0];
  const selectedSteps = selectedDay ? selectedDay.steps : 0;

  // Helper function to map step value to Y pixel position
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(maxY, val));
    return CHART_HEIGHT - BOTTOM_PAD - (clamped / maxY) * USABLE_HEIGHT;
  };

  const goalY = getY(stepGoalDisplay);

  // Calculate SVG line points for line chart mode
  const points = days.map((d, i) => {
    const x = (i + 0.5) * colWidth;
    const y = getY(d.steps);
    return { x, y, steps: d.steps };
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
      {/* 1. Card Header Row: Title & View Mode Toggle */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Step</Text>
        <ChartTypeToggle
          chartType={chartType}
          onChange={setChartType}
          activeColor={activeColor}
        />
      </View>

      {/* 2. Subheader Legend Row: [● Selected]  [--- Step Goal] */}
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
          <Text style={styles.legendText}>Step Goal</Text>
        </View>
      </View>

      {/* 3. Main Chart View (Y-Axis + Canvas) */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Column */}
        <View style={styles.yAxisColumn}>
          {yTicks.map((tick) => (
            <Text key={`tick_${tick}`} style={styles.yTickText}>
              {tick}
            </Text>
          ))}
        </View>

        {/* Canvas Area */}
        <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
          {/* SVG Overlay for Dashed Step Goal Line */}
          {canvasWidth > 0 && (
            <Svg
              width={canvasWidth}
              height={CHART_HEIGHT}
              style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
              pointerEvents="none"
            >
              <Line
                x1={0}
                y1={goalY}
                x2={canvasWidth}
                y2={goalY}
                stroke={activeColor}
                strokeWidth={1.5}
                strokeDasharray="6, 5"
              />
            </Svg>
          )}

          {chartType === 'bar' ? (
            /* Bar Chart Mode (Matching Image 2) */
            <Animated.View entering={FadeIn.duration(180)} style={styles.barColumnsRow}>
              {days.map((day, idx) => {
                const isSelected = idx === selectedIndex;
                const barHeight = day.steps <= 0
                  ? 8
                  : Math.max(12, (Math.min(day.steps, maxY) / maxY) * USABLE_HEIGHT);

                // Tooltip position directly above the selected bar
                const pinBottom = Math.min(CHART_HEIGHT - 38, barHeight + BOTTOM_PAD + 2);

                return (
                  <Pressable
                    key={`bar_day_${day.dateStr}_${idx}`}
                    style={styles.dayColTouchable}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${day.dayNum}: ${day.steps.toLocaleString()} steps`}
                  >
                    {/* Floating Tooltip Pin for Selected Bar */}
                    {isSelected && (
                      <View style={[styles.barPinContainer, { bottom: pinBottom }]}>
                        <ChartTooltipPin
                          valueText={selectedSteps.toLocaleString()}
                          unitText="steps"
                          activeColor={activeColor}
                        />
                      </View>
                    )}

                    {/* Rounded Top Bar */}
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
            /* Line / Area Chart Mode (Matching Image 3) */
            <Animated.View entering={FadeIn.duration(180)} style={styles.lineAreaContainer}>
              {canvasWidth > 0 && points.length > 0 && (
                <Svg width={canvasWidth} height={CHART_HEIGHT} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="stepAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={activeColor} stopOpacity="0.22" />
                      <Stop offset="0.65" stopColor={activeColor} stopOpacity="0.08" />
                      <Stop offset="1" stopColor={activeColor} stopOpacity="0" />
                    </LinearGradient>
                  </Defs>

                  {/* Gradient Area Fill */}
                  <Path d={areaPath} fill="url(#stepAreaGrad)" />

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
                      key={`node_${i}`}
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
                    valueText={selectedSteps.toLocaleString()}
                    unitText="steps"
                    activeColor={activeColor}
                  />
                </View>
              )}

              {/* Touch Overlay to Select Days in Line Mode */}
              <View style={styles.touchOverlayRow}>
                {days.map((day, idx) => (
                  <Pressable
                    key={`line_touch_${day.dateStr}_${idx}`}
                    style={styles.lineColTouch}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${day.dayNum}: ${day.steps.toLocaleString()} steps`}
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
                key={`x_label_${day.dateStr}_${idx}`}
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
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 19,
    color: '#0F172A',
    letterSpacing: -0.3,
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
});

export default StepCompletionCard;
