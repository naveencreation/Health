import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { AnimatedSvgRing } from '@/components/common/AnimatedSvgRing';
import { AnimatedProgressBar } from '@/components/common/AnimatedProgressBar';
import {
  SHORT_DAY_NAMES,
  FULL_DAY_NAMES,
  SHORT_MONTHS,
  getRollingSevenDays,
  getWeekWindowEnd,
  parseDateString,
} from '@/utils/dateUtils';

interface HeroCalorieCardProps {
  onEditGoal?: () => void;
}

const HIT_SLOP_6 = { top: 6, bottom: 6, left: 6, right: 6 };
const HIT_SLOP_TIMELINE = { top: 6, bottom: 6, left: 4, right: 4 };

const HeroCalorieCardComponent: React.FC<HeroCalorieCardProps> = ({ onEditGoal }) => {
  const {
    todayStr,
    selectedDate,
    setSelectedDate,
    dailyLogs,
    totalConsumed,
    totalBurned,
    remainingCalories,
    totalCarbs,
    totalProtein,
    totalFat,
  } = useDailyLog();
  const { userGoals } = useGoals();

  const scrollRef = useRef<ScrollView>(null);
  const initialWidth =
    Dimensions.get('window').width > 480 ? 448 : Dimensions.get('window').width - 32;
  const [cardWidth, setCardWidth] = useState(initialWidth);
  const [activeSlide, setActiveSlide] = useState(0);

  const budget = userGoals.dailyCalorieBudget || BIOMETRIC_DEFAULTS.dailyCalorieBudget;
  const eaten = totalConsumed ?? 0;
  const burned = totalBurned ?? 0;
  const calLeft = remainingCalories;

  const isToday = selectedDate === todayStr;
  const dayTabLabel = isToday ? 'Today' : 'Day View';

  // Format goal title based on user's goal
  const goalLabel = (() => {
    switch (userGoals.goal) {
      case 'lose':
      case 'lose_weight':
        return 'Weight Loss';
      case 'gain':
      case 'gain_muscle':
        return 'Muscle Gain';
      case 'maintain':
      default:
        return 'Daily Goal';
    }
  })();

  // Dial specs (Slide 0)
  const dialSize = 120;
  const strokeWidth = 10;
  // Allowance matches the "kcal left" number: budget + burned
  const progressRatio = Math.min(1, Math.max(0, eaten / (budget + burned)));

  // Brand-aligned dial stroke color
  const dialStrokeColor = useMemo(() => {
    if (calLeft < 0) return Colors.primaryDark; // Warm supportive deep coral when exceeding budget
    return Colors.primary; // Signature Calorify Coral
  }, [calLeft]);

  // Macro progress ratios (Slide 0)
  const targetCarbs = userGoals.targetCarbs || BIOMETRIC_DEFAULTS.targetCarbs;
  const targetProtein = userGoals.targetProtein || BIOMETRIC_DEFAULTS.targetProtein;
  const targetFat = userGoals.targetFat || BIOMETRIC_DEFAULTS.targetFat;

  const carbRatio = Math.min(1, Math.max(0, (totalCarbs || 0) / targetCarbs));
  const proteinRatio = Math.min(1, Math.max(0, (totalProtein || 0) / targetProtein));
  const fatRatio = Math.min(1, Math.max(0, (totalFat || 0) / targetFat));

  // Same 7-day page as TopDateStrip, so tapping a day never shifts the chart
  const trendDays = useMemo(() => {
    const rollingDates = getRollingSevenDays(getWeekWindowEnd(selectedDate, todayStr), todayStr);

    const days = [];
    for (let i = 0; i < rollingDates.length; i++) {
      const dateStr = rollingDates[i];
      const d = parseDateString(dateStr);
      const dayOfWeek = d.getDay(); // 0 is Sunday
      const isDayToday = dateStr === todayStr;

      const meals = dailyLogs?.[dateStr]?.meals;
      const list = Array.isArray(meals) ? meals : [];
      const cals = list.reduce((sum, m) => sum + m.calories, 0);
      const carbs = Math.round(list.reduce((sum, m) => sum + m.carbs, 0));
      const protein = Math.round(list.reduce((sum, m) => sum + m.protein, 0));
      const fat = Math.round(list.reduce((sum, m) => sum + m.fat, 0));

      days.push({
        idx: i,
        dateStr,
        dayName: SHORT_DAY_NAMES[dayOfWeek],
        fullDayName: FULL_DAY_NAMES[dayOfWeek],
        monthName: SHORT_MONTHS[d.getMonth()],
        dayNum: d.getDate(),
        cals,
        carbs,
        protein,
        fat,
        isToday: isDayToday,
      });
    }

    return days;
  }, [selectedDate, dailyLogs, todayStr]);

  // Derived selected day index (Single Source of Truth: selectedDate, adheres to react-state-minimize)
  const selectedDayIdx = useMemo(() => {
    const matchIdx = trendDays.findIndex(d => d.dateStr === selectedDate);
    return matchIdx !== -1 ? matchIdx : trendDays.length - 1;
  }, [trendDays, selectedDate]);

  const currentDay = trendDays[selectedDayIdx] || trendDays[0] || trendDays[trendDays.length - 1];

  // Average weekly calories & status
  const avgCals = useMemo(() => {
    const activeDays = trendDays.filter(d => d.cals > 0);
    if (activeDays.length === 0) return eaten;
    const sum = activeDays.reduce((acc, d) => acc + d.cals, 0);
    return Math.round(sum / activeDays.length);
  }, [trendDays, eaten]);


  // Chart Canvas Dimensions (20px horizontal padding on card)
  const chartWidth = Math.max(240, cardWidth - 40);
  const chartHeight = 100;

  // Inset horizontal padding so outer SVG nodes (r=8) never clip and align over timeline buttons
  const horizontalPadding = 18;
  const usableWidth = chartWidth - horizontalPadding * 2;

  // Dynamic Y-axis scale based on target budget and maximum logged calories
  const maxLoggedCals = Math.max(...trendDays.map(d => d.cals), 0);
  const yMax = Math.max(budget * 1.2, maxLoggedCals * 1.15, 1800);

  // Calculate coordinates for the 7 points
  const dayPoints = useMemo(() => {
    return trendDays.map((day, i) => {
      const x = Math.round(horizontalPadding + (i / 6) * usableWidth);
      const availableHeight = chartHeight - 24;
      const normalizedRatio = Math.min(1, Math.max(0, day.cals / yMax));
      const y = Math.round(chartHeight - 12 - normalizedRatio * availableHeight);
      return { x, y, cals: day.cals };
    });
  }, [trendDays, horizontalPadding, usableWidth, chartHeight, yMax]);

  // Goal benchmark line Y coordinate
  const goalY = Math.round(chartHeight - 12 - Math.min(1, budget / yMax) * (chartHeight - 24));

  // Build smooth cubic bezier curve
  const curvePath = useMemo(() => {
    if (!dayPoints || dayPoints.length < 2) return '';
    let path = `M ${dayPoints[0].x} ${dayPoints[0].y}`;
    for (let i = 0; i < dayPoints.length - 1; i++) {
      const p0 = dayPoints[i];
      const p1 = dayPoints[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [dayPoints]);

  const areaPath = useMemo(() => {
    if (!dayPoints || dayPoints.length < 2) return '';
    const firstX = dayPoints[0].x;
    const lastX = dayPoints[dayPoints.length - 1].x;
    return `${curvePath} L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;
  }, [curvePath, dayPoints, chartHeight]);

  // Active Selected Day Coordinates
  const activePt = dayPoints[selectedDayIdx] || dayPoints[dayPoints.length - 1];

  const tooltipWidth = 84;
  const tooltipLeft = Math.max(
    2,
    Math.min(chartWidth - tooltipWidth - 2, (activePt?.x ?? 0) - tooltipWidth / 2)
  );
  const caretOffset = (activePt?.x ?? 0) - tooltipLeft;

  // Carousel Switching Handlers
  const handleSlideChange = (index: number) => {
    setActiveSlide(index);
    scrollRef.current?.scrollTo({ x: index * cardWidth, animated: true });
  };

  return (
    <View
      style={styles.card}
      onLayout={e => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && Math.abs(w - cardWidth) > 3) {
          setCardWidth(w);
        }
      }}
    >
      {/* 1. Shared Card Top Header: Dynamic Title + Segment Switcher */}
      <View style={styles.cardTopHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.goalTitle}>
            {activeSlide === 0 ? `${goalLabel}: ${budget.toLocaleString()} kcal` : 'Weekly Diet Journey'}
          </Text>
          {activeSlide === 0 && onEditGoal ? (
            <Pressable
              onPress={onEditGoal}
              style={({ pressed }) => [styles.editBtn, pressed ? styles.pressedBtnSubtle : null]}
              hitSlop={HIT_SLOP_6}
              accessibilityRole="button"
              accessibilityLabel="Edit calorie budget"
            >
              <Ionicons name="pencil-outline" size={15} color={Colors.iconNavy} />
            </Pressable>
          ) : null}
        </View>

        {/* Segmented Switcher Pill */}
        <View style={styles.segmentPill}>
          <Pressable
            style={({ pressed }) => [
              styles.segmentBtn,
              activeSlide === 0 ? styles.segmentBtnActive : null,
              pressed ? styles.pressedSegment : null,
            ]}
            onPress={() => handleSlideChange(0)}
            accessibilityRole="tab"
            accessibilityLabel={isToday ? "Show today's budget" : 'Show day view budget'}
            accessibilityState={{ selected: activeSlide === 0 }}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeSlide === 0 ? styles.segmentBtnTextActive : null,
              ]}
            >
              {dayTabLabel}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.segmentBtn,
              activeSlide === 1 ? styles.segmentBtnActive : null,
              pressed ? styles.pressedSegment : null,
            ]}
            onPress={() => handleSlideChange(1)}
            accessibilityRole="tab"
            accessibilityLabel="Show weekly trend"
            accessibilityState={{ selected: activeSlide === 1 }}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeSlide === 1 ? styles.segmentBtnTextActive : null,
              ]}
            >
              Weekly Trend
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Slides switch only via the tabs: a swipe here fought the page scroll and the date strip */}
      <ScrollView ref={scrollRef} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
        {/* SLIDE 0: Today's Calorie & Macro Budget */}
        <View style={[styles.slide, { width: cardWidth }]}>
          {/* Middle Body: Eaten & Burned (Left) + Circular Dial (Right) */}
          <View style={styles.metricsBody}>
            {/* Left Column: Eaten & Burned */}
            <View style={styles.leftMetricsCol}>
              {/* Eaten */}
              <View style={styles.metricBlock}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>Eaten</Text>
                  <Ionicons
                    name="restaurant-outline"
                    size={13}
                    color={Colors.primary}
                    style={styles.metricIcon}
                  />
                </View>
                <Text style={styles.metricValueText}>
                  {eaten} <Text style={styles.metricUnit}>kcal</Text>
                </Text>
              </View>

              {/* Burned */}
              <View style={[styles.metricBlock, styles.metricBlockBurned]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>Burned</Text>
                  <Ionicons name="flame" size={13} color={Colors.burn} style={styles.metricIcon} />
                </View>
                <Text style={styles.metricValueText}>
                  {burned} <Text style={styles.metricUnit}>kcal</Text>
                </Text>
              </View>
            </View>

            {/* Right Column: Hero "Cal left" Progress Dial */}
            <View style={styles.dialContainer}>
              <AnimatedSvgRing
                size={dialSize}
                strokeWidth={strokeWidth}
                progress={progressRatio}
                strokeColor={dialStrokeColor}
                backgroundColor="rgba(15, 23, 42, 0.08)"
              />

              <View style={styles.dialCenterContent}>
                <Text style={styles.calLeftNumber}>{Math.abs(calLeft).toLocaleString()}</Text>
                <Text style={styles.calLeftLabel}>{calLeft < 0 ? 'kcal over' : 'kcal left'}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Row: 3 Macro Progress Strips (Carbs, Protein, Fat) */}
          <View style={styles.macrosRow}>
            {/* Carbs */}
            <View style={styles.macroItem}>
              <Text style={styles.macroName}>Carbs</Text>
              <AnimatedProgressBar
                progress={carbRatio}
                fillColor={Colors.carbs}
                height={6}
                trackColor={Colors.carbsLight}
              />
              <Text style={styles.macroRatioText}>
                <Text style={styles.macroBoldVal}>{totalCarbs}</Text> / {targetCarbs}g
              </Text>
            </View>

            {/* Protein */}
            <View style={styles.macroItem}>
              <Text style={styles.macroName}>Protein</Text>
              <AnimatedProgressBar
                progress={proteinRatio}
                fillColor={Colors.protein}
                height={6}
                trackColor={Colors.proteinLight}
              />
              <Text style={styles.macroRatioText}>
                <Text style={styles.macroBoldVal}>{totalProtein}</Text> / {targetProtein}g
              </Text>
            </View>

            {/* Fat */}
            <View style={styles.macroItem}>
              <Text style={styles.macroName}>Fat</Text>
              <AnimatedProgressBar
                progress={fatRatio}
                fillColor={Colors.fat}
                height={6}
                trackColor={Colors.fatLight}
              />
              <Text style={styles.macroRatioText}>
                <Text style={styles.macroBoldVal}>{totalFat}</Text> / {targetFat}g
              </Text>
            </View>
          </View>
        </View>

        {/* SLIDE 1: Weekly Diet Journey (Option A: Frost White Apple Health Style) */}
        <View style={[styles.slide, { width: cardWidth }]}>
          {/* A. Subheader: Average Intake */}
          <View style={styles.journeySubheaderRow}>
            <Text style={styles.avgIntakeLabel}>
              Avg: <Text style={styles.avgIntakeBold}>{avgCals.toLocaleString()} kcal/day</Text>
            </Text>
            {/* The macro pills below are for this day, not the average */}
            <Text style={styles.daySelectedLabel}>
              {currentDay.isToday
                ? 'Today'
                : `${currentDay.fullDayName}, ${currentDay.dayNum} ${currentDay.monthName}`}
            </Text>
          </View>

          {/* B. Macro Pill Badges (Carbs, Protein, Fat) */}
          <View style={styles.macroBadgesRow}>
            <View style={styles.macroPillCyan}>
              <Text style={styles.macroTitleCyan}>Carbs</Text>
              <Text style={styles.macroPillValue}>{currentDay.carbs}g</Text>
            </View>

            <View style={styles.macroPillGreen}>
              <Text style={styles.macroTitleGreen}>Protein</Text>
              <Text style={styles.macroPillValue}>{currentDay.protein}g</Text>
            </View>

            <View style={styles.macroPillOrange}>
              <Text style={styles.macroTitleOrange}>Fat</Text>
              <Text style={styles.macroPillValue}>{currentDay.fat}g</Text>
            </View>
          </View>

          {/* C. Sunset Coral Wave Curve with Goal Benchmark */}
          <View style={[styles.chartWrapper, { width: chartWidth, height: chartHeight }]}>
            <Svg width={chartWidth} height={chartHeight} style={styles.svgAbsolute}>
              <Defs>
                <LinearGradient id="frostWaveGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={Colors.primary} stopOpacity={0.35} />
                  <Stop offset="65%" stopColor={Colors.primaryLight} stopOpacity={0.15} />
                  <Stop offset="100%" stopColor={Colors.primaryLight} stopOpacity={0.0} />
                </LinearGradient>
              </Defs>

              {/* Goal Horizon Dashed Benchmark Line */}
              <Line
                x1={0}
                y1={goalY}
                x2={chartWidth}
                y2={goalY}
                stroke="rgba(100, 116, 139, 0.35)"
                strokeDasharray="4 4"
                strokeWidth={1.2}
              />

              {/* Sunset Coral Gradient Fill */}
              <Path d={areaPath} fill="url(#frostWaveGradient)" />

              {/* Glowing Wave Curve Line */}
              <Path
                d={curvePath}
                stroke={Colors.primary}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />

              {/* Active Day Vertical Telemetry Guide Line */}
              <Line
                x1={activePt.x}
                y1={activePt.y}
                x2={activePt.x}
                y2={chartHeight}
                stroke={Colors.textPrimary}
                strokeDasharray="3 3"
                strokeWidth={1}
                opacity={0.25}
              />

              {/* Non-selected day data dots */}
              {dayPoints.map((pt, i) => {
                if (i === selectedDayIdx) return null;
                return (
                  <Circle
                    key={`dot-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.cals > 0 ? 3.5 : 2.5}
                    fill={pt.cals > 0 ? Colors.primary : 'rgba(15, 23, 42, 0.15)'}
                  />
                );
              })}

              {/* Active Day Glowing Node */}
              <Circle cx={activePt.x} cy={activePt.y} r={8} fill="rgba(244, 117, 81, 0.25)" />
              <Circle
                cx={activePt.x}
                cy={activePt.y}
                r={4.5}
                fill={Colors.card}
                stroke={Colors.primary}
                strokeWidth={2.5}
              />
            </Svg>

            {/* Goal Horizon Label on right */}
            <View style={[styles.goalHorizonLabel, { top: Math.max(1, goalY - 14) }]}>
              <Text style={styles.goalHorizonText}>Goal: {budget.toLocaleString()} kcal</Text>
            </View>

            {/* Active Point Calorie Tooltip */}
            {activePt && (
              <View
                style={[
                  styles.chartTooltipContainer,
                  {
                    left: tooltipLeft,
                    top: Math.max(-10, activePt.y - 32),
                    width: tooltipWidth,
                  },
                ]}
                pointerEvents="none"
              >
                <View style={styles.chartTooltipBadge}>
                  <Text style={styles.chartTooltipText}>
                    {currentDay.cals.toLocaleString()} kcal
                  </Text>
                </View>
                <View
                  style={[
                    styles.chartTooltipCaret,
                    { left: Math.max(5, Math.min(tooltipWidth - 15, caretOffset - 5)) },
                  ]}
                />
              </View>
            )}

            {/* Interactive Touch Columns (hidden from screen readers: the timeline below has the same buttons) */}
            <View
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {trendDays.map((day, i) => {
                const colWidth = usableWidth / 6;
                const colLeft = horizontalPadding + (i - 0.5) * colWidth;
                return (
                  <Pressable
                    key={`chart-touch-${day.dateStr || i}`}
                    style={[
                      styles.chartTouchCol,
                      {
                        left: Math.max(0, colLeft),
                        width: colWidth,
                      },
                    ]}
                    onPress={() => {
                      if (day.dateStr) {
                        setSelectedDate(day.dateStr);
                      }
                    }}
                    hitSlop={HIT_SLOP_TIMELINE}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${day.dayName}, ${day.cals} calories`}
                  />
                );
              })}
            </View>
          </View>

          {/* D. Seamless 7-Day Timeline (SUN to SAT with Obsidian Pill) */}
          <View style={[styles.timelineRow, { width: chartWidth }]}>
            {trendDays.map((day, idx) => {
              const isSelected = selectedDayIdx === idx;
              return (
                <Pressable
                  key={day.dateStr || idx}
                  style={({ pressed }) => [
                    styles.timelineBtn,
                    isSelected ? styles.timelineBtnSelected : null,
                    pressed ? styles.pressedTimelineBtn : null,
                  ]}
                  onPress={() => {
                    if (day.dateStr) {
                      setSelectedDate(day.dateStr);
                    }
                  }}
                  hitSlop={HIT_SLOP_TIMELINE}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${day.dayName}, ${day.cals} calories`}
                >
                  <Text
                    style={[
                      styles.timelineDayText,
                      isSelected ? styles.timelineDayTextSelected : null,
                    ]}
                  >
                    {day.isToday ? 'TODAY' : day.dayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    elevation: 0,
    shadowOpacity: 0,
  },
  cardTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  goalTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  editBtn: {
    padding: 2,
  },
  pressedBtnSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  // Segment Switcher Pill
  segmentPill: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceInset,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 2.5,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  segmentBtn: {
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  pressedSegment: {
    opacity: 0.9,
  },
  segmentBtnActive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
  },
  segmentBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textPrimary,
  },
  slide: {
    paddingHorizontal: 20,
  },
  // Slide 0: Metrics Body
  metricsBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  leftMetricsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  metricBlock: {},
  metricBlockBurned: {
    marginTop: 12,
  },
  metricIcon: {
    marginLeft: 4,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSlate600,
  },
  metricValueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  metricUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dialContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calLeftNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 21,
    color: Colors.textPrimary,
    lineHeight: 25,
  },
  calLeftLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  // Slide 0: Macros Row
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroItem: {
    flex: 1,
  },
  macroName: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSlate600,
    marginBottom: 5,
  },
  macroRatioText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  macroBoldVal: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textPrimary,
  },
  // Slide 1: Option A Subheader
  journeySubheaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avgIntakeLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  avgIntakeBold: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
  },
  daySelectedLabel: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  statusBadgeIcon: {
    marginRight: 3,
  },
  statusBadgeGreen: {
    backgroundColor: Colors.proteinLight,
  },
  statusBadgeOrange: {
    backgroundColor: Colors.fatLight,
  },
  statusBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
  },
  statusTextGreen: {
    color: Colors.proteinDark,
  },
  statusTextOrange: {
    color: Colors.primaryDark,
  },
  // Slide 1: Refined Soft Pastel Macro Badges
  macroBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  macroPillCyan: {
    flex: 1,
    backgroundColor: Colors.carbsLight,
    borderWidth: 1,
    borderColor: Colors.carbsBorder,
    paddingVertical: 7,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroPillGreen: {
    flex: 1,
    backgroundColor: Colors.proteinLight,
    borderWidth: 1,
    borderColor: Colors.proteinBorder,
    paddingVertical: 7,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroPillOrange: {
    flex: 1,
    backgroundColor: Colors.fatLight,
    borderWidth: 1,
    borderColor: Colors.fatBorder,
    paddingVertical: 7,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroTitleCyan: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.carbsDark,
  },
  macroTitleGreen: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.proteinDark,
  },
  macroTitleOrange: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.fatDark,
  },
  macroPillValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  // Slide 1: Wave Canvas & Horizon
  chartWrapper: {
    position: 'relative',
    marginVertical: 4,
  },
  svgAbsolute: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  goalHorizonLabel: {
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  goalHorizonText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10,
    color: Colors.textMuted,
  },
  chartTooltipContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  chartTooltipBadge: {
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3.5,
    elevation: 4,
  },
  chartTooltipText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    lineHeight: 15,
    color: Colors.textInverse,
    letterSpacing: -0.2,
  },
  chartTooltipCaret: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.textPrimary,
  },
  chartTouchCol: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  // Slide 1: Timeline Row (SUN to SAT)
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timelineBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedTimelineBtn: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  timelineBtnSelected: {
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  timelineDayText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  timelineDayTextSelected: {
    color: Colors.textInverse,
  },
  // Bottom Micro Pagination Dots
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  pressedDot: {
    opacity: 0.88,
  },
  paginationDotActive: {
    width: 16,
    backgroundColor: Colors.textPrimary,
  },
});

export const HeroCalorieCard = React.memo(HeroCalorieCardComponent);
