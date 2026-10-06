import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  LayoutAnimation,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { Fonts } from '@/theme/typography';
import { ChartTypeToggle, ChartType } from '@/components/report/ChartTypeToggle';
import { ChartTooltipPin } from '@/components/report/ChartTooltipPin';

export type MacroType = 'protein' | 'carbs' | 'fat' | 'fiber';

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface DayMacroRatioData {
  dateStr: string;
  dayNum: number | string;
  dayName: string;
  carbsPct?: number;
  proteinPct?: number;
  fatPct?: number;
  carbsGrams?: number;
  proteinGrams?: number;
  fatGrams?: number;
  fiberGrams?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  fiber?: number;
}

export interface MacroDistributionCardProps {
  days: DayMacroRatioData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  targets?: Partial<MacroTargets>;
  defaultMacro?: MacroType;
  defaultChartType?: ChartType;
}

const CHART_HEIGHT = 210;
const Y_AXIS_WIDTH = 42;
const TOP_PAD = 54; // Headroom for floating teardrop pin
const BOTTOM_PAD = 30;
const BASELINE_Y = CHART_HEIGHT - BOTTOM_PAD;
const USABLE_HEIGHT = BASELINE_Y - TOP_PAD;
const BAR_CORNER_RADIUS = 10;

interface MacroMeta {
  key: MacroType;
  label: string;
  color: string;
  targetKey: keyof MacroTargets;
  defaultTarget: number;
  unit: string;
}

const MACRO_CONFIGS: Record<MacroType, MacroMeta> = {
  protein: {
    key: 'protein',
    label: 'Protein',
    color: '#F97316', // Energetic Coral / Orange
    targetKey: 'protein',
    defaultTarget: 140,
    unit: 'g',
  },
  carbs: {
    key: 'carbs',
    label: 'Carbs',
    color: '#3B82F6', // Electric Cerulean Blue
    targetKey: 'carbs',
    defaultTarget: 220,
    unit: 'g',
  },
  fat: {
    key: 'fat',
    label: 'Fat',
    color: '#EC4899', // Rose Pink
    targetKey: 'fat',
    defaultTarget: 65,
    unit: 'g',
  },
  fiber: {
    key: 'fiber',
    label: 'Fiber',
    color: '#10B981', // Emerald Green
    targetKey: 'fiber',
    defaultTarget: 30,
    unit: 'g',
  },
};

const triggerLayoutAnim = () => {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
};

/**
 * Builds an SVG path with continuous rounded top corners (Q-arc)
 * and flat bottom edges. Immune to arc pinching on short bars.
 */
function buildBarPath(
  barX: number,
  topY: number,
  width: number,
  height: number,
  r: number
): string {
  const right = barX + width;
  const bottom = topY + height;
  return (
    `M ${barX} ${bottom} ` +
    `L ${barX} ${topY + r} ` +
    `Q ${barX} ${topY} ${barX + r} ${topY} ` +
    `L ${right - r} ${topY} ` +
    `Q ${right} ${topY} ${right} ${topY + r} ` +
    `L ${right} ${bottom} Z`
  );
}

/**
 * Formats a macronutrient value ensuring there is at most one digit after the decimal point.
 * e.g., 24.67 -> "24.7", 12.0 -> "12", 0 -> "0"
 */
