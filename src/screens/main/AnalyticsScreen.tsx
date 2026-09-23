import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { useAnalytics, useGoals, useDailyLog } from '@/context/HealthContext';
import { WorkoutHistoryCard } from '@/components/analytics/WorkoutHistoryCard';




type TimeRange = '7d' | '30d';

interface WeeklyCluster {
  id: string;
  label: string;
  avgCalories: number;
  avgWaterMl: number;
  avgSteps: number;
  totalBurn: number;
  daysLogged: number;
}

const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };
const HIT_SLOP_4 = { top: 8, bottom: 8, left: 4, right: 4 };

// Precision vertical metrics for pixel-perfect chart and benchmark alignment
const BAR_TOP_SPACE = 20;
const BAR_TRACK_HEIGHT = 96;
const BAR_BOTTOM_SPACE = 26;
const CHART_CANVAS_HEIGHT = BAR_TOP_SPACE + BAR_TRACK_HEIGHT + BAR_BOTTOM_SPACE; // 142px

interface AnalyticsScreenProps {
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  initialScrollOffset?: number;
  onScrollPositionChange?: (offset: number) => void;
}

const AnimatedBarFill = React.memo(function AnimatedBarFill({
  heightPct,
  color,
  barAnim,
}: {
  heightPct: number;
  color: string;
  barAnim: SharedValue<number>;
}) {
  const fillStyle = useAnimatedStyle(() => ({
    height: `${interpolate(barAnim.value, [0, 1], [0, Math.max(10, heightPct)])}%`,
  }));
  return <Animated.View style={[styles.barFill, fillStyle, { backgroundColor: color }]} />;
});

