import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { DailyLog } from '@/types';
import { haptics } from '@/utils/haptics';
import { usePro, ProPaywallModal } from '@/features/subscription';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import { computeCalorieDays, computeMacroRatioDays } from '@/features/nutrition/services';
import { computeMovementAnalytics } from '@/features/movement/services';
import { computeHydrationAnalytics } from '@/features/hydration/services';
import { computeWeightAnalytics } from '@/features/weight/services';

// Standardized Report Components
import {
  ReportPickerModal,
  ReportCategory,
  REPORT_CATEGORIES,
  CalorieCompletionCard,
  DayCalorieIntakeData,
  MacroDistributionCard,
  DayMacroRatioData,
  StepCompletionCard,
  DayStepData,
  StepCalorieBurnCard,
  DayCalorieData,
  StepTimeDurationCard,
  DayTimeData,
  StepTotalSummaryCard,
  DrinkCompletionCard,
  DayCompletionData,
  HydrateVolumeCard,
  DayHydrateData,
  DrinkTypesCard,
  DrinkTypeBreakdown,
  WeightSummaryCard,
  WeightSummaryData,
  WeightTrendCard,
  DayWeightTrendData,
  BMIGaugeCard,
} from '@/components/report';

export interface AnalyticsScreenProps {
  scrollRef?: React.RefObject<ScrollView | null>;
  initialScrollOffset?: number;
  onScrollPositionChange?: (offset: number) => void;
}

export type ReportTimeframe = 'weekly' | 'monthly' | 'yearly';

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
];

const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

const EmptyAnalyticsState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <View style={styles.emptyAnalyticsContainer}>
    <Ionicons name="bar-chart-outline" size={48} color={Colors.borderInset} />
    <Text style={styles.emptyAnalyticsTitle}>{title}</Text>
    <Text style={styles.emptyAnalyticsSubtitle}>{message}</Text>
  </View>
);



