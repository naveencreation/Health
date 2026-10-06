import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Fonts } from '@/theme/typography';
import { ChartTypeToggle, ChartType } from './ChartTypeToggle';
import { ChartTooltipPin } from './ChartTooltipPin';

export interface DayHydrateData {
  dateStr: string;
  dayNum: number | string;
  dayName: string;
  intakeMl: number;
}

interface HydrateVolumeCardProps {
  days: DayHydrateData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  activeColor?: string;
  defaultChartType?: ChartType;
}

const CHART_HEIGHT = 160;
const Y_AXIS_WIDTH = 38;
const TOP_PAD = 10;
const BOTTOM_PAD = 8;
const USABLE_HEIGHT = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD; // 142px

export const HydrateVolumeCard: React.FC<HydrateVolumeCardProps> = ({
  days,
  selectedIndex,
  onSelectDay,
  activeColor = '#0284C7',
  defaultChartType = 'line',
}) => {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== canvasWidth) {
      setCanvasWidth(width);
    }
  };

  const numDays = Math.max(1, days.length);
  const colWidth = canvasWidth > 0 ? canvasWidth / numDays : 0;
  // Chunky capsule bar width responsive to screen width
  const barWidth = Math.min(32, Math.max(22, Math.round(colWidth * 0.62)));

  // Calculate dynamic max tick based on peak intake in the period (min 2500 mL)
  const maxIntake = Math.max(0, ...days.map(d => d.intakeMl));
  const maxTickMl = Math.max(2500, Math.ceil(maxIntake / 500) * 500);
  const stepMl = maxTickMl / 5;

  const yTicks = useMemo(
    () => [
      maxTickMl,
      maxTickMl - stepMl,
      maxTickMl - stepMl * 2,
      maxTickMl - stepMl * 3,
      maxTickMl - stepMl * 4,
      0,
    ],
    [maxTickMl, stepMl]
  );

  // Selected Day data
  const selectedDay = days[selectedIndex] ?? days[0];
  const selectedMl = selectedDay ? selectedDay.intakeMl : 0;

  // Calculate SVG line points
  const points = days.map((d, i) => {
    const x = (i + 0.5) * colWidth;
    const clampedMl = Math.max(0, Math.min(maxTickMl, d.intakeMl));
    const y = CHART_HEIGHT - BOTTOM_PAD - (clampedMl / maxTickMl) * USABLE_HEIGHT;
    return { x, y, ml: clampedMl };
  });

  const linePath =
    points.length > 0
      ? points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')
      : '';

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${CHART_HEIGHT - BOTTOM_PAD} L ${points[0].x} ${CHART_HEIGHT - BOTTOM_PAD} Z`
      : '';

  const selectedPoint = points[selectedIndex];

  const formatYTick = (ml: number) => {
    if (ml === 0) return '0%'; // Matches template screenshot
    const liters = ml / 1000;
    return Number.isInteger(liters) ? `${liters}L` : `${liters.toFixed(1)}L`;
  };

  return (
    <View style={styles.cardContainer}>
      {/* 1. Card Header Row */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Hydrate</Text>
        <ChartTypeToggle chartType={chartType} onChange={setChartType} activeColor={activeColor} />
      </View>
      <View style={styles.headerDivider} />

      {/* 2. Main Chart View (Y-Axis + Canvas) */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Column */}
        <View style={styles.yAxisColumn}>
          {yTicks.map((tick, idx) => (
            <Text key={`hydrate_tick_${idx}_${tick}`} style={styles.yTickText}>
              {formatYTick(tick)}
            </Text>
          ))}
        </View>

        {/* Canvas Area */}
        <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
          {/* Subtle 0% Baseline */}
          <View style={[styles.chartBaseline, { bottom: BOTTOM_PAD }]} />

          {chartType === 'line' ? (
            /* Line Chart Mode (Default for Hydrate in Template) */
            <Animated.View entering={FadeIn.duration(180)} style={styles.lineAreaContainer}>
              {canvasWidth > 0 && points.length > 0 && (
                <Svg width={canvasWidth} height={CHART_HEIGHT} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="hydrateAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={activeColor} stopOpacity="0.25" />
                      <Stop offset="0.7" stopColor={activeColor} stopOpacity="0.06" />
                      <Stop offset="1" stopColor={activeColor} stopOpacity="0" />
                    </LinearGradient>
                  </Defs>

                  {/* Gradient Area Fill */}
                  <Path d={areaPath} fill="url(#hydrateAreaGrad)" />

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
                      key={`node_hydrate_${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={i === selectedIndex ? 5.5 : 4}
                      fill="#FFFFFF"
                      stroke={activeColor}
                      strokeWidth={i === selectedIndex ? 3 : 2.5}
                    />
                  ))}
                </Svg>
              )}

              {/* Floating Pin for Selected Line Node (e.g. 1750 mL) */}
              {selectedPoint && (
                <View
                  style={[
                    styles.linePinContainer,
                    {
                      left: Math.max(0, Math.min(canvasWidth - 38, selectedPoint.x - 19)),
                      top: Math.max(0, selectedPoint.y - 42),
                    },
                  ]}
                >
                  <ChartTooltipPin
                    valueText={`${selectedMl}`}
                    unitText="mL"
                    activeColor={activeColor}
                  />
                </View>
              )}

              {/* Touch Overlay to Select Days in Line Mode */}
              <View style={styles.touchOverlayRow}>
                {days.map((day, idx) => (
                  <Pressable
                    key={`hydrate_touch_${day.dateStr}_${idx}`}
                    style={styles.lineColTouch}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${day.dayNum}: ${day.intakeMl} mL`}
                  />
                ))}
              </View>
            </Animated.View>
          ) : (
            /* Bar Chart Mode */
            <Animated.View entering={FadeIn.duration(180)} style={styles.barColumnsRow}>
              {days.map((day, idx) => {
                const isSelected = idx === selectedIndex;
                const clampedMl = Math.max(0, Math.min(maxTickMl, day.intakeMl));
                const barHeight =
                  clampedMl === 0 ? 10 : Math.max(14, (clampedMl / maxTickMl) * USABLE_HEIGHT);

                // Position the floating pin above the selected bar
                const pinBottom = Math.min(CHART_HEIGHT - 38, barHeight + BOTTOM_PAD - 2);

                return (
                  <Pressable
                    key={`bar_hydrate_day_${day.dateStr}_${idx}`}
                    style={styles.dayColTouchable}
                    onPress={() => onSelectDay(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${day.dayNum}: ${day.intakeMl} mL`}
                  >
                    {/* Floating Pin for Selected Bar */}
                    {isSelected && (
                      <View style={[styles.barPinContainer, { bottom: pinBottom }]}>
                        <ChartTooltipPin
                          valueText={`${selectedMl}`}
                          unitText="mL"
                          activeColor={activeColor}
                        />
                      </View>
                    )}

                    {/* Capsule Pill Bar */}
                    <View
                      style={[
                        styles.capsuleBar,
                        {
                          width: barWidth,
                          height: barHeight,
                          backgroundColor: isSelected ? activeColor : '#90C5FE',
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </Animated.View>
          )}
        </View>
      </View>

      {/* 3. Bottom X-Axis Row (Day Numbers) */}
      <View style={styles.xAxisRow}>
        <View style={{ width: Y_AXIS_WIDTH }} />
        <View style={styles.xAxisLabelsContainer}>
          {days.map((day, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Pressable
                key={`x_hydrate_label_${day.dateStr}_${idx}`}
                style={styles.xLabelCol}
                onPress={() => onSelectDay(idx)}
                hitSlop={{ top: 6, bottom: 8, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.xLabelText,
                    isSelected && [styles.xLabelTextSelected, { color: activeColor }],
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxisColumn: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingVertical: 2,
    alignItems: 'flex-end',
  },
  yTickText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 13,
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
  // Bar Chart Mode Styles
  barColumnsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dayColTouchable: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  capsuleBar: {
    borderRadius: 999,
    alignSelf: 'center',
  },
  barPinContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
  },
  // Line Chart Mode Styles
  lineAreaContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'visible',
  },
  linePinContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  touchOverlayRow: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  lineColTouch: {
    flex: 1,
    height: '100%',
  },
  // X-Axis Row
  xAxisRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  xAxisLabelsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  xLabelCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLabelText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  xLabelTextSelected: {
    fontFamily: Fonts.urbanist.bold,
  },
});