const AnalyticsScreenComponent: React.FC<AnalyticsScreenProps> = ({
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isSmallDevice = screenWidth < 375;
  const isVerySmallDevice = screenWidth < 340;

  const { weeklyLogs, dailyLogs } = useAnalytics();
  const { userGoals } = useGoals();
  const { selectedDate } = useDailyLog();

  type MetricTab = 'calories' | 'water' | 'steps';


  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [metricTab, setMetricTab] = useState<MetricTab>('calories');
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(6); // shared across tabs
  const [selectedClusterIdx, setSelectedClusterIdx] = useState<number | null>(3);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (initialScrollOffset > 0) {
        scrollRef?.current?.scrollTo({ y: initialScrollOffset, animated: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset, scrollRef]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollPositionChange?.(event.nativeEvent.contentOffset.y);
  }, [onScrollPositionChange]);

  // Animations -- shared across all metric tabs
  const scrollY = useSharedValue(0);
  const barAnim = useSharedValue(0);
  const tooltipAnim = useSharedValue(1);

  const budget = userGoals.dailyCalorieBudget || 2200;
  const waterGoal = userGoals.waterGoalMl || 2000;
  const stepGoal = userGoals.stepGoal || 10000;
  const targetProtein = userGoals.targetProtein || 90;
  const targetCarbs = userGoals.targetCarbs || 110;
  const targetFat = userGoals.targetFat || 70;
  const targetFiber = userGoals.targetFiber || 30;

  // Responsive bar width calculations so bars fit gracefully on any device without crowding
  const barWidth7D = isVerySmallDevice ? 20 : isSmallDevice ? 24 : 28;
  const barWidth30D = isVerySmallDevice ? 28 : isSmallDevice ? 34 : 40;

  // Animate bars on horizon or metric tab change
  useEffect(() => {
    barAnim.value = 0;
    barAnim.value = withTiming(1, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [timeRange, metricTab, barAnim]);

  const triggerTooltipAnim = useCallback(() => {
    tooltipAnim.value = 0;
    tooltipAnim.value = withTiming(1, { duration: 150 });
  }, [tooltipAnim]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    if (range === timeRange) return;
    setTimeRange(range);
    setSelectedBarIdx(range === '7d' ? 6 : null);
    setSelectedClusterIdx(range === '30d' ? 3 : null);
  }, [timeRange]);

  const handleMetricTabChange = useCallback((tab: MetricTab) => {
    if (tab === metricTab) return;
    setMetricTab(tab);
    // Reset selection so tooltip shows cleanly for the new metric
    setSelectedBarIdx(timeRange === '7d' ? 6 : null);
    setSelectedClusterIdx(timeRange === '30d' ? 3 : null);
  }, [metricTab, timeRange]);

  const getDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatTooltipDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    }
    return dateStr;
  };

  // 30-Day Dataset: 4 Weekly Clusters computed dynamically from actual dailyLogs
  const thirtyDayClusters = useMemo((): WeeklyCluster[] => {
    const parts = (selectedDate || '').split('-');
    const curr = parts.length === 3
      ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      : new Date();

    const clusters: WeeklyCluster[] = [];
    for (let w = 3; w >= 0; w--) {
      let sumCals = 0;
      let sumWater = 0;
      let sumSteps = 0;
      let sumBurn = 0;
      let daysLogged = 0;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date(curr);
        d.setDate(curr.getDate() - (w * 7 + dayOffset));
        const dateStr = getDateString(d);
        const log = dailyLogs[dateStr];
        if (log) {
          const cals = Array.isArray(log.meals) ? log.meals.reduce((sum, m) => sum + m.calories, 0) : 0;
          if (cals > 0) {
            sumCals += cals;
            daysLogged++;
          }
          sumWater += log.waterMl || 0;
          sumSteps += log.steps || 0;
          const workoutBurn = Array.isArray(log.activities)
            ? log.activities.reduce((sum, a) => sum + a.caloriesBurned, 0)
            : 0;
          const stepBurn = (log.steps || 0) > 0 ? Math.round((log.steps || 0) * 0.04) : 0;
          sumBurn += (workoutBurn + stepBurn);
        }
      }

      const divisor = Math.max(1, daysLogged);
      clusters.push({
        id: `week_${3 - w}`,
        label: w === 0 ? 'This Wk' : `Wk -${w}`,
        avgCalories: Math.round(sumCals / divisor),
        avgWaterMl: Math.round(sumWater / 7),
        avgSteps: Math.round(sumSteps / 7),
        totalBurn: sumBurn,
        daysLogged,
      });
    }
    return clusters;
  }, [dailyLogs]);

  // Total days with real logged meals in the past 30 days
  const totalDaysLoggedPast30 = useMemo(() => {
    return thirtyDayClusters.reduce((sum, c) => sum + c.daysLogged, 0);
  }, [thirtyDayClusters]);

  // ==========================================
  // TRUE 7-DAY & 30-DAY AGGREGATE CALCULATIONS
  // ==========================================
  const weeklyMetrics = useMemo(() => {
    const loggedDays = weeklyLogs.filter((d) => d.calories > 0);
    const loggedCount = loggedDays.length;

    // Calories & Deficit
    const sumCalories = loggedDays.reduce((sum, d) => sum + d.calories, 0);
    const avgDailyCalories = loggedCount > 0 ? Math.round(sumCalories / loggedCount) : 0;
    const totalBurn = weeklyLogs.reduce((sum, d) => sum + (d.burned || 0), 0);
    
    // Net Deficit Calculation: based on days actually logged
    const effectiveBudget = budget * loggedCount;
    const netDiff = loggedCount > 0 ? (effectiveBudget + totalBurn) - sumCalories : 0;
    const isDeficit = netDiff >= 0;
    const projectedFatLossKg = loggedCount > 0 ? (Math.abs(netDiff) / 7700).toFixed(2) : '0.00';

    // Consistency
    const onBudgetDays = loggedDays.filter((d) => d.calories <= d.target * 1.05).length;
    const adherencePct = loggedCount > 0 ? Math.round((onBudgetDays / loggedCount) * 100) : 0;

    // True 7-Day Macros
    const sumProtein = loggedDays.reduce((sum, d) => sum + (d.protein || 0), 0);
    const sumCarbs = loggedDays.reduce((sum, d) => sum + (d.carbs || 0), 0);
    const sumFat = loggedDays.reduce((sum, d) => sum + (d.fat || 0), 0);
    const sumFiber = loggedDays.reduce((sum, d) => sum + (d.fiber || 0), 0);

    const avgProtein = loggedCount > 0 ? Math.round(sumProtein / loggedCount) : 0;
    const avgCarbs = loggedCount > 0 ? Math.round(sumCarbs / loggedCount) : 0;
    const avgFat = loggedCount > 0 ? Math.round(sumFat / loggedCount) : 0;
    const avgFiber = loggedCount > 0 ? Math.round(sumFiber / loggedCount) : 0;

    // Hydration
    const totalWater = weeklyLogs.reduce((sum, d) => sum + (d.waterMl || 0), 0);
    const avgWater = Math.round(totalWater / 7);
    const waterGoalMetDays = weeklyLogs.filter((d) => (d.waterMl || 0) >= waterGoal).length;

    // Movement
    const totalSteps = weeklyLogs.reduce((sum, d) => sum + (d.steps || 0), 0);
    const avgSteps = Math.round(totalSteps / 7);
    const totalDistanceKm = (totalSteps * 0.00078).toFixed(1);

    return {
      loggedCount,
      avgDailyCalories,
      totalBurn,
      netDiff,
      isDeficit,
      projectedFatLossKg,
      onBudgetDays,
      adherencePct,
      avgProtein,
      avgCarbs,
      avgFat,
      avgFiber,
      avgWater,
      waterGoalMetDays,
      avgSteps,
      totalDistanceKm,
    };
  }, [weeklyLogs, budget, waterGoal]);

  // True 30-Day Aggregate Calculations across 4-week window
  const thirtyDayMetrics = useMemo(() => {
    let totalCals = 0;
    let totalWater = 0;
    let totalSteps = 0;
    let totalBurn = 0;
    let totalLoggedDays = 0;
    let onBudgetDays = 0;
    let waterGoalMetDays = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    let totalFiber30 = 0;

    const parts = (selectedDate || '').split('-');
    const curr = parts.length === 3
      ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      : new Date();

    for (let dayOffset = 0; dayOffset < 28; dayOffset++) {
      const d = new Date(curr);
      d.setDate(curr.getDate() - dayOffset);
      const dateStr = getDateString(d);
      const log = dailyLogs[dateStr];
      if (log) {
        const cals = Array.isArray(log.meals) ? log.meals.reduce((sum, m) => sum + m.calories, 0) : 0;
        if (cals > 0) {
          totalCals += cals;
          totalLoggedDays++;
          if (cals <= budget * 1.05) {
            onBudgetDays++;
          }
          const p = Array.isArray(log.meals) ? log.meals.reduce((sum, m) => sum + (m.protein || 0), 0) : 0;
          const c = Array.isArray(log.meals) ? log.meals.reduce((sum, m) => sum + (m.carbs || 0), 0) : 0;
          const f = Array.isArray(log.meals) ? log.meals.reduce((sum, m) => sum + (m.fat || 0), 0) : 0;
          const fb = Array.isArray(log.meals) ? log.meals.reduce((sum, m) => sum + (m.fiber || 0), 0) : 0;
          totalProtein += p;
          totalCarbs += c;
          totalFat += f;
          totalFiber30 += fb;
        }
        const water = log.waterMl || 0;
        totalWater += water;
        if (water >= waterGoal) {
          waterGoalMetDays++;
        }
        const steps = log.steps || 0;
        totalSteps += steps;
        const workoutBurn = Array.isArray(log.activities)
          ? log.activities.reduce((sum, a) => sum + a.caloriesBurned, 0)
          : 0;
        const stepBurn = steps > 0 ? Math.round(steps * 0.04) : 0;
        totalBurn += (workoutBurn + stepBurn);
      }
    }

    const divisor = Math.max(1, totalLoggedDays);
    const avgDailyCalories = totalLoggedDays > 0 ? Math.round(totalCals / totalLoggedDays) : 0;
    const avgWater = Math.round(totalWater / 28);
    const avgSteps = Math.round(totalSteps / 28);
    const totalDistanceKm = (totalSteps * 0.00078).toFixed(1);
    const adherencePct = totalLoggedDays > 0 ? Math.round((onBudgetDays / totalLoggedDays) * 100) : 0;

    const avgProtein = totalLoggedDays > 0 ? Math.round(totalProtein / divisor) : 0;
    const avgCarbs = totalLoggedDays > 0 ? Math.round(totalCarbs / divisor) : 0;
    const avgFat = totalLoggedDays > 0 ? Math.round(totalFat / divisor) : 0;
    const avgFiber = totalLoggedDays > 0 ? Math.round(totalFiber30 / divisor) : 0;

    const effectiveBudget = budget * totalLoggedDays;
    const netDiff = totalLoggedDays > 0 ? (effectiveBudget + totalBurn) - totalCals : 0;
    const isDeficit = netDiff >= 0;

    return {
      loggedCount: totalLoggedDays,
      avgDailyCalories,
      totalBurn,
      netDiff,
      isDeficit,
      adherencePct,
      avgWater,
      waterGoalMetDays,
      avgSteps,
      totalDistanceKm,
      avgProtein,
      avgCarbs,
      avgFat,
      avgFiber,
    };
  }, [dailyLogs, selectedDate, budget, waterGoal]);


  // Dynamically points to the active horizon's true performance metrics
  const currentMetrics = timeRange === '7d' ? weeklyMetrics : thirtyDayMetrics;

  // Selected Day for Interactive Tooltip (Always shows calories, goal, and status!)
  const activeTooltipData = useMemo(() => {
    if (timeRange === '7d' && selectedBarIdx !== null) {
      const item = weeklyLogs[selectedBarIdx];
      if (!item) return null;
      const targetVal = item.target || budget;
      const diff = item.calories - targetVal;
      const isOnBudget = item.calories <= targetVal * 1.05;
      const remaining = Math.max(0, targetVal - item.calories);
      return {
        label: selectedBarIdx === weeklyLogs.length - 1 ? 'Today' : item.dayName,
        dateFormatted: formatTooltipDate(item.date),
        calories: item.calories,
        hasData: item.calories > 0,
        targetVal,
        diff,
        remaining,
        isOnBudget,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      };
    }
    if (timeRange === '30d' && selectedClusterIdx !== null) {
      const cluster = thirtyDayClusters[selectedClusterIdx];
      if (!cluster) return null;
      return {
        label: cluster.label,
        dateFormatted: `${cluster.daysLogged}/7 days logged`,
        calories: cluster.avgCalories,
        hasData: cluster.daysLogged > 0,
        targetVal: budget,
        diff: cluster.avgCalories - budget,
        remaining: Math.max(0, budget - cluster.avgCalories),
        isOnBudget: cluster.avgCalories <= budget * 1.05,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }
    return null;
  }, [timeRange, selectedBarIdx, selectedClusterIdx, weeklyLogs, thirtyDayClusters, budget]);

  // Selected Day for Interactive Water Tooltip (shares selectedBarIdx with other tabs)
  const activeWaterTooltipData = useMemo(() => {
    if (timeRange === '7d' && selectedBarIdx !== null) {
      const item = weeklyLogs[selectedBarIdx];
      if (!item) return null;
      const targetVal = waterGoal;
      const val = item.waterMl || 0;
      const diff = val - targetVal;
      const isMet = val >= targetVal;
      const remaining = Math.max(0, targetVal - val);
      const glasses = (val / 250).toFixed(1).replace(/\.0$/, '');
      return {
        label: selectedBarIdx === weeklyLogs.length - 1 ? 'Today' : item.dayName,
        dateFormatted: formatTooltipDate(item.date),
        waterMl: val,
        hasData: val > 0,
        targetVal,
        diff,
        remaining,
        isMet,
        glasses,
      };
    }
    if (timeRange === '30d' && selectedClusterIdx !== null) {
      const cluster = thirtyDayClusters[selectedClusterIdx];
      if (!cluster) return null;
      const val = cluster.avgWaterMl;
      const diff = val - waterGoal;
      const isMet = val >= waterGoal;
      const remaining = Math.max(0, waterGoal - val);
      const glasses = (val / 250).toFixed(1).replace(/\.0$/, '');
      return {
        label: cluster.label,
        dateFormatted: `${cluster.daysLogged}/7 days logged`,
        waterMl: val,
        hasData: cluster.daysLogged > 0,
        targetVal: waterGoal,
        diff,
        remaining,
        isMet,
        glasses,
      };
    }
    return null;
  }, [timeRange, selectedBarIdx, selectedClusterIdx, weeklyLogs, thirtyDayClusters, waterGoal]);

  // Selected Day for Interactive Steps Tooltip (shares selectedBarIdx with other tabs)
  const activeStepTooltipData = useMemo(() => {
    if (timeRange === '7d' && selectedBarIdx !== null) {
      const item = weeklyLogs[selectedBarIdx];
      if (!item) return null;
      const targetVal = stepGoal;
      const val = item.steps || 0;
      const diff = val - targetVal;
      const isMet = val >= targetVal;
      const remaining = Math.max(0, targetVal - val);
      const distanceKm = (val * 0.00078).toFixed(1);
      const stepBurn = val > 0 ? Math.round(val * 0.04) : 0;
      return {
        label: selectedBarIdx === weeklyLogs.length - 1 ? 'Today' : item.dayName,
        dateFormatted: formatTooltipDate(item.date),
        steps: val,
        hasData: val > 0,
        targetVal,
        diff,
        remaining,
        isMet,
        distanceKm,
        stepBurn,
      };
    }
    if (timeRange === '30d' && selectedClusterIdx !== null) {
      const cluster = thirtyDayClusters[selectedClusterIdx];
      if (!cluster) return null;
      const val = cluster.avgSteps;
      const diff = val - stepGoal;
      const isMet = val >= stepGoal;
      const remaining = Math.max(0, stepGoal - val);
      const distanceKm = (val * 0.00078).toFixed(1);
      const stepBurn = val > 0 ? Math.round(val * 0.04) : 0;
      return {
        label: cluster.label,
        dateFormatted: `${cluster.daysLogged}/7 days logged`,
        steps: val,
        hasData: cluster.daysLogged > 0,
        targetVal: stepGoal,
        diff,
        remaining,
        isMet,
        distanceKm,
        stepBurn,
      };
    }
    return null;
  }, [timeRange, selectedBarIdx, selectedClusterIdx, weeklyLogs, thirtyDayClusters, stepGoal]);

  // Scroll animations
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, 50], [0, -3], 'clamp') },
      { scale: interpolate(scrollY.value, [0, 50], [1, 0.78], 'clamp') },
    ],
  }));

  const subtitleAtRestStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 25], [1, 0], 'clamp'),
  }));

  const adaptiveContextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [20, 45], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [20, 45], [4, 0], 'clamp') }],
  }));

  const headerBorderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [15, 40], [0, 1], 'clamp'),
  }));

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipAnim.value,
    transform: [{ scale: interpolate(tooltipAnim.value, [0, 1], [0.94, 1]) }],
  }));

  // Dynamic max scale for bar charts so peak days don't cap out (respects active horizon)
  const maxChartCalorie = useMemo(() => {
    const values = timeRange === '7d'
      ? weeklyLogs.map((d) => d.calories)
      : thirtyDayClusters.map((c) => c.avgCalories);
    const maxLogged = Math.max(...values, budget);
    return Math.max(budget * 1.25, maxLogged * 1.1);
  }, [weeklyLogs, thirtyDayClusters, timeRange, budget]);

  const maxChartWater = useMemo(() => {
    const values = timeRange === '7d'
      ? weeklyLogs.map((d) => d.waterMl || 0)
      : thirtyDayClusters.map((c) => c.avgWaterMl);
    const maxLogged = Math.max(...values, waterGoal);
    return Math.max(waterGoal * 1.25, maxLogged * 1.1);
  }, [weeklyLogs, thirtyDayClusters, timeRange, waterGoal]);

  const maxChartSteps = useMemo(() => {
    const values = timeRange === '7d'
      ? weeklyLogs.map((d) => d.steps || 0)
      : thirtyDayClusters.map((c) => c.avgSteps);
    const maxLogged = Math.max(...values, stepGoal);
    return Math.max(stepGoal * 1.25, maxLogged * 1.1);
  }, [weeklyLogs, thirtyDayClusters, timeRange, stepGoal]);

  return (
    <View style={styles.rootContainer}>
      {/* 0. Dedicated Nutrition & Health Trends Top App Bar */}
      <View style={styles.headerContainer}>
        <Animated.View style={[styles.headerBorder, headerBorderStyle]} />

        <View style={styles.headerMainRow}>
          {/* Title: Scales down smoothly on scroll with margin to prevent crowding */}
          <Animated.View
            style={[
              { flex: 1, transformOrigin: 'left center', justifyContent: 'center', marginRight: 10 },
              titleStyle,
            ]}
          >
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Nutrition & Health Trends
            </Text>
          </Animated.View>

          {/* Right Action: Time Horizon Selector Pill */}
          <View style={styles.horizonHeaderPill}>
            <Pressable
              style={[
                styles.horizonPillBtn,
                timeRange === '7d' ? styles.horizonPillBtnActive : null,
              ]}
              onPress={() => handleTimeRangeChange('7d')}
              hitSlop={HIT_SLOP_4}
              accessibilityRole="button"
              accessibilityLabel="Show 7-day analytics"
            >
              <Text
                style={[
                  styles.horizonPillText,
                  timeRange === '7d' ? styles.horizonPillTextActive : null,
                ]}
              >
                7D
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.horizonPillBtn,
                timeRange === '30d' ? styles.horizonPillBtnActive : null,
              ]}
              onPress={() => handleTimeRangeChange('30d')}
              hitSlop={HIT_SLOP_4}
              accessibilityRole="button"
              accessibilityLabel="Show 30-day analytics"
            >
              <Text
                style={[
                  styles.horizonPillText,
                  timeRange === '30d' ? styles.horizonPillTextActive : null,
                ]}
              >
                30D
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Subtitle Zone: At rest displays description; on scroll reveals adaptive status pill */}
        <View style={styles.subtitleZone}>
          <Animated.View
            style={[styles.subtitleStack, subtitleAtRestStyle]}
            pointerEvents="none"
          >
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {timeRange === '7d'
                ? 'Your weekly nutrition & habit consistency'
                : 'Your 30-day nutrition & habit consistency'}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.subtitleStack,
              adaptiveContextStyle,
            ]}
          >
            <View style={styles.adaptiveStatusBadge}>
              <View
                style={[
                  styles.adaptiveStatusDot,
                  { backgroundColor: currentMetrics.isDeficit ? '#22C55E' : '#F47551' },
                ]}
              />
              <Text style={styles.adaptiveStatusText}>
                {timeRange === '7d' ? '7-Day Trend' : '30-Day Trend'}
              </Text>
                <Text style={styles.adaptiveStatusDivider}>|</Text>
              <Text style={styles.adaptiveStatusMetric}>
                {currentMetrics.loggedCount === 0
                  ? 'Tracking baseline'
                  : currentMetrics.isDeficit
                  ? `-${currentMetrics.netDiff.toLocaleString()} kcal Deficit`
                  : `+${Math.abs(currentMetrics.netDiff).toLocaleString()} kcal Surplus`}
              </Text>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <Animated.ScrollView
        ref={scrollRef as any}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {/* ========================================================= */}
        {/* LAYER 1: THE VERDICT — Executive Performance Hero Card    */}
        {/* ========================================================= */}
        <View style={styles.heroCard}>
          {/* Top Row: Category & Adherence Pill */}
          <View style={[styles.heroCardHeaderRow, isSmallDevice ? { flexWrap: 'wrap', gap: 6 } : null]}>
            <View style={styles.heroTagWrap}>
              <Text style={styles.heroCategoryLabel}>
                {timeRange === '7d' ? 'WEEKLY PERFORMANCE' : '30-DAY PERFORMANCE'}
              </Text>
            </View>
            <View
              style={[
                styles.adherenceBadge,
                currentMetrics.isDeficit ? styles.adherenceBadgeGreen : styles.adherenceBadgeCoral,
              ]}
            >
              <Ionicons
                name={currentMetrics.isDeficit ? 'shield-checkmark' : 'alert-circle'}
                size={13}
                color={currentMetrics.isDeficit ? '#059669' : '#EA580C'}
              />
              <Text
                style={[
                  styles.adherenceBadgeText,
                  currentMetrics.isDeficit ? styles.adherenceTextGreen : styles.adherenceTextCoral,
                ]}
              >
                {currentMetrics.adherencePct}% on target
              </Text>
            </View>
          </View>

          {/* Primary Hero Metric: Average Daily Calories */}
          <View style={styles.heroValueContainer}>
            <View style={styles.heroMainValueRow}>
              <Text
                style={styles.heroMainValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {currentMetrics.loggedCount > 0
                  ? currentMetrics.avgDailyCalories.toLocaleString()
                  : budget.toLocaleString()}
              </Text>
              <Text style={styles.heroUnit}>kcal / day</Text>
            </View>
            <Text
              style={styles.heroBenchmarkSub}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              <Text>Goal: {budget.toLocaleString()} kcal</Text>
              {currentMetrics.loggedCount > 0 ? (
                currentMetrics.avgDailyCalories <= budget ? (
                  <>
                    <Text style={styles.heroBenchmarkDot}>{' \u2022 '}</Text>
                    <Text style={styles.heroTextGreen}>
                      -{Math.abs(budget - currentMetrics.avgDailyCalories).toLocaleString()} kcal under budget
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.heroBenchmarkDot}>{' \u2022 '}</Text>
                    <Text style={styles.heroTextCoral}>
                      +{Math.abs(currentMetrics.avgDailyCalories - budget).toLocaleString()} kcal over budget
                    </Text>
                  </>
                )
              ) : (
                <>
                  <Text style={styles.heroBenchmarkDot}>{' \u2022 '}</Text>
                  <Text style={styles.heroBenchmarkSubMuted}>Tracking baseline</Text>
                </>
              )}
            </Text>
          </View>

          {/* 3 Vitality Pillars (Nutrition | Hydration | Movement) */}
          <View style={styles.kpiTriadRow}>
            {/* Pillar 1: Nutrition Intake */}
            <View style={[styles.kpiCol, styles.kpiColBorder]}>
              <View style={styles.pillarTitleRow}>
                <Ionicons name="nutrition-outline" size={12} color="#16A34A" />
                <Text style={styles.pillarTitle}>INTAKE</Text>
              </View>
              <Text
                style={styles.kpiValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {currentMetrics.avgDailyCalories.toLocaleString()}
              </Text>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {currentMetrics.loggedCount === 0
                  ? 'No logs'
                  : currentMetrics.avgDailyCalories <= budget
                  ? 'On Budget'
                  : 'Surplus'}
              </Text>
            </View>

            {/* Pillar 2: Hydration Consistency */}
            <View style={[styles.kpiCol, styles.kpiColBorder]}>
              <View style={styles.pillarTitleRow}>
                <Ionicons name="water-outline" size={12} color="#0284C7" />
                <Text style={styles.pillarTitle}>WATER</Text>
              </View>
              <Text
                style={styles.kpiValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {(currentMetrics.avgWater / 1000).toFixed(1)} L
              </Text>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {currentMetrics.waterGoalMetDays}/{timeRange === '7d' ? '7' : '28'} days met
              </Text>
            </View>

            {/* Pillar 3: Movement / Steps */}
            <View style={styles.kpiCol}>
              <View style={styles.pillarTitleRow}>
                <Ionicons name="footsteps-outline" size={12} color="#EA580C" />
                <Text style={styles.pillarTitle}>STEPS</Text>
              </View>
              <Text
                style={styles.kpiValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {currentMetrics.avgSteps >= 1000 ? `${(currentMetrics.avgSteps / 1000).toFixed(1)}k` : currentMetrics.avgSteps}
              </Text>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {currentMetrics.totalDistanceKm} km total
              </Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* LAYER 2: THE PATTERN — Calories · Water · Steps Chart     */}
        {/* ========================================================= */}
        <View style={styles.chartCard}>
          {/* Card Title */}
          <View style={styles.chartHeaderBlock}>
            <View style={styles.chartTitleRow}>
              <View style={styles.chartTitleCol}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {metricTab === 'calories' ? 'Daily Calorie Intake'
                    : metricTab === 'water' ? 'Daily Water Intake'
                    : 'Daily Steps & Movement'}
                </Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {metricTab === 'calories' ? 'Tap any bar to inspect daily macros'
                    : metricTab === 'water' ? 'Tap any bar to inspect hydration'
                    : 'Tap any bar to inspect daily activity'}
                </Text>
              </View>

              {/* Dynamic goal badge */}
              {metricTab === 'calories' ? (
                <View style={styles.chartBudgetBadge}>
                  <Ionicons name="flame" size={11} color="#059669" />
                  <Text style={styles.chartBudgetBadgeText}>{budget.toLocaleString()} kcal</Text>
                </View>
              ) : metricTab === 'water' ? (
                <View style={styles.chartWaterBadge}>
                  <Ionicons name="water" size={11} color="#0284C7" />
                  <Text style={styles.chartWaterBadgeText}>{(waterGoal / 1000).toFixed(1)} L</Text>
                </View>
              ) : (
                <View style={styles.chartStepsBadge}>
                  <Ionicons name="footsteps" size={11} color="#EA580C" />
                  <Text style={styles.chartStepsBadgeText}>
                    {stepGoal >= 1000 ? `${(stepGoal / 1000).toFixed(0)}k` : stepGoal} steps
                  </Text>
                </View>
              )}
            </View>

            {/* Metric Tab Switcher */}
            <View style={styles.metricTabRow}>
              {(['calories', 'water', 'steps'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.metricTab, metricTab === tab ? styles.metricTabActive : null]}
                  onPress={() => handleMetricTabChange(tab)}
                  hitSlop={HIT_SLOP_8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: metricTab === tab }}
                >
                  <Ionicons
                    name={
                      tab === 'calories' ? 'flame' :
                      tab === 'water' ? 'water' : 'footsteps'
                    }
                    size={11}
                    color={
                      metricTab === tab
                        ? (tab === 'calories' ? '#22C55E'
                            : tab === 'water' ? '#0284C7'
                            : '#EA580C')
                        : '#94A3B8'
                    }
                  />
                  <Text
                    style={[
                      styles.metricTabText,
                      metricTab === tab
                        ? (tab === 'calories' ? styles.metricTabTextCalories
                            : tab === 'water' ? styles.metricTabTextWater
                            : styles.metricTabTextSteps)
                        : null,
                    ]}
                  >
                    {tab === 'calories' ? 'Calories' : tab === 'water' ? 'Water' : 'Steps'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Dynamic Legend Row */}
            <View style={styles.chartLegendRow}>
              <View style={styles.legendItem}>
                <View style={styles.legendDashSample} />
                <Text style={styles.legendLabel}>Goal Line</Text>
              </View>
              {metricTab === 'calories' ? (<>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.legendLabel}>On Budget</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F47551' }]} />
                  <Text style={styles.legendLabel}>Surplus</Text>
                </View>
              </>) : metricTab === 'water' ? (<>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
                  <Text style={styles.legendLabel}>Goal Met</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
                  <Text style={styles.legendLabel}>In Progress</Text>
                </View>
              </>) : (<>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
                  <Text style={styles.legendLabel}>Goal Met</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FB923C' }]} />
                  <Text style={styles.legendLabel}>Active</Text>
                </View>
              </>)}
            </View>
          </View>

          {/* ---- TOOLTIP: Calories ---- */}
          {metricTab === 'calories' && activeTooltipData ? (
            <Animated.View
              style={[
                styles.tooltipContainer,
                tooltipStyle,
              ]}
            >
              <View style={styles.tooltipMainRow}>
                <View style={styles.tooltipLeft}>
                  <Text style={styles.tooltipDayLabel} numberOfLines={1}>
                    {activeTooltipData.label}{' '}
                    <Text style={styles.tooltipDateSep}>|  </Text>
                    <Text style={styles.tooltipDateText}>{activeTooltipData.dateFormatted}</Text>
                  </Text>
                  <View style={styles.tooltipCalorieRow}>
                    <Text style={styles.tooltipCalsBold} numberOfLines={1}>
                      {activeTooltipData.calories.toLocaleString()}
                    </Text>
                    <Text style={styles.tooltipCalsBudget} numberOfLines={1}>
                      / {activeTooltipData.targetVal.toLocaleString()} kcal
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.tooltipStatusPill,
                    activeTooltipData.hasData
                      ? (activeTooltipData.isOnBudget ? styles.tooltipPillGreen : styles.tooltipPillCoral)
                      : styles.tooltipPillNeutral,
                  ]}
                >
                  <Ionicons
                    name={activeTooltipData.hasData ? (activeTooltipData.isOnBudget ? 'checkmark-circle' : 'alert-circle') : 'time-outline'}
                    size={12}
                    color={activeTooltipData.hasData ? (activeTooltipData.isOnBudget ? '#16A34A' : '#EA580C') : '#0284C7'}
                  />
                  <Text
                    style={[
                      styles.tooltipStatusText,
                      activeTooltipData.hasData ? (activeTooltipData.isOnBudget ? styles.tooltipTextGreen : styles.tooltipTextCoral) : styles.tooltipTextNeutral,
                    ]}
                    numberOfLines={1}
                  >
                    {activeTooltipData.hasData
                      ? (activeTooltipData.diff <= 0 ? `${Math.abs(activeTooltipData.diff)} kcal under` : `+${activeTooltipData.diff} kcal over`)
                      : `${activeTooltipData.remaining.toLocaleString()} kcal left`}
                  </Text>
                </View>
              </View>
              {activeTooltipData.hasData && activeTooltipData.protein > 0 ? (
                <View style={styles.tooltipMacroRow}>
                  <Text style={styles.tooltipMacroPill} numberOfLines={1}>
                    <Text style={{ color: '#16A34A', fontWeight: '700' }}>P </Text>{Math.round(activeTooltipData.protein)}g
                  </Text>
                  <Text style={styles.tooltipMacroPill} numberOfLines={1}>
                    <Text style={{ color: '#D97706', fontWeight: '700' }}>C </Text>{Math.round(activeTooltipData.carbs)}g
                  </Text>
                  <Text style={styles.tooltipMacroPill} numberOfLines={1}>
                    <Text style={{ color: '#EA580C', fontWeight: '700' }}>F </Text>{Math.round(activeTooltipData.fat)}g
                  </Text>
                </View>
              ) : (
                <View style={styles.tooltipEmptyRow}>
                  <Ionicons name="restaurant-outline" size={12} color="#94A3B8" />
                  <Text style={styles.tooltipEmptySub} numberOfLines={1}>No meals logged yet  -  Start logging today</Text>
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* ---- TOOLTIP: Water ---- */}
          {metricTab === 'water' && activeWaterTooltipData ? (
            <Animated.View
              style={[
                styles.tooltipContainer,
                tooltipStyle,
              ]}
            >
              <View style={styles.tooltipMainRow}>
                <View style={styles.tooltipLeft}>
                  <Text style={styles.tooltipDayLabel} numberOfLines={1}>
                    {activeWaterTooltipData.label}{' '}
                    <Text style={styles.tooltipDateSep}>|  </Text>
                    <Text style={styles.tooltipDateText}>{activeWaterTooltipData.dateFormatted}</Text>
                  </Text>
                  <View style={styles.tooltipCalorieRow}>
                    <Text style={styles.tooltipCalsBold} numberOfLines={1}>
                      {(activeWaterTooltipData.waterMl / 1000).toFixed(1)} L
                    </Text>
                    <Text style={styles.tooltipCalsBudget} numberOfLines={1}>
                      / {(activeWaterTooltipData.targetVal / 1000).toFixed(1)} L
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.tooltipStatusPill,
                    activeWaterTooltipData.hasData
                      ? (activeWaterTooltipData.isMet ? styles.tooltipPillBlueMet : styles.tooltipPillBlue)
                      : styles.tooltipPillNeutral,
                  ]}
                >
                  <Ionicons
                    name={activeWaterTooltipData.hasData ? (activeWaterTooltipData.isMet ? 'checkmark-circle' : 'water') : 'time-outline'}
                    size={12}
                    color={activeWaterTooltipData.hasData ? (activeWaterTooltipData.isMet ? '#0284C7' : '#0369A1') : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tooltipStatusText,
                      activeWaterTooltipData.hasData
                        ? (activeWaterTooltipData.isMet ? styles.tooltipTextBlueMet : styles.tooltipTextBlue)
                        : styles.tooltipTextNeutral,
                    ]}
                    numberOfLines={1}
                  >
                    {activeWaterTooltipData.hasData
                      ? (activeWaterTooltipData.isMet
                          ? (activeWaterTooltipData.diff > 0 ? `+${(activeWaterTooltipData.diff / 1000).toFixed(1)} L over` : 'Goal Met')
                          : `${(activeWaterTooltipData.remaining / 1000).toFixed(1)} L left`)
                      : `${(waterGoal / 1000).toFixed(1)} L left`}
                  </Text>
                </View>
              </View>
              <View style={styles.tooltipWaterRow}>
                <Ionicons name="sparkles" size={11} color="#0284C7" />
                <Text style={styles.tooltipWaterSub} numberOfLines={1}>
                  {activeWaterTooltipData.hasData
                    ? `~${activeWaterTooltipData.glasses} glasses  -  ${activeWaterTooltipData.isMet ? 'Optimal hydration' : 'Keep hydrating'}`
                    : 'No water logged yet  -  Drink a glass to start'}
                </Text>
              </View>
            </Animated.View>
          ) : null}

          {/* ---- TOOLTIP: Steps ---- */}
          {metricTab === 'steps' && activeStepTooltipData ? (
            <Animated.View
              style={[
                styles.tooltipContainer,
                tooltipStyle,
              ]}
            >
              <View style={styles.tooltipMainRow}>
                <View style={styles.tooltipLeft}>
                  <Text style={styles.tooltipDayLabel} numberOfLines={1}>
                    {activeStepTooltipData.label}{' '}
                    <Text style={styles.tooltipDateSep}>|  </Text>
                    <Text style={styles.tooltipDateText}>{activeStepTooltipData.dateFormatted}</Text>
                  </Text>
                  <View style={styles.tooltipCalorieRow}>
                    <Text style={styles.tooltipCalsBold} numberOfLines={1}>
                      {activeStepTooltipData.steps.toLocaleString()}
                    </Text>
                    <Text style={styles.tooltipCalsBudget} numberOfLines={1}>
                      / {activeStepTooltipData.targetVal.toLocaleString()} steps
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.tooltipStatusPill,
                    activeStepTooltipData.hasData
                      ? (activeStepTooltipData.isMet ? styles.tooltipPillOrangeMet : styles.tooltipPillOrange)
                      : styles.tooltipPillNeutral,
                  ]}
                >
                  <Ionicons
                    name={activeStepTooltipData.hasData ? (activeStepTooltipData.isMet ? 'checkmark-circle' : 'flame') : 'time-outline'}
                    size={12}
                    color={activeStepTooltipData.hasData ? (activeStepTooltipData.isMet ? '#EA580C' : '#C2410C') : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tooltipStatusText,
                      activeStepTooltipData.hasData
                        ? (activeStepTooltipData.isMet ? styles.tooltipTextOrangeMet : styles.tooltipTextOrange)
                        : styles.tooltipTextNeutral,
                    ]}
                    numberOfLines={1}
                  >
                    {activeStepTooltipData.hasData
                      ? (activeStepTooltipData.isMet
                          ? (activeStepTooltipData.diff > 0 ? `+${activeStepTooltipData.diff.toLocaleString()} over` : 'Goal Met')
                          : `${activeStepTooltipData.remaining.toLocaleString()} left`)
                      : `${stepGoal.toLocaleString()} left`}
                  </Text>
                </View>
              </View>
              {activeStepTooltipData.hasData ? (
                <View style={styles.tooltipStepsRow}>
                  <View style={styles.tooltipStepsSubPill}>
                    <Ionicons name="navigate-outline" size={11} color="#C2410C" />
                    <Text style={styles.tooltipStepsPill} numberOfLines={1}>{activeStepTooltipData.distanceKm} km</Text>
                  </View>
                  <View style={styles.tooltipStepsSubPill}>
                    <Ionicons name="flame-outline" size={11} color="#C2410C" />
                    <Text style={styles.tooltipStepsPill} numberOfLines={1}>+{activeStepTooltipData.stepBurn} kcal</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.tooltipEmptyRow}>
                  <Ionicons name="footsteps-outline" size={12} color="#94A3B8" />
                  <Text style={styles.tooltipEmptySub} numberOfLines={1}>No steps recorded yet  -  Take a walk today</Text>
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* ---- CHART CANVAS ---- */}
          <View style={styles.chartWrapper}>
            {/* Dashed Goal Benchmark Line */}
            <View
              style={[
                styles.benchmarkLineContainer,
                {
                  top: BAR_TOP_SPACE + Math.round(
                    (1 - (metricTab === 'calories' ? budget / maxChartCalorie
                           : metricTab === 'water' ? waterGoal / maxChartWater
                           : stepGoal / maxChartSteps)
                    ) * BAR_TRACK_HEIGHT
                  ),
                },
              ]}
            >
              <View style={styles.benchmarkDashedLine} />
            </View>

            {/* 7-Day Responsive Bars */}
            {timeRange === '7d' ? (
              <View style={styles.chartContainer}>
                {weeklyLogs.map((item, index) => {
                  const isSelected = selectedBarIdx === index;

                  // Metric-specific values
                  const val = metricTab === 'calories' ? item.calories
                              : metricTab === 'water' ? (item.waterMl || 0)
                              : (item.steps || 0);
                  const maxVal = metricTab === 'calories' ? maxChartCalorie
                                 : metricTab === 'water' ? maxChartWater
                                 : maxChartSteps;
                  const goal = metricTab === 'calories' ? budget
                               : metricTab === 'water' ? waterGoal
                               : stepGoal;
                  const hasData = val > 0;
                  const isGood = metricTab === 'calories' ? val <= budget * 1.05 : val >= goal;
                  const barColorMet = metricTab === 'calories' ? '#22C55E' : metricTab === 'water' ? '#0284C7' : '#EA580C';
                  const barColorOther = metricTab === 'calories' ? '#F47551' : metricTab === 'water' ? '#38BDF8' : '#FB923C';
                  const heightPct = hasData ? Math.min(100, Math.round((val / maxVal) * 100)) : 0;

                  const topLabel = metricTab === 'calories' ? `${val}`
                                   : metricTab === 'water' ? `${(val / 1000).toFixed(1)}L`
                                   : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;

                  return (
                    <Pressable
                      key={`${metricTab}_${item.date}`}
                      style={styles.barCol}
                      onPress={() => {
                        setSelectedBarIdx(index);
                        triggerTooltipAnim();
                      }}
                      hitSlop={HIT_SLOP_4}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.dayName}: ${topLabel}`}
                    >
                      <Text
                        style={[styles.barTopText, isSelected ? styles.barTopTextActive : null]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {hasData ? topLabel : ''}
                      </Text>

                      <View
                        style={[
                          styles.barTrack,
                          { width: barWidth7D },
                          !hasData ? styles.barTrackEmpty : null,
                          isSelected ? { borderColor: hasData ? (isGood ? barColorMet : barColorOther) : barColorMet, borderWidth: 1.5 } : null,
                        ]}
                      >
                        {hasData ? (
                          <AnimatedBarFill
                            heightPct={heightPct}
                            color={isGood ? barColorMet : barColorOther}
                            barAnim={barAnim}
                          />
                        ) : null}
                      </View>

                      <Text style={[styles.barBottomText, isSelected ? styles.barDayActive : null]} numberOfLines={1}>
                        {index === weeklyLogs.length - 1 ? 'Today' : item.dayName}
                      </Text>

                      {isSelected ? (
                        <View style={[styles.activeDayDot, { backgroundColor: hasData ? (isGood ? barColorMet : barColorOther) : barColorMet }]} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* 30-Day Cluster Bars */}
            {timeRange === '30d' ? (
              <View style={styles.chartContainer}>
                {thirtyDayClusters.map((cluster, index) => {
                  const isSelected = selectedClusterIdx === index;

                  const val = metricTab === 'calories' ? cluster.avgCalories
                              : metricTab === 'water' ? cluster.avgWaterMl
                              : cluster.avgSteps;
                  const maxVal = metricTab === 'calories' ? maxChartCalorie
                                 : metricTab === 'water' ? maxChartWater
                                 : maxChartSteps;
                  const goal = metricTab === 'calories' ? budget
                               : metricTab === 'water' ? waterGoal
                               : stepGoal;
                  const hasData = cluster.daysLogged > 0;
                  const isGood = metricTab === 'calories' ? val <= budget * 1.05 : val >= goal;
                  const barColorMet = metricTab === 'calories' ? '#22C55E' : metricTab === 'water' ? '#0284C7' : '#EA580C';
                  const barColorOther = metricTab === 'calories' ? '#F47551' : metricTab === 'water' ? '#38BDF8' : '#FB923C';
                  const heightPct = hasData ? Math.min(100, Math.round((val / maxVal) * 100)) : 0;

                  const topLabel = metricTab === 'calories' ? `${val}`
                                   : metricTab === 'water' ? `${(val / 1000).toFixed(1)}L`
                                   : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;

                  return (
                    <Pressable
                      key={`${metricTab}_cluster_${cluster.id}`}
                      style={styles.barCol30}
                      onPress={() => {
                        setSelectedClusterIdx(index);
                        triggerTooltipAnim();
                      }}
                      hitSlop={HIT_SLOP_4}
                      accessibilityRole="button"
                      accessibilityLabel={`${cluster.label}: ${topLabel}`}
                    >
                      <Text
                        style={[styles.barTopText, isSelected ? styles.barTopTextActive : null]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {hasData ? topLabel : ''}
                      </Text>

                      <View
                        style={[
                          styles.barTrack30,
                          { width: barWidth30D },
                          !hasData ? styles.barTrackEmpty : null,
                          isSelected ? { borderColor: isGood ? barColorMet : barColorOther, borderWidth: 1.5 } : null,
                        ]}
                      >
                        {hasData ? (
                          <AnimatedBarFill
                            heightPct={heightPct}
                            color={isGood ? barColorMet : barColorOther}
                            barAnim={barAnim}
                          />
                        ) : null}
                      </View>

                      <Text style={[styles.barBottomText30, isSelected ? styles.barDayActive : null]} numberOfLines={1}>
                        {cluster.label}
                      </Text>

                      {isSelected ? (
                        <View style={[styles.activeDayDot, { backgroundColor: isGood ? barColorMet : barColorOther }]} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Helper hint for 30-day mode if data is low */}
          {timeRange === '30d' && totalDaysLoggedPast30 < 10 ? (
            <View style={styles.lowDataNotice}>
              <Ionicons name="information-circle-outline" size={14} color="#64748B" />
              <Text style={styles.lowDataNoticeText}>
                Logged {totalDaysLoggedPast30} days in past month. Weekly averages grow richer with daily logging.
              </Text>
            </View>
          ) : null}
        </View>

        {/* ========================================================= */}
        {/* LAYER 5: MACRONUTRIENT PROGRESS (3 Clean Rows)            */}
        {/* ========================================================= */}
        <View style={styles.macroCard}>

          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {timeRange === '7d' ? 'Weekly Macro Averages' : '30-Day Macro Averages'}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {timeRange === '7d'
                  ? 'Daily average intake vs target goals'
                  : '30-day average daily intake vs target goals'}
              </Text>
            </View>
            <View style={styles.macroQualityTag}>
              <Ionicons name="sparkles" size={11} color="#059669" />
              <Text style={styles.macroQualityTagText}>
                {timeRange === '7d' ? '7-Day Targets' : '30-Day Targets'}
              </Text>
            </View>
          </View>

          {/* Row 1: Protein */}
          <View style={styles.macroRowBlock}>
            <View style={styles.macroRowTop}>
              <View style={styles.macroRowLabelWrap}>
                <View style={[styles.macroRowDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.macroRowLabel}>PROTEIN</Text>
              </View>
              <View
                style={
                  currentMetrics.loggedCount === 0
                    ? styles.macroBadgeNeutral
                    : currentMetrics.avgProtein >= targetProtein * 0.9
                    ? styles.macroBadgeGreen
                    : styles.macroBadgeNeutral
                }
              >
                {currentMetrics.loggedCount > 0 && currentMetrics.avgProtein >= targetProtein ? (
                  <Ionicons name="checkmark-circle" size={11} color="#059669" />
                ) : null}
                <Text
                  style={
                    currentMetrics.loggedCount === 0
                      ? styles.macroBadgeTextNeutral
                      : currentMetrics.avgProtein >= targetProtein * 0.9
                      ? styles.macroBadgeTextGreen
                      : styles.macroBadgeTextNeutral
                  }
                >
                  {currentMetrics.loggedCount === 0
                    ? 'No logs'
                    : currentMetrics.avgProtein >= targetProtein
                    ? 'Target Met'
                    : `${Math.round((currentMetrics.avgProtein / targetProtein) * 100)}% Met`}
                </Text>
              </View>
            </View>

            <View style={styles.macroRowValues}>
              <Text style={styles.macroRowGramsBold}>{currentMetrics.avgProtein}g</Text>
              <Text style={styles.macroRowGoalText}> / {targetProtein}g daily goal</Text>
            </View>

            <View style={styles.macroProgressTrack}>
              <View
                style={[
                  styles.macroProgressFill,
                  {
                    width: `${Math.min(100, Math.round((currentMetrics.avgProtein / targetProtein) * 100))}%`,
                    backgroundColor: '#22C55E',
                  },
                ]}
              />
            </View>
          </View>

          {/* Row 2: Carbs */}
          <View style={styles.macroRowBlock}>
            <View style={styles.macroRowTop}>
              <View style={styles.macroRowLabelWrap}>
                <View style={[styles.macroRowDot, { backgroundColor: '#EAB308' }]} />
                <Text style={styles.macroRowLabel}>CARBS</Text>
              </View>
              <View
                style={
                  currentMetrics.loggedCount === 0
                    ? styles.macroBadgeNeutral
                    : currentMetrics.avgCarbs > targetCarbs * 1.1
                    ? styles.macroBadgeCoral
                    : styles.macroBadgeGreen
                }
              >
                {currentMetrics.loggedCount > 0 && currentMetrics.avgCarbs <= targetCarbs * 1.05 ? (
                  <Ionicons name="checkmark-circle" size={11} color="#059669" />
                ) : null}
                <Text
                  style={
                    currentMetrics.loggedCount === 0
                      ? styles.macroBadgeTextNeutral
                      : currentMetrics.avgCarbs > targetCarbs * 1.1
                      ? styles.macroBadgeTextCoral
                      : styles.macroBadgeTextGreen
                  }
                >
                  {currentMetrics.loggedCount === 0
                    ? 'No logs'
                    : currentMetrics.avgCarbs > targetCarbs
                    ? `+${currentMetrics.avgCarbs - targetCarbs}g Over`
                    : 'On Budget'}
                </Text>
              </View>
            </View>

            <View style={styles.macroRowValues}>
              <Text style={styles.macroRowGramsBold}>{currentMetrics.avgCarbs}g</Text>
              <Text style={styles.macroRowGoalText}> / {targetCarbs}g daily goal</Text>
            </View>

            <View style={styles.macroProgressTrack}>
              <View
                style={[
                  styles.macroProgressFill,
                  {
                    width: `${Math.min(100, Math.round((currentMetrics.avgCarbs / targetCarbs) * 100))}%`,
                    backgroundColor: '#EAB308',
                  },
                ]}
              />
            </View>
          </View>

          {/* Row 3: Fat */}
          <View style={[styles.macroRowBlock, { marginBottom: 2 }]}>
            <View style={styles.macroRowTop}>
              <View style={styles.macroRowLabelWrap}>
                <View style={[styles.macroRowDot, { backgroundColor: '#F47551' }]} />
                <Text style={styles.macroRowLabel}>FAT</Text>
              </View>
              <View
                style={
                  currentMetrics.loggedCount === 0
                    ? styles.macroBadgeNeutral
                    : currentMetrics.avgFat > targetFat * 1.1
                    ? styles.macroBadgeCoral
                    : styles.macroBadgeGreen
                }
              >
                {currentMetrics.loggedCount > 0 && currentMetrics.avgFat <= targetFat * 1.05 ? (
                  <Ionicons name="checkmark-circle" size={11} color="#059669" />
                ) : null}
                <Text
                  style={
                    currentMetrics.loggedCount === 0
                      ? styles.macroBadgeTextNeutral
                      : currentMetrics.avgFat > targetFat * 1.1
                      ? styles.macroBadgeTextCoral
                      : styles.macroBadgeTextGreen
                  }
                >
                  {currentMetrics.loggedCount === 0
                    ? 'No logs'
                    : currentMetrics.avgFat > targetFat
                    ? `+${currentMetrics.avgFat - targetFat}g Over`
                    : 'On Budget'}
                </Text>
              </View>
            </View>

            <View style={styles.macroRowValues}>
              <Text style={styles.macroRowGramsBold}>{currentMetrics.avgFat}g</Text>
              <Text style={styles.macroRowGoalText}> / {targetFat}g daily goal</Text>
            </View>

            <View style={styles.macroProgressTrack}>
              <View
                style={[
                  styles.macroProgressFill,
                  {
                    width: `${Math.min(100, Math.round((currentMetrics.avgFat / targetFat) * 100))}%`,
                    backgroundColor: '#F47551',
                  },
                ]}
              />
            </View>
          </View>
          {/* Row 4: Fiber */}
          <View style={[styles.macroRowBlock, { marginBottom: 2 }]}>
            <View style={styles.macroRowTop}>
              <View style={styles.macroRowLabelWrap}>
                <View style={[styles.macroRowDot, { backgroundColor: '#0D9488' }]} />
                <Text style={styles.macroRowLabel}>FIBER</Text>
              </View>
              <View
                style={
                  currentMetrics.loggedCount === 0
                    ? styles.macroBadgeNeutral
                    : (currentMetrics as any).avgFiber >= targetFiber * 0.9
                    ? styles.macroBadgeGreen
                    : styles.macroBadgeNeutral
                }
              >
                {currentMetrics.loggedCount > 0 && (currentMetrics as any).avgFiber >= targetFiber ? (
                  <Ionicons name="checkmark-circle" size={11} color="#059669" />
                ) : null}
                <Text
                  style={
                    currentMetrics.loggedCount === 0
                      ? styles.macroBadgeTextNeutral
                      : (currentMetrics as any).avgFiber >= targetFiber * 0.9
                      ? styles.macroBadgeTextGreen
                      : styles.macroBadgeTextNeutral
                  }
                >
                  {currentMetrics.loggedCount === 0
                    ? 'No logs'
                    : (currentMetrics as any).avgFiber >= targetFiber
                    ? 'Target Met'
                    : `${Math.round(((currentMetrics as any).avgFiber / targetFiber) * 100)}% Met`}
                </Text>
              </View>
            </View>

            <View style={styles.macroRowValues}>
              <Text style={styles.macroRowGramsBold}>{(currentMetrics as any).avgFiber ?? 0}g</Text>
              <Text style={styles.macroRowGoalText}> / {targetFiber}g daily goal</Text>
            </View>

            <View style={styles.macroProgressTrack}>
              <View
                style={[
                  styles.macroProgressFill,
                  {
                    width: `${Math.min(100, Math.round(((currentMetrics as any).avgFiber / targetFiber) * 100))}%`,
                    backgroundColor: '#0D9488',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* LAYER 6: WORKOUT HISTORY CARD                             */}
        {/* ========================================================= */}
        <WorkoutHistoryCard timeRange={timeRange} />

      </Animated.ScrollView>
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
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    position: 'relative',
    zIndex: 10,
  },
  headerBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  horizonHeaderPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 14,
    padding: 2.5,
    gap: 2,
    marginLeft: 8,
  },
  horizonPillBtn: {
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 11,
  },
  horizonPillBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  horizonPillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    includeFontPadding: false,
  },
  horizonPillTextActive: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
    fontWeight: '700',
  },
  subtitleZone: {
    height: 22,
    position: 'relative',
    justifyContent: 'center',
    marginTop: 2,
  },
  subtitleStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#64748B',
    includeFontPadding: false,
  },
  adaptiveStatusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  adaptiveStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  adaptiveStatusText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    includeFontPadding: false,
  },
  adaptiveStatusDivider: {
    fontSize: 9,
    color: '#94A3B8',
  },
  adaptiveStatusMetric: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    includeFontPadding: false,
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120, // Clearance above floating bottom nav
    gap: 14,
  },

  /* ========================================================= */
  /* LAYER 1: HERO VERDICT CARD                                */
  /* ========================================================= */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTagWrap: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroCategoryLabel: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#64748B',
    fontWeight: '700',
    includeFontPadding: false,
  },
  adherenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  adherenceBadgeGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  adherenceBadgeCoral: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
    borderWidth: 1,
  },
  adherenceBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
  },
  adherenceTextGreen: {
    color: '#059669',
  },
  adherenceTextCoral: {
    color: '#EA580C',
  },
  heroValueContainer: {
    marginVertical: 4,
  },
  heroMainValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroMainValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 34,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.8,
    lineHeight: 40,
    includeFontPadding: false,
  },
  heroUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 14.5,
    color: '#64748B',
    includeFontPadding: false,
  },
  heroBenchmarkSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    includeFontPadding: false,
  },
  heroBenchmarkDot: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '400',
  },
  heroBenchmarkSubMuted: {
    color: '#94A3B8',
  },
  heroTextGreen: {
    color: '#16A34A',
    fontWeight: '600',
  },
  heroTextCoral: {
    color: '#EA580C',
    fontWeight: '600',
  },
  kpiTriadRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  kpiColBorder: {
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  kpiValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  kpiLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9.5,
    lineHeight: 13,
    color: '#94A3B8',
    marginTop: 3,
    textAlign: 'center',
    includeFontPadding: false,
  },
  pillarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  pillarTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#64748B',
    includeFontPadding: false,
  },

  /* ========================================================= */
  /* LAYER 2: INTERACTIVE BAR CHART                            */
  /* ========================================================= */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeaderBlock: {
    marginBottom: 12,
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chartTitleCol: {
    flex: 1,
    minWidth: 140,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
    includeFontPadding: false,
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
    includeFontPadding: false,
  },
  chartBudgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  chartBudgetBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    includeFontPadding: false,
  },
  chartWaterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 4,
  },
  chartWaterBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    includeFontPadding: false,
  },
  chartStepsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    gap: 4,
  },
  chartStepsBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '600',
    includeFontPadding: false,
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDashSample: {
    width: 10,
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9.5,
    color: '#64748B',
    includeFontPadding: false,
  },
  tooltipContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tooltipMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipLeft: {
    flex: 1,
    marginRight: 8,
  },
  tooltipDayLabel: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    includeFontPadding: false,
  },
  tooltipDateText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '400',
    includeFontPadding: false,
  },
  tooltipDateSep: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '300',
  },
  tooltipCalorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  tooltipCalsBold: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    includeFontPadding: false,
  },
  tooltipCalsBudget: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    includeFontPadding: false,
  },
  tooltipStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
    flexShrink: 0,
  },
  tooltipPillGreen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tooltipPillCoral: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  tooltipPillNeutral: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tooltipStatusText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
  tooltipTextGreen: {
    color: '#16A34A',
  },
  tooltipTextCoral: {
    color: '#DC2626',
  },
  tooltipTextNeutral: {
    color: '#0284C7',
  },
  tooltipPillBlueMet: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tooltipPillBlue: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  tooltipTextBlueMet: {
    color: '#0284C7',
  },
  tooltipTextBlue: {
    color: '#0369A1',
  },
  tooltipPillOrangeMet: {
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  tooltipPillOrange: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  tooltipTextOrangeMet: {
    color: '#EA580C',
  },
  tooltipTextOrange: {
    color: '#C2410C',
  },
  tooltipWaterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tooltipWaterSub: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#0369A1',
    includeFontPadding: false,
    flex: 1,
  },
  tooltipStepsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tooltipStepsPill: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#C2410C',
    includeFontPadding: false,
  },
  tooltipStepsSubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tooltipMacroRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tooltipMacroPill: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#475569',
    includeFontPadding: false,
  },
  tooltipEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tooltipEmptySub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#64748B',
    includeFontPadding: false,
    flex: 1,
  },
  chartWrapper: {
    position: 'relative',
    height: CHART_CANVAS_HEIGHT,
    marginTop: 4,
  },
  benchmarkLineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  benchmarkDashedLine: {
    flex: 1,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: 'rgba(15, 23, 42, 0.16)',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    zIndex: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barCol30: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9,
    lineHeight: 12,
    color: '#94A3B8',
    marginBottom: 6,
    textAlign: 'center',
    includeFontPadding: false,
  },
  barTopTextActive: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
    fontWeight: '700',
  },
  barTrack: {
    height: BAR_TRACK_HEIGHT,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  barTrack30: {
    height: BAR_TRACK_HEIGHT,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  barTrackEmpty: {
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#FAF9F6',
  },
  barFill: {
    width: '100%',
    borderRadius: 14,
  },
  barBottomText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    lineHeight: 14,
    color: '#64748B',
    marginTop: 6,
    includeFontPadding: false,
  },
  barBottomText30: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    lineHeight: 14,
    color: '#64748B',
    marginTop: 6,
    includeFontPadding: false,
  },
  barDayActive: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
    fontWeight: '700',
  },
  activeDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  lowDataNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  lowDataNoticeText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    includeFontPadding: false,
  },

  /* Metric Tab Switcher */
  metricTabRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    marginBottom: 2,
  },
  metricTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  metricTabText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#94A3B8',
    includeFontPadding: false,
  },
  metricTabTextCalories: {
    color: '#22C55E',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  metricTabTextWater: {
    color: '#0284C7',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  metricTabTextSteps: {
    color: '#EA580C',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },


  /* LAYER 3: 7-DAY MACRONUTRIENT BALANCE (Harmonious Trio)    */
  /* ========================================================= */
  macroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  macroQualityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  macroQualityTagText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 9.5,
    color: '#059669',
    letterSpacing: 0.4,
    includeFontPadding: false,
  },
  macroRowBlock: {
    marginTop: 14,
  },
  macroRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  macroRowLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroRowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  macroRowLabel: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10.5,
    color: '#475569',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  macroRowValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  macroRowGramsBold: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  macroRowGoalText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    includeFontPadding: false,
  },
  macroProgressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3.5,
  },
  macroBadgeTextGreen: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: '#059669',
    includeFontPadding: false,
  },
  macroBadgeCoral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3.5,
  },
  macroBadgeTextCoral: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: '#E11D48',
    includeFontPadding: false,
  },
  macroBadgeNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3.5,
  },
  macroBadgeTextNeutral: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: '#0284C7',
    includeFontPadding: false,
  },
});