export function formatMacroValue(val: number): string {
  if (typeof val !== 'number' || isNaN(val)) return '0';
  const rounded = Math.round(val * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

function getDayMacroGrams(day: DayMacroRatioData, macro: MacroType): number {
  let val = 0;
  if (macro === 'protein') val = day.protein ?? day.proteinGrams ?? 0;
  else if (macro === 'carbs') val = day.carbs ?? day.carbsGrams ?? 0;
  else if (macro === 'fat') val = day.fat ?? day.fatGrams ?? 0;
  else if (macro === 'fiber') val = day.fiber ?? day.fiberGrams ?? 0;
  return Math.round(val * 10) / 10;
}

export const MacroDistributionCard: React.FC<MacroDistributionCardProps> = ({
  days,
  selectedIndex,
  onSelectDay,
  targets = {},
  defaultMacro = 'protein',
  defaultChartType = 'bar',
}) => {
  const [selectedMacro, setSelectedMacro] = useState<MacroType>(defaultMacro);
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState<number>(300);

  const activeConfig = MACRO_CONFIGS[selectedMacro];
  const activeColor = activeConfig.color;
  const currentGoal = targets[activeConfig.targetKey] ?? activeConfig.defaultTarget;

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

  const handleSelectMacro = (macroKey: MacroType) => {
    triggerLayoutAnim();
    setSelectedMacro(macroKey);
    setDropdownOpen(false);
  };

  // Today reference date string for distinguishing future days
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Adaptive Y-Axis Scale based on goal and max logged grams
  const { maxY, yTicks } = useMemo<{ maxY: number; yTicks: number[] }>(() => {
    const maxLogged =
      days.length > 0 ? Math.max(...days.map(d => getDayMacroGrams(d, selectedMacro))) : 0;
    const highest = Math.max(currentGoal, maxLogged);

    let ceiling = 200;
    let step = 50;

    if (highest <= 30) {
      ceiling = 30;
      step = 10;
    } else if (highest <= 50) {
      ceiling = 50;
      step = 10;
    } else if (highest <= 80) {
      ceiling = 80;
      step = 20;
    } else if (highest <= 120) {
      ceiling = 120;
      step = 30;
    } else if (highest <= 160) {
      ceiling = 160;
      step = 40;
    } else if (highest <= 200) {
      ceiling = 200;
      step = 50;
    } else if (highest <= 300) {
      ceiling = 300;
      step = 50;
    } else {
      ceiling = Math.ceil(highest / 50) * 50;
      step = Math.round(ceiling / 5);
    }

    const ticks: number[] = [];
    for (let v = step; v <= ceiling; v += step) {
      ticks.push(v);
    }
    return { maxY: ceiling, yTicks: ticks };
  }, [days, selectedMacro, currentGoal]);

  const safeIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, days.length - 1));

  // Check if entire period has no logged grams for this macro
  const hasAnyGrams = useMemo(() => {
    return days.some(d => getDayMacroGrams(d, selectedMacro) > 0);
  }, [days, selectedMacro]);

  // Coordinates for each day
  const chartCoordinates = useMemo(() => {
    if (canvasWidth <= 0 || days.length === 0) return [];
    const count = days.length;
    const colWidth = canvasWidth / count;

    return days.map((day, idx) => {
      const x = idx * colWidth + colWidth / 2;
      const grams = getDayMacroGrams(day, selectedMacro);
      const isZero = grams === 0;
      const isFuture = Boolean(day.dateStr && day.dateStr > todayStr);
      const ratio = Math.min(1, Math.max(0, grams / maxY));

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
        grams,
        isZero,
        isFuture,
        dayNum: day.dayNum,
      };
    });
  }, [canvasWidth, days, selectedMacro, maxY, todayStr]);

  // Goal Line Y position
  const goalY = useMemo(() => {
    const ratio = Math.min(1, Math.max(0, currentGoal / maxY));
    return TOP_PAD + (1 - ratio) * USABLE_HEIGHT;
  }, [currentGoal, maxY]);

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
      {/* Invisible dismiss backdrop to close dropdown when tapping outside */}
      {dropdownOpen && (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 900 }]}
          onPress={() => setDropdownOpen(false)}
        />
      )}

      {/* 1. Header: Title + Dropdown Selector + Squircle Toggle */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Nutrition ({activeConfig.unit})</Text>

        <View style={styles.headerRightControls}>
          {/* Macronutrient Dropdown Trigger & Floating Anchored Menu */}
          <View style={styles.dropdownAnchorWrap}>
            <Pressable
              style={[styles.dropdownTrigger, dropdownOpen && styles.dropdownTriggerActive]}
              onPress={() => {
                triggerLayoutAnim();
                setDropdownOpen(!dropdownOpen);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select Macronutrient. Currently selected: ${activeConfig.label}`}
            >
              <View style={[styles.macroPillDot, { backgroundColor: activeColor }]} />
              <Text style={styles.dropdownTriggerText}>{activeConfig.label}</Text>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <Path
                  d={dropdownOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                  stroke="#475569"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>

            {/* Anchored Floating Dropdown Menu (Drops down directly below the pill) */}
            {dropdownOpen && (
              <View style={styles.anchoredDropdownMenu}>
                {(['protein', 'carbs', 'fat', 'fiber'] as MacroType[]).map(macroKey => {
                  const item = MACRO_CONFIGS[macroKey];
                  const isCurrent = macroKey === selectedMacro;
                  const targetVal = targets[item.targetKey] ?? item.defaultTarget;
                  return (
                    <Pressable
                      key={macroKey}
                      style={[styles.dropdownItemRow, isCurrent && styles.dropdownItemRowActive]}
                      onPress={() => handleSelectMacro(macroKey)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${item.label}`}
                    >
                      <View style={styles.dropdownItemLeft}>
                        <View style={[styles.dropdownItemDot, { backgroundColor: item.color }]} />
                        <View>
                          <Text
                            style={[
                              styles.dropdownItemLabel,
                              isCurrent && styles.dropdownItemLabelActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text style={styles.dropdownItemSub}>
                            Goal: {formatMacroValue(targetVal)}g
                          </Text>
                        </View>
                      </View>

                      {isCurrent && (
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M20 6L9 17l-5-5"
                            stroke={item.color}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Squircle Bar / Line Chart Toggle */}
          <ChartTypeToggle
            chartType={chartType}
            onChange={handleToggleChartType}
            activeColor={activeColor}
            activeIconColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Subtle Hairline Divider */}
      <View style={styles.headerDivider} />

      {/* 2. Legend Row: [● Selected]  [--- Macro Goal (Xg)] */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: activeColor }]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.dashedGoalLine, { borderColor: activeColor }]} />
          <Text style={styles.legendText}>
            {activeConfig.label} Goal ({formatMacroValue(currentGoal)}g)
          </Text>
        </View>
      </View>

      {/* 3. Main Chart Surface */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Column */}
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
                <LinearGradient id={`macroGrad_${selectedMacro}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={activeColor} stopOpacity="0.28" />
                  <Stop offset="1" stopColor={activeColor} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Goal Reference Line (Horizontal Dashed placed behind bars) */}
              <Line
                x1={0}
                y1={goalY}
                x2={canvasWidth}
                y2={goalY}
                stroke={activeColor}
                strokeOpacity={0.65}
                strokeWidth={1.8}
                strokeDasharray="8, 6"
              />

              {/* Baseline Reference Line */}
              <Line
                x1={0}
                y1={BASELINE_Y}
                x2={canvasWidth}
                y2={BASELINE_Y}
                stroke="rgba(15, 23, 42, 0.07)"
                strokeWidth={1}
              />

              {/* BAR CHART MODE */}
              {chartType === 'bar' &&
                chartCoordinates.map((coord, idx) => {
                  const isSelected = idx === safeIndex;
                  const barPath = buildBarPath(
                    coord.barX,
                    coord.topY,
                    coord.barWidth,
                    coord.barHeight,
                    Math.min(BAR_CORNER_RADIUS, coord.barHeight / 2)
                  );
                  return (
                    <Path
                      key={`bar_${idx}`}
                      d={barPath}
                      fill={activeColor}
                      opacity={isSelected ? 1 : 0.45}
                    />
                  );
                })}

              {/* LINE CHART MODE */}
              {chartType === 'line' && (
                <>
                  {fillPath !== '' && (
                    <Path d={fillPath} fill={`url(#macroGrad_${selectedMacro})`} />
                  )}

                  {linePath !== '' && (
                    <Path
                      d={linePath}
                      fill="none"
                      stroke={activeColor}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                    />
                  )}

                  {chartCoordinates.map((coord, idx) => {
                    const isSelected = idx === safeIndex;
                    if (coord.isZero) {
                      return (
                        <Circle
                          key={`node_${idx}`}
                          cx={coord.x}
                          cy={coord.y}
                          r={isSelected ? 6.5 : 5}
                          fill="#FFFFFF"
                          stroke={isSelected ? activeColor : '#94A3B8'}
                          strokeWidth={isSelected ? 3 : 2}
                        />
                      );
                    }
                    return (
                      <Circle
                        key={`node_${idx}`}
                        cx={coord.x}
                        cy={coord.y}
                        r={isSelected ? 7.5 : 6}
                        fill={isSelected ? activeColor : '#FFFFFF'}
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
                        : formatMacroValue(selectedCoord.grams)
                    }
                    unitText={activeConfig.unit}
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
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${days[idx]?.dayNum || idx + 1}: ${formatMacroValue(coord.grams)} ${activeConfig.unit}`}
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
      {!hasAnyGrams && (
        <View style={styles.emptyPeriodBanner}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
              fill={activeColor}
            />
          </Svg>
          <Text style={styles.emptyPeriodText}>
            No {activeConfig.label.toLowerCase()} logged for this period yet. Tap a day to inspect.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowOpacity: 0,
    elevation: 0,
    position: 'relative',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 5000,
    elevation: 30,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 5000,
    elevation: 30,
  },
  dropdownAnchorWrap: {
    position: 'relative',
    zIndex: 6000,
    elevation: 35,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  dropdownTriggerActive: {
    borderColor: 'rgba(15, 23, 42, 0.2)',
    backgroundColor: '#F1F5F9',
  },
  macroPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dropdownTriggerText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    marginTop: 14,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 12,
    zIndex: 1,
    elevation: 1,
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
  dashedGoalLine: {
    width: 18,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
    zIndex: 1,
    elevation: 1,
  },
  yAxisColumn: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  yAxisLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'left',
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
    marginTop: 4,
  },
  xAxisLabelsWrap: {
    flex: 1,
    flexDirection: 'row',
  },
  xAxisLabelCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  xAxisText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#94A3B8',
  },
  xAxisTextSelected: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
  xAxisTextFuture: {
    color: '#CBD5E1',
  },
  emptyPeriodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 6,
  },
  emptyPeriodText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
  },

  /* Anchored Floating Dropdown Menu Styles - Pure Opaque White & High Elevation */
  anchoredDropdownMenu: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 175,
    backgroundColor: '#FFFFFF',
    opacity: 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 40,
    zIndex: 99999,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  dropdownItemRowActive: {
    backgroundColor: '#F1F5F9',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  dropdownItemLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  dropdownItemLabelActive: {
    color: '#0F172A',
  },
  dropdownItemSub: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
});
