import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Svg, { Circle, Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';

interface HeroCalorieCardProps {
  onEditGoal?: () => void;
}

export const HeroCalorieCard: React.FC<HeroCalorieCardProps> = ({ onEditGoal }) => {
  const {
    userGoals,
    totalConsumed,
    totalBurned,
    remainingCalories,
    totalCarbs,
    totalProtein,
    totalFat,
    weeklyLogs,
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

  // Macro progress ratios (Slide 0)
  const targetCarbs = userGoals.targetCarbs || 110;
  const targetProtein = userGoals.targetProtein || 90;
  const targetFat = userGoals.targetFat || 70;

  const carbRatio = Math.min(1, Math.max(0, (totalCarbs || 0) / targetCarbs));
  const proteinRatio = Math.min(1, Math.max(0, (totalProtein || 0) / targetProtein));
  const fatRatio = Math.min(1, Math.max(0, (totalFat || 0) / targetFat));

  // --- Slide 1: 7-Day Diet Journey (Option A: Frost White Apple Health Style) ---
  const [selectedDayIdx, setSelectedDayIdx] = useState(6); // Defaults to Today (index 6)

  // Extract 7 chronological days from weeklyLogs ending today
  const trendDays = useMemo(() => {
    if (Array.isArray(weeklyLogs) && weeklyLogs.length === 7) {
      return weeklyLogs.map((item, idx) => {
        const parts = item.date.split('-');
        const d =
          parts.length === 3
            ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
            : new Date();
        const dayNum = d.getDate();
        const shortDayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const dayName = item.dayName ? item.dayName.toUpperCase() : shortDayNames[d.getDay()];

        return {
          idx,
          dateStr: item.date,
          dayName,
          dayNum,
          cals: item.calories || 0,
          carbs: item.carbs || 0,
          protein: item.protein || 0,
          fat: item.fat || 0,
          isToday: idx === 6,
        };
      });
    }

    // Fallback: build 7 days ending today
    const daysArr = [];
    const today = new Date();
    const shortDayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      daysArr.push({
        idx: 6 - i,
        dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        dayName: shortDayNames[d.getDay()],
        dayNum: d.getDate(),
        cals: i === 0 ? eaten : 0,
        carbs: i === 0 ? totalCarbs : 0,
        protein: i === 0 ? totalProtein : 0,
        fat: i === 0 ? totalFat : 0,
        isToday: i === 0,
      });
    }
    return daysArr;
  }, [weeklyLogs, eaten, totalCarbs, totalProtein, totalFat]);

  const currentDay = trendDays[selectedDayIdx] || trendDays[6] || trendDays[trendDays.length - 1];

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

  // Dynamic Y-axis scale based on target budget and maximum logged calories
  const maxLoggedCals = Math.max(...trendDays.map((d) => d.cals), 0);
  const yMax = Math.max(budget * 1.2, maxLoggedCals * 1.15, 1800);

  // Calculate coordinates for the 7 points
  const dayPoints = useMemo(() => {
    return trendDays.map((day, i) => {
      const x = Math.round((i / 6) * chartWidth);
      const availableHeight = chartHeight - 24;
      const normalizedRatio = Math.min(1, Math.max(0, day.cals / yMax));
      const y = Math.round(chartHeight - 12 - normalizedRatio * availableHeight);
      return { x, y, cals: day.cals };
    });
  }, [trendDays, chartWidth, chartHeight, yMax]);

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

  const areaPath = `${curvePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

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
          {activeSlide === 0 && onEditGoal && (
            <TouchableOpacity
              onPress={onEditGoal}
              activeOpacity={0.7}
              style={styles.editBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Edit calorie budget"
            >
              <Ionicons name="pencil-outline" size={15} color="#0F172A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented Switcher Pill */}
        <View style={styles.segmentPill}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSlide === 0 && styles.segmentBtnActive]}
            onPress={() => handleSlideChange(0)}
            activeOpacity={0.8}
            accessibilityLabel="Show today's budget"
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeSlide === 0 && styles.segmentBtnTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeSlide === 1 && styles.segmentBtnActive]}
            onPress={() => handleSlideChange(1)}
            activeOpacity={0.8}
            accessibilityLabel="Show 7-day trend"
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeSlide === 1 && styles.segmentBtnTextActive,
              ]}
            >
              7-Day Trend
            </Text>
          </TouchableOpacity>
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
                  <Ionicons name="restaurant-outline" size={13} color="#0284C7" style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.metricValueText}>
                  {eaten} <Text style={styles.metricUnit}>Cal</Text>
                </Text>
              </View>

              {/* Burned */}
              <View style={[styles.metricBlock, { marginTop: 12 }]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>Burned</Text>
                  <Ionicons name="flame" size={13} color="#EA580C" style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.metricValueText}>
                  {burned} <Text style={styles.metricUnit}>Cal</Text>
                </Text>
              </View>
            </View>

            {/* Right Column: Hero "Cal left" Progress Dial */}
            <View style={styles.dialContainer}>
              <Svg width={dialSize} height={dialSize}>
                <Circle
                  cx={dialSize / 2}
                  cy={dialSize / 2}
                  r={radius}
                  stroke="rgba(15, 23, 42, 0.08)"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={dialSize / 2}
                  cy={dialSize / 2}
                  r={radius}
                  stroke={calLeft < 0 ? '#EF4444' : '#0F172A'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
                />
              </Svg>

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

          {/* Bottom Row: 3 Macro Progress Strips (Carb, Proteins, Fat) */}
          <View style={styles.macrosRow}>
            {/* Carb */}
            <View style={styles.macroItem}>
              <Text style={styles.macroName}>Carb</Text>
              <View style={styles.macroTrack}>
                <View style={[styles.macroFill, { width: `${Math.round(carbRatio * 100)}%`, backgroundColor: '#38BDF8' }]} />
              </View>
              <Text style={styles.macroRatioText}>
                <Text style={styles.macroBoldVal}>{totalCarbs}</Text> / {targetCarbs}g
              </Text>
            </View>

            {/* Proteins */}
            <View style={styles.macroItem}>
              <Text style={styles.macroName}>Proteins</Text>
              <View style={styles.macroTrack}>
                <View style={[styles.macroFill, { width: `${Math.round(proteinRatio * 100)}%`, backgroundColor: '#22C55E' }]} />
              </View>
              <Text style={styles.macroRatioText}>
                <Text style={styles.macroBoldVal}>{totalProtein}</Text> / {targetProtein}g
              </Text>
            </View>

            {/* Fat */}
            <View style={styles.macroItem}>
              <Text style={styles.macroName}>Fat</Text>
              <View style={styles.macroTrack}>
                <View style={[styles.macroFill, { width: `${Math.round(fatRatio * 100)}%`, backgroundColor: '#F97316' }]} />
              </View>
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
                {currentDay.isToday ? 'Today' : currentDay.dayName}: {currentDay.cals.toLocaleString()} kcal
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
                style={{ marginRight: 3 }}
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
                <TouchableOpacity
                  key={day.dateStr || idx}
                  style={[styles.timelineBtn, isSelected && styles.timelineBtnSelected]}
                  onPress={() => setSelectedDayIdx(idx)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text
                    style={[
                      styles.timelineDayText,
                      isSelected && styles.timelineDayTextSelected,
                    ]}
                  >
                    {day.dayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* 3. Bottom Micro Pagination Indicator */}
      <View style={styles.paginationRow}>
        <TouchableOpacity
          onPress={() => handleSlideChange(0)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.paginationDot, activeSlide === 0 && styles.paginationDotActive]}
        />
        <TouchableOpacity
          onPress={() => handleSlideChange(1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.paginationDot, activeSlide === 1 && styles.paginationDotActive]}
        />
      </View>
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
    paddingTop: 16,
    paddingBottom: 10,
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
  // Segment Switcher Pill
  segmentPill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Soft Slate 100 track
    borderRadius: 14,
    padding: 2.5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtn: {
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 11,
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
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
    color: '#0284C7',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBtnSelected: {
    backgroundColor: '#0F172A', // Obsidian Black Pill!
    paddingHorizontal: 10,
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
  paginationDotActive: {
    width: 16,
    backgroundColor: '#0F172A',
  },
});