const AnalyticsScreenComponent: React.FC<AnalyticsScreenProps> = ({
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  const insets = useSafeAreaInsets();
  const { dailyLogs } = useDailyLog();
  const { userGoals } = useGoals();

  // Active Report Category (defaults to Nutrition)
  const [activeReport, setActiveReport] = useState<ReportCategory>('nutrition');
  const [reportPickerVisible, setReportPickerVisible] = useState(false);

  // Pro Subscription State
  const { isPro } = usePro();
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Timeframe and Navigation Offset
  const [timeframe, setTimeframe] = useState<ReportTimeframe>('weekly');
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  // Default day index (Mon=0..Sun=6)
  const defaultDayIndex = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }, []);

  // Independent Selected Day Index per chart so clicking one chart does not affect others
  // 1. Nutrition
  const [selectedCalorieIndex, setSelectedCalorieIndex] = useState<number>(defaultDayIndex);
  const [selectedMacroRatioIndex, setSelectedMacroRatioIndex] = useState<number>(defaultDayIndex);

  // 2. Step Activity (Step count, Calorie burn, Active duration)
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(defaultDayIndex);
  const [selectedStepCalorieIndex, setSelectedStepCalorieIndex] = useState<number>(defaultDayIndex);
  const [selectedStepTimeIndex, setSelectedStepTimeIndex] = useState<number>(defaultDayIndex);

  // 3. Hydration Intake (Completion & Volume)
  const [selectedWaterIndex, setSelectedWaterIndex] = useState<number>(defaultDayIndex);
  const [selectedHydrateVolumeIndex, setSelectedHydrateVolumeIndex] =
    useState<number>(defaultDayIndex);

  // 4. Weight & Body Trend
  const [selectedWeightIndex, setSelectedWeightIndex] = useState<number>(defaultDayIndex);

  // Preserve scroll offset if mounted from tab switch
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (initialScrollOffset > 0) {
        scrollRef?.current?.scrollTo({ y: initialScrollOffset, animated: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset, scrollRef]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    onScrollPositionChange?.(y);
  };

  // User Goals with clean fallbacks
  const dailyCalorieGoal = userGoals.dailyCalorieBudget || BIOMETRIC_DEFAULTS.dailyCalorieBudget;
  const dailyStepGoal = userGoals.stepGoal || BIOMETRIC_DEFAULTS.stepGoal;
  const dailyWaterGoal = userGoals.waterGoalMl || BIOMETRIC_DEFAULTS.waterGoalMl;
  const userWeightKg = userGoals.currentWeightKg || BIOMETRIC_DEFAULTS.currentWeightKg;
  const userHeightCm = userGoals.heightCm || BIOMETRIC_DEFAULTS.heightCm;
  const weightUnit: 'kg' | 'lbs' = userGoals.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitFactor = weightUnit === 'lbs' ? 2.20462 : 1;

  // Active Report Meta configuration
  const activeReportMeta = useMemo(() => {
    return REPORT_CATEGORIES.find(c => c.id === activeReport) || REPORT_CATEGORIES[0];
  }, [activeReport]);

  // Compute Active Period Date Range & Days
  const dateRangeInfo = useMemo(() => {
    const now = new Date();

    // 1. WEEKLY (Mon - Sun, 7 days)
    if (timeframe === 'weekly') {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday + periodOffset * 7);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monMonth = MONTH_NAMES[monday.getMonth()];
      const sunMonth = MONTH_NAMES[sunday.getMonth()];
      const monDay = monday.getDate();
      const sunDay = sunday.getDate();
      const year = sunday.getFullYear();

      const label =
        monMonth === sunMonth
          ? `${monMonth} ${monDay} – ${sunDay}, ${year}`
          : `${monMonth} ${monDay} – ${sunMonth} ${sunDay}, ${year}`;

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const log = dailyLogs[dateStr];

        return {
          dateStr,
          dayNum: d.getDate(),
          dayName: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
          log,
        };
      });

      return {
        label,
        days,
        allDates: days.map(d => d.dateStr),
        canGoForward: periodOffset < 0,
      };
    }

    // 2. MONTHLY (Calendar month grouped into interval buckets)
    if (timeframe === 'monthly') {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
      const year = targetMonth.getFullYear();
      const monthIdx = targetMonth.getMonth();
      const label = `${FULL_MONTH_NAMES[monthIdx]} ${year}`;
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

      const bucketRanges = [
        { start: 1, end: 7, name: '1-7' },
        { start: 8, end: 14, name: '8-14' },
        { start: 15, end: 21, name: '15-21' },
        { start: 22, end: 28, name: '22-28' },
        ...(daysInMonth > 28 ? [{ start: 29, end: daysInMonth, name: `29-${daysInMonth}` }] : []),
      ];

      const allDates: string[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const mm = String(monthIdx + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        allDates.push(`${year}-${mm}-${dd}`);
      }

      const days = bucketRanges.map((bucket, idx) => {
        const bucketDates: string[] = [];
        for (let d = bucket.start; d <= bucket.end; d++) {
          const mm = String(monthIdx + 1).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          bucketDates.push(`${year}-${mm}-${dd}`);
        }

        return {
          dateStr: bucketDates[0],
          dayNum: bucket.name,
          dayName: `W${idx + 1}`,
          bucketDates,
        };
      });

      return {
        label,
        days,
        allDates,
        canGoForward: periodOffset < 0,
      };
    }

    // 3. YEARLY (12 calendar months Jan - Dec)
    const targetYear = now.getFullYear() + periodOffset;
    const label = `${targetYear}`;
    const allDates: string[] = [];

    const days = MONTH_NAMES.map((name, monthIdx) => {
      const daysInMonth = new Date(targetYear, monthIdx + 1, 0).getDate();
      const monthDates: string[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const mm = String(monthIdx + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const ds = `${targetYear}-${mm}-${dd}`;
        monthDates.push(ds);
        allDates.push(ds);
      }

      return {
        dateStr: monthDates[0],
        dayNum: monthIdx + 1,
        dayName: name,
        monthDates,
      };
    });

    return {
      label,
      days,
      allDates,
      canGoForward: periodOffset < 0,
    };
  }, [timeframe, periodOffset, dailyLogs]);

  // Safe selected indices within bounds for each independent chart
  const maxDayIndex = Math.max(0, dateRangeInfo.days.length - 1);
  const safeCalorieIndex = Math.min(selectedCalorieIndex, maxDayIndex);
  const safeMacroRatioIndex = Math.min(selectedMacroRatioIndex, maxDayIndex);
  const safeStepIndex = Math.min(selectedStepIndex, maxDayIndex);
  const safeStepCalorieIndex = Math.min(selectedStepCalorieIndex, maxDayIndex);
  const safeStepTimeIndex = Math.min(selectedStepTimeIndex, maxDayIndex);
  const safeWaterIndex = Math.min(selectedWaterIndex, maxDayIndex);
  const safeHydrateVolumeIndex = Math.min(selectedHydrateVolumeIndex, maxDayIndex);
  const safeWeightIndex = Math.min(selectedWeightIndex, maxDayIndex);

  // =========================================================================
  // 1. NUTRITION REPORT DATA
  // =========================================================================
  const calorieDays: DayCalorieIntakeData[] = useMemo(() => {
    return computeCalorieDays(dateRangeInfo.days as any, dailyCalorieGoal, dailyLogs);
  }, [dateRangeInfo.days, dailyCalorieGoal, dailyLogs]);

  const macroRatioDays: DayMacroRatioData[] = useMemo(() => {
    return computeMacroRatioDays(dateRangeInfo.days as any, userGoals, dailyLogs);
  }, [dateRangeInfo.days, dailyLogs, userGoals]);

  // =========================================================================
  // 2. STEP REPORT DATA
  // =========================================================================
  const { stepDays, calorieBurnDays, timeDays, stepSummary } = useMemo(() => {
    return computeMovementAnalytics(
      dateRangeInfo.days as any,
      dailyLogs,
      dailyStepGoal,
      userWeightKg
    );
  }, [dateRangeInfo.days, dailyLogs, dailyStepGoal, userWeightKg]);

  // =========================================================================
  // 3. WATER REPORT DATA
  // =========================================================================
  const { waterCompletionDays, hydrateDays, drinkTypesBreakdown, totalDrinkVolume } =
    useMemo(() => {
      return computeHydrationAnalytics(
        dateRangeInfo.days as any,
        dailyLogs,
        dailyWaterGoal
      );
    }, [dateRangeInfo.days, dailyLogs, dailyWaterGoal]);

  // =========================================================================
  // 4. WEIGHT REPORT DATA
  // =========================================================================
  const { weightTrendDays, weightSummary } = useMemo(() => {
    return computeWeightAnalytics(
      dateRangeInfo.days as any,
      userWeightKg,
      userGoals,
      weightUnit,
      unitFactor
    );
  }, [dateRangeInfo.days, userWeightKg, unitFactor, weightUnit, userGoals]);

  // Date Navigation Handlers
  const handlePrevPeriod = () => setPeriodOffset(prev => prev - 1);
  const handleNextPeriod = () => {
    if (dateRangeInfo.canGoForward) {
      setPeriodOffset(prev => Math.min(0, prev + 1));
    }
  };

  // Plain-Language Insight Summary for Active Category
  const activeReportInsight = useMemo(() => {
    if (activeReport === 'nutrition') {
      const loggedDays = calorieDays.filter(d => d.calories > 0);
      if (loggedDays.length === 0) return null;
      const avgCals = Math.round(
        loggedDays.reduce((sum, d) => sum + d.calories, 0) / loggedDays.length
      );
      const diff = avgCals - dailyCalorieGoal;
      const onTrack = Math.abs(diff) <= 120;
      return {
        badge: 'Weekly Nutrition Insight',
        headline: `You averaged ${avgCals.toLocaleString()} kcal per day`,
        subline: onTrack
          ? `Consistent pacing: within ${Math.abs(diff)} kcal of your ${dailyCalorieGoal.toLocaleString()} kcal target.`
          : diff > 0
          ? `${diff} kcal above daily budget (${dailyCalorieGoal.toLocaleString()} kcal). Consider lighter snacks.`
          : `${Math.abs(diff)} kcal below daily budget (${dailyCalorieGoal.toLocaleString()} kcal). Ensure adequate protein intake.`,
        accentColor: Colors.primary,
        iconName: 'sparkles' as const,
      };
    }

    if (activeReport === 'steps') {
      const loggedDays = stepDays.filter(d => d.steps > 0);
      if (loggedDays.length === 0) return null;
      const avgSteps = Math.round(
        loggedDays.reduce((sum, d) => sum + d.steps, 0) / loggedDays.length
      );
      const diff = avgSteps - dailyStepGoal;
      return {
        badge: 'Movement Cadence',
        headline: `Averaging ${avgSteps.toLocaleString()} steps per day`,
        subline:
          diff >= 0
            ? `Achieved daily step goal on ${stepDays.filter(d => d.steps >= dailyStepGoal).length} of ${stepDays.length} days.`
            : `${Math.abs(diff).toLocaleString()} steps below your ${dailyStepGoal.toLocaleString()} goal. A 15-minute evening walk can close the gap.`,
        accentColor: Colors.steps,
        iconName: 'footsteps-outline' as const,
      };
    }

    if (activeReport === 'water') {
      const loggedDays = waterCompletionDays.filter(d => d.intakeMl > 0);
      if (loggedDays.length === 0) return null;
      const avgWater = Math.round(
        loggedDays.reduce((sum, d) => sum + d.intakeMl, 0) / loggedDays.length
      );
      const diff = avgWater - dailyWaterGoal;
      return {
        badge: 'Hydration Consistency',
        headline: `Averaging ${avgWater.toLocaleString()} mL daily intake`,
        subline:
          diff >= 0
            ? `Well hydrated! Goal achieved on ${waterCompletionDays.filter(d => d.intakeMl >= dailyWaterGoal).length} of ${waterCompletionDays.length} days.`
            : `${Math.abs(diff)} mL below your ${dailyWaterGoal.toLocaleString()} mL target. Keep a water bottle nearby.`,
        accentColor: Colors.water,
        iconName: 'water-outline' as const,
      };
    }

    if (activeReport === 'weight') {
      const currentW = weightSummary.currentWeightKg ?? userWeightKg;
      const delta = weightSummary.netChangeKg ?? 0;
      const isLoss = delta < 0;
      return {
        badge: 'Weight Trajectory',
        headline: `Current: ${currentW.toFixed(1)} ${weightSummary.unit}`,
        subline:
          delta === 0
            ? 'Weight holding steady throughout this tracking period.'
            : isLoss
            ? `Net change of ${Math.abs(delta).toFixed(1)} ${weightSummary.unit} toward your target weight.`
            : `Net change of +${delta.toFixed(1)} ${weightSummary.unit} this period.`,
        accentColor: Colors.weight,
        iconName: 'scale-outline' as const,
      };
    }

    return null;
  }, [
    activeReport,
    calorieDays,
    dailyCalorieGoal,
    stepDays,
    dailyStepGoal,
    waterCompletionDays,
    dailyWaterGoal,
    weightSummary,
  ]);

  const handleChangeTimeframe = async (newTimeframe: ReportTimeframe) => {
    if (newTimeframe !== 'weekly' && !isPro) {
      await haptics.impactLight();
      setPaywallVisible(true);
      return;
    }
    await haptics.selection();
    if (newTimeframe !== timeframe) {
      setTimeframe(newTimeframe);
      setPeriodOffset(0);
      setSelectedCalorieIndex(0);
      setSelectedMacroRatioIndex(0);
      setSelectedStepIndex(0);
      setSelectedStepCalorieIndex(0);
      setSelectedStepTimeIndex(0);
      setSelectedWaterIndex(0);
      setSelectedHydrateVolumeIndex(0);
      setSelectedWeightIndex(0);
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* 1. Header with Screen Title and Dropdown Capsule */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Text style={styles.headerTitle}>Insights</Text>

          {/* Report Selector Capsule Button */}
          <Pressable
            style={({ pressed }) => [styles.reportCapsuleBtn, pressed && styles.btnPressed]}
            onPress={() => setReportPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Active report: ${activeReportMeta.title}. Tap to change report.`}
          >
            <View style={[styles.capsuleIconWrap, { backgroundColor: activeReportMeta.iconBg }]}>
              <Ionicons
                name={activeReportMeta.iconName}
                size={15}
                color={activeReportMeta.iconColor}
              />
            </View>
            <Text style={styles.capsuleTitle} numberOfLines={1}>
              {activeReportMeta.title}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#64748B" style={styles.capsuleChevron} />
          </Pressable>
        </View>
      </View>

      {/* 2. Unified Controls Bar: Timeframe Segment & Date Range Navigator */}
      <View style={styles.controlsBar}>
        {/* Timeframe Switcher Tabs */}
        <View style={styles.timeframeSegmentContainer}>
          {(['weekly', 'monthly', 'yearly'] as ReportTimeframe[]).map(tab => {
            const isActive = timeframe === tab;
            const isLocked = !isPro && tab !== 'weekly';
            const displayLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
            return (
              <Pressable
                key={tab}
                style={[styles.timeframeTab, isActive && styles.timeframeTabActive]}
                onPress={() => handleChangeTimeframe(tab)}
                accessibilityRole="button"
                accessibilityLabel={
                  isLocked
                    ? `${displayLabel} timeframe (Calorify Pro required)`
                    : `${displayLabel} timeframe`
                }
              >
                <View style={styles.tabContentRow}>
                  <Text
                    style={[styles.timeframeTabText, isActive && styles.timeframeTabTextActive]}
                  >
                    {displayLabel}
                  </Text>
                  {isLocked && (
                    <Ionicons
                      name="lock-closed"
                      size={10}
                      color="#94A3B8"
                      style={{ marginLeft: 3 }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Date Range Navigator */}
        <View style={styles.dateNavigator}>
          <Pressable
            style={({ pressed }) => [styles.navArrowBtn, pressed && styles.btnPressed]}
            onPress={handlePrevPeriod}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Previous time period"
          >
            <Ionicons name="chevron-back" size={18} color="#0F172A" />
          </Pressable>

          <Text style={styles.dateRangeText} numberOfLines={1}>
            {dateRangeInfo.label}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.navArrowBtn,
              !dateRangeInfo.canGoForward && styles.navArrowDisabled,
              pressed && dateRangeInfo.canGoForward && styles.btnPressed,
            ]}
            onPress={handleNextPeriod}
            disabled={!dateRangeInfo.canGoForward}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Next time period"
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={dateRangeInfo.canGoForward ? '#0F172A' : 'rgba(15, 23, 42, 0.2)'}
            />
          </Pressable>
        </View>
      </View>

      {/* 3. Main Scrollable Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 16, 96) },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Plain-Language Insight Summary Card */}
        {activeReportInsight && (
          <View style={styles.insightSummaryCard}>
            <View style={styles.insightHeaderRow}>
              <View
                style={[
                  styles.insightIconBadge,
                  { backgroundColor: `${activeReportInsight.accentColor}18` },
                ]}
              >
                <Ionicons
                  name={activeReportInsight.iconName}
                  size={14}
                  color={activeReportInsight.accentColor}
                />
              </View>
              <Text
                style={[styles.insightBadgeText, { color: activeReportInsight.accentColor }]}
              >
                {activeReportInsight.badge.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.insightHeadlineText}>{activeReportInsight.headline}</Text>
            <Text style={styles.insightSublineText}>{activeReportInsight.subline}</Text>
          </View>
        )}

        {/* NUTRITION & CALORIES REPORT */}
        {activeReport === 'nutrition' && (
          calorieDays.some(d => d.calories > 0) ? (
            <>
              <CalorieCompletionCard
                days={calorieDays}
                selectedIndex={safeCalorieIndex}
                onSelectDay={setSelectedCalorieIndex}
                calorieGoal={dailyCalorieGoal}
              />
  
              <MacroDistributionCard
                days={macroRatioDays}
                selectedIndex={safeMacroRatioIndex}
                onSelectDay={setSelectedMacroRatioIndex}
                targets={{
                  protein: userGoals?.targetProtein || 140,
                  carbs: userGoals?.targetCarbs || 220,
                  fat: userGoals?.targetFat || 65,
                  fiber: userGoals?.targetFiber || 30,
                }}
              />
            </>
          ) : (
            <EmptyAnalyticsState 
              title="Awaiting Data" 
              message="Nutrition trends will appear here after you log meals for 3-7 days. Switch to the Today tab to log food." 
            />
          )
        )}

        {/* STEP ACTIVITY REPORT */}
        {activeReport === 'steps' && (
          <>
            <StepTotalSummaryCard
              totalSteps={stepSummary.totalSteps}
              totalCalories={stepSummary.totalCalories}
              totalDistanceKm={stepSummary.totalDistanceKm}
              totalDurationMinutes={stepSummary.totalDurationMinutes}
            />

            <StepCompletionCard
              days={stepDays}
              selectedIndex={safeStepIndex}
              onSelectDay={setSelectedStepIndex}
              stepGoal={dailyStepGoal}
            />

            <StepCalorieBurnCard
              days={calorieBurnDays}
              selectedIndex={safeStepCalorieIndex}
              onSelectDay={setSelectedStepCalorieIndex}
            />

            <StepTimeDurationCard
              days={timeDays}
              selectedIndex={safeStepTimeIndex}
              onSelectDay={setSelectedStepTimeIndex}
            />
          </>
        )}

        {/* HYDRATION INTAKE REPORT */}
        {activeReport === 'water' && (
          waterCompletionDays.some(d => d.intakeMl > 0) ? (
            <>
              <DrinkCompletionCard
                days={waterCompletionDays}
                selectedIndex={safeWaterIndex}
                onSelectDay={setSelectedWaterIndex}
              />
  
              <HydrateVolumeCard
                days={hydrateDays}
                selectedIndex={safeHydrateVolumeIndex}
                onSelectDay={setSelectedHydrateVolumeIndex}
              />
  
              <DrinkTypesCard breakdown={drinkTypesBreakdown} totalIntakeMl={totalDrinkVolume} />
            </>
          ) : (
            <EmptyAnalyticsState 
              title="Awaiting Data" 
              message="Hydration trends will appear here after you log your drinks. Switch to the Today tab to log water." 
            />
          )
        )}

        {/* WEIGHT & BODY REPORT */}
        {activeReport === 'weight' && (
          <>
            <WeightSummaryCard data={weightSummary} />

            <WeightTrendCard
              days={weightTrendDays}
              selectedIndex={safeWeightIndex}
              onSelectDay={setSelectedWeightIndex}
              unit={weightUnit}
              targetWeightKg={userGoals.targetWeightKg}
            />

            <BMIGaugeCard weightKg={userWeightKg} heightCm={userHeightCm} unit={weightUnit} />
          </>
        )}
      </ScrollView>

      {/* 4. Report Selector Bottom Sheet Modal */}
      <ReportPickerModal
        visible={reportPickerVisible}
        activeReport={activeReport}
        onSelectReport={setActiveReport}
        onClose={() => setReportPickerVisible(false)}
      />

      {/* 5. Pro Paywall for Deep Trends */}
      <ProPaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        highlightFeature="Deep Monthly & Annual Trends"
      />
    </View>
  );
};

export const AnalyticsScreen = React.memo(AnalyticsScreenComponent);
export const AnalyticsTab = AnalyticsScreen;

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FAF9F6',
    minHeight: 56,
    justifyContent: 'center',
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    lineHeight: 34,
    color: '#0F172A',
    letterSpacing: -0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  reportCapsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingLeft: 7,
    paddingRight: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    maxWidth: 220,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  capsuleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  capsuleTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#0F172A',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  capsuleChevron: {
    marginLeft: 4,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  controlsBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FAF9F6',
  },
  timeframeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 3,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    shadowOpacity: 0,
    elevation: 0,
  },
  timeframeTabText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#64748B',
  },
  timeframeTabTextActive: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 6,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  navArrowDisabled: {
    opacity: 0.35,
    backgroundColor: 'transparent',
  },
  dateRangeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#0F172A',
    marginHorizontal: 14,
    letterSpacing: -0.2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  emptyAnalyticsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 32,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  emptyAnalyticsTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    marginTop: 16,
  },
  emptyAnalyticsSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  insightSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: 14,
    marginBottom: 12,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  insightIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  insightHeadlineText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 2,
  },
  insightSublineText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
  },
});
