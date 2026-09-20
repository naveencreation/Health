import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Svg, { Circle, Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { AnimatedSvgRing } from '@/components/common/AnimatedSvgRing';
import { AnimatedProgressBar } from '@/components/common/AnimatedProgressBar';

interface HeroCalorieCardProps {
  onEditGoal?: () => void;
}

const HIT_SLOP_6 = { top: 6, bottom: 6, left: 6, right: 6 };
const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };
const HIT_SLOP_TIMELINE = { top: 6, bottom: 6, left: 4, right: 4 };

const SHORT_DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const GUEST_BASELINE_DAYS = [
  { cals: 1840, carbs: 195, protein: 72, fat: 46 },
  { cals: 1720, carbs: 180, protein: 68, fat: 42 },
  { cals: 1950, carbs: 210, protein: 78, fat: 50 },
  { cals: 1680, carbs: 175, protein: 65, fat: 40 },
  { cals: 1890, carbs: 200, protein: 74, fat: 48 },
  { cals: 1780, carbs: 190, protein: 70, fat: 44 },
  { cals: 1820, carbs: 195, protein: 72, fat: 45 },
] as const;

// Hoisted pure utility functions (avoids re-allocation on render)
const parseDateStr = (str: string): Date => {
  const parts = str.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date();
};

const formatDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const HeroCalorieCardComponent: React.FC<HeroCalorieCardProps> = ({ onEditGoal }) => {
  const {
    userGoals,
    totalConsumed,
    totalBurned,
    remainingCalories,
    totalCarbs,
    totalProtein,
    totalFat,
    weeklyLogs,
    selectedDate,
    setSelectedDate,
    dailyLogs,
    currentUser,
  } = useHealth();

  const scrollRef = useRef<ScrollView>(null);
  const initialWidth =
    Dimensions.get('window').width > 480 ? 448 : Dimensions.get('window').width - 32;
  const [cardWidth, setCardWidth] = useState(initialWidth);
  const [activeSlide, setActiveSlide] = useState(0);

  const budget = userGoals.dailyCalorieBudget || 2000;
  const eaten = totalConsumed ?? 0;
  const burned = totalBurned ?? 0;
  const calLeft = remainingCalories;

  // Real-world today reference & dynamic context tab label
  const todayStr = useMemo(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const isToday = selectedDate === todayStr;
  const dayTabLabel = isToday ? 'Today' : 'Day View';

  // Format goal title based on user's goal
  const goalLabel = (() => {
    switch (userGoals.goal) {
      case 'lose':
        return 'Weight Loss';
      case 'gain':
        return 'Muscle Hypertrophy';
      case 'maintain':
      default:
        return 'Balanced Diet';
    }
  })();

  // Dial specs (Slide 0)
  const dialSize = 120;
  const strokeWidth = 10;
  const radius = (dialSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, Math.max(0, eaten / budget));
  const strokeDashoffset = circumference - circumference * progressRatio;

  // Brand-aligned dial stroke color
  const dialStrokeColor = useMemo(() => {
    if (calLeft < 0) return '#F97316'; // Warm supportive coral-amber when exceeding budget
    if (progressRatio >= 0.95 && progressRatio <= 1.05) return '#10B981'; // Emerald on track
    return '#F47551'; // Signature Calori Coral
  }, [calLeft, progressRatio]);

  // Macro progress ratios (Slide 0)
  const targetCarbs = userGoals.targetCarbs || 110;
  const targetProtein = userGoals.targetProtein || 90;
  const targetFat = userGoals.targetFat || 70;

  const carbRatio = Math.min(1, Math.max(0, (totalCarbs || 0) / targetCarbs));
  const proteinRatio = Math.min(1, Math.max(0, (totalProtein || 0) / targetProtein));
  const fatRatio = Math.min(1, Math.max(0, (totalFat || 0) / targetFat));

  // 7 Days of the active calendar week (SUN to SAT) matching TopDateStrip
  const trendDays = useMemo(() => {
    const current = parseDateStr(selectedDate);
    const dayOfWeek = current.getDay(); // 0 is Sunday
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const isGuest = currentUser?.isGuest;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = formatDateStr(d);
      const isDayToday = dateStr === todayStr;

      const log = dailyLogs ? dailyLogs[dateStr] : undefined;
      const fallback = isGuest ? GUEST_BASELINE_DAYS[i % GUEST_BASELINE_DAYS.length] : null;

      const hasMeals = log && Array.isArray(log.meals) && log.meals.length > 0;
      const cals = hasMeals
        ? log.meals.reduce((sum, m) => sum + m.calories, 0)
        : (fallback ? fallback.cals : 0);
      const carbs = hasMeals
        ? Math.round(log.meals.reduce((sum, m) => sum + m.carbs, 0))
        : (fallback ? fallback.carbs : 0);
      const protein = hasMeals
        ? Math.round(log.meals.reduce((sum, m) => sum + m.protein, 0))
        : (fallback ? fallback.protein : 0);
      const fat = hasMeals
        ? Math.round(log.meals.reduce((sum, m) => sum + m.fat, 0))
        : (fallback ? fallback.fat : 0);

      days.push({
        idx: i,
        dateStr,
        dayName: SHORT_DAY_NAMES[i],
        fullDayName: FULL_DAY_NAMES[i],
        monthName: MONTH_NAMES[d.getMonth()],
        dayNum: d.getDate(),
        cals,
        carbs,
        protein,
        fat,
        isToday: isDayToday,
      });
    }

    return days;
  }, [selectedDate, dailyLogs, todayStr, currentUser]);

  // Derived selected day index (Single Source of Truth: selectedDate, adheres to react-state-minimize)
  const selectedDayIdx = useMemo(() => {
    const matchIdx = trendDays.findIndex((d) => d.dateStr === selectedDate);
    return matchIdx !== -1 ? matchIdx : parseDateStr(selectedDate).getDay();
  }, [trendDays, selectedDate]);

  const currentDay = trendDays[selectedDayIdx] || trendDays[0] || trendDays[trendDays.length - 1];

  // Average weekly calories & status
  const avgCals = useMemo(() => {
    const activeDays = trendDays.filter((d) => d.cals > 0);
    if (activeDays.length === 0) return eaten;
    const sum = activeDays.reduce((acc, d) => acc + d.cals, 0);
    return Math.round(sum / activeDays.length);
  }, [trendDays, eaten]);

  const isOnTrack = avgCals <= budget;

  // Chart Canvas Dimensions (20px horizontal padding on card)
  const chartWidth = Math.max(240, cardWidth - 40);
  const chartHeight = 100;

  // Inset horizontal padding so outer SVG nodes (r=8) never clip and align over timeline buttons
  const horizontalPadding = 18;
  const usableWidth = chartWidth - horizontalPadding * 2;

  // Dynamic Y-axis scale based on target budget and maximum logged calories
  const maxLoggedCals = Math.max(...trendDays.map((d) => d.cals), 0);
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

  // Carousel Switching Handlers
  const handleSlideChange = (index: number) => {
    setActiveSlide(index);
    scrollRef.current?.scrollTo({ x: index * cardWidth, animated: true });
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardWidth);
    if (index !== activeSlide && (index === 0 || index === 1)) {
      setActiveSlide(index);
    }
  };

  return (
    <View
      style={styles.card}
      onLayout={(e) => {
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
            {activeSlide === 0 ? `${goalLabel} : ${budget} Cal` : '7-Day Diet Journey'}
          </Text>
          {activeSlide === 0 && onEditGoal ? (
            <Pressable
              onPress={onEditGoal}
              style={({ pressed }) => [styles.editBtn, pressed ? styles.pressedBtnSubtle : null]}
              hitSlop={HIT_SLOP_6}
              accessibilityRole="button"
              accessibilityLabel="Edit calorie budget"
            >
              <Ionicons name="pencil-outline" size={15} color="#0F172A" />
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
            accessibilityLabel={isToday ? "Show today's budget" : "Show day view budget"}
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
            accessibilityLabel="Show 7-day trend"
            accessibilityState={{ selected: activeSlide === 1 }}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeSlide === 1 ? styles.segmentBtnTextActive : null,
              ]}
            >
              7-Day Trend
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Horizontal Paging ScrollView */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        onMomentumScrollEnd={handleScrollEnd}
        decelerationRate="fast"
        snapToInterval={cardWidth}
        snapToAlignment="center"
        scrollEventThrottle={16}
      >
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
                  <Ionicons name="restaurant-outline" size={13} color="#0284C7" style={styles.metricIcon} />
                </View>
                <Text style={styles.metricValueText}>
                  {eaten} <Text style={styles.metricUnit}>Cal</Text>
                </Text>
              </View>

              {/* Burned */}
              <View style={[styles.metricBlock, styles.metricBlockBurned]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>Burned</Text>
                  <Ionicons name="flame" size={13} color="#EA580C" style={styles.metricIcon} />
                </View>
                <Text style={styles.metricValueText}>
                  {burned} <Text style={styles.metricUnit}>Cal</Text>
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
                <Text style={styles.calLeftNumber}>
                  {Math.abs(calLeft).toLocaleString()}
                </Text>
                <Text style={styles.calLeftLabel}>
                  {calLeft < 0 ? 'Cal over' : 'Cal left'}
                </Text>
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
                fillColor="#22C55E"
                height={5}
                trackColor="#E2E8F0"
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
                fillColor="#3B82F6"
                height={5}
                trackColor="#E2E8F0"
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
                fillColor="#EC4899"
                height={5}
                trackColor="#E2E8F0"
              />
              <Text style={styles.macroRatioText}>
                <Text style={styles.macroBoldVal}>{totalFat}</Text> / {targetFat}g
              </Text>
            </View>
          </View>
        </View>

        {/* SLIDE 1: 7-Day Diet Journey (Option A: Frost White Apple Health Style) */}
        <View style={[styles.slide, { width: cardWidth }]}>
          {/* A. Subheader: Average Intake + "On Track" Status Badge */}
          <View style={styles.journeySubheaderRow}>
            <View>
              <Text style={styles.avgIntakeLabel}>
                Avg: <Text style={styles.avgIntakeBold}>{avgCals.toLocaleString()} kcal/day</Text>
              </Text>
              <Text style={styles.daySelectedLabel}>
                {currentDay.isToday
                  ? 'Today'
                  : `${currentDay.fullDayName}, ${currentDay.monthName} ${currentDay.dayNum}`}: {currentDay.cals.toLocaleString()} kcal
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isOnTrack ? styles.statusBadgeGreen : styles.statusBadgeOrange,
              ]}
            >
              <Ionicons
                name={isOnTrack ? 'checkmark-circle' : 'alert-circle'}
                size={13}
                color={isOnTrack ? '#16A34A' : '#EA580C'}
                style={styles.statusBadgeIcon}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  isOnTrack ? styles.statusTextGreen : styles.statusTextOrange,
                ]}
              >
                {isOnTrack ? 'On Track' : 'Above Target'}
              </Text>
            </View>
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
                  <Stop offset="0%" stopColor="#FF6B4A" stopOpacity={0.35} />
                  <Stop offset="65%" stopColor="#FF8C68" stopOpacity={0.12} />
                  <Stop offset="100%" stopColor="#FF8C68" stopOpacity={0.0} />
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
                stroke="#FF6B4A"
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
                stroke="#0F172A"
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
                    fill={pt.cals > 0 ? '#FF6B4A' : 'rgba(15, 23, 42, 0.15)'}
                  />
                );
              })}

              {/* Active Day Glowing Node */}
              <Circle
                cx={activePt.x}
                cy={activePt.y}
                r={8}
                fill="rgba(255, 107, 74, 0.25)"
              />
              <Circle
                cx={activePt.x}
                cy={activePt.y}
                r={4.5}
                fill="#FFFFFF"
                stroke="#FF6B4A"
                strokeWidth={2.5}
              />
            </Svg>

            {/* Goal Horizon Label on right */}
            <View style={[styles.goalHorizonLabel, { top: Math.max(1, goalY - 14) }]}>
              <Text style={styles.goalHorizonText}>Goal: {budget.toLocaleString()} kcal</Text>
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
    backgroundColor: '#FFFFFF', // Crisp Frost White surface!
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  editBtn: {
    padding: 2,
  },
  pressedBtnSubtle: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  // Segment Switcher Pill
  segmentPill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Soft Slate 100 track
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 2.5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtn: {
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 11,
    borderCurve: 'continuous',
  },
  pressedSegment: {
    opacity: 0.8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  segmentBtnTextActive: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#0F172A',
    fontWeight: '600',
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  metricValueText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13.5,
    fontWeight: '400',
    color: '#64748B',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 21,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 25,
  },
  calLeftLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#475569',
    marginBottom: 4,
  },
  macroTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroFillCarb: {
    backgroundColor: '#F8D558',
  },
  macroFillProtein: {
    backgroundColor: '#67BD6E',
  },
  macroFillFat: {
    backgroundColor: '#F47551',
  },
  macroRatioText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#64748B',
  },
  macroBoldVal: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#0F172A',
    fontWeight: '600',
  },
  // Slide 1: Option A Subheader
  journeySubheaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avgIntakeLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
  avgIntakeBold: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
    fontWeight: '700',
  },
  daySelectedLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
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
    backgroundColor: '#DCFCE7',
  },
  statusBadgeOrange: {
    backgroundColor: '#FFEDD5',
  },
  statusBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusTextGreen: {
    color: '#16A34A',
  },
  statusTextOrange: {
    color: '#EA580C',
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
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FEF08A',
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroPillGreen: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroPillOrange: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroTitleCyan: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
  },
  macroTitleGreen: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  macroTitleOrange: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '600',
  },
  macroPillValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '700',
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '500',
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
    opacity: 0.7,
    transform: [{ scale: 0.93 }],
  },
  timelineBtnSelected: {
    backgroundColor: '#0F172A', // Obsidian Black Pill!
    paddingHorizontal: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineDayText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  timelineDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    opacity: 0.7,
  },
  paginationDotActive: {
    width: 16,
    backgroundColor: '#0F172A',
  },
});

export const HeroCalorieCard = React.memo(HeroCalorieCardComponent);
