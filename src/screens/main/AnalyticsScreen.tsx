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
import { calculateStepMetrics } from '@/utils/stepHistoryUtils';
import { getBeverageConfig } from '@/utils/beverageUtils';
import { haptics } from '@/utils/haptics';
import { usePro, ProPaywallModal } from '@/features/subscription';

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
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

/**
 * Extracts aggregate macronutrients and calories safely from a DailyLog.
 */
function getLogNutrition(log?: DailyLog) {
  if (!log) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, burnedCalories: 0 };
  let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;
  if (Array.isArray(log.meals)) {
    log.meals.forEach((m) => {
      calories += m.calories || 0;
      protein += m.protein || 0;
      carbs += m.carbs || 0;
      fat += m.fat || 0;
      fiber += m.fiber || 0;
    });
  }
  let burnedCalories = 0;
  if (Array.isArray(log.activities)) {
    log.activities.forEach((a) => {
      burnedCalories += a.caloriesBurned || 0;
    });
  }
  return { calories, protein, carbs, fat, fiber, burnedCalories };
}

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
  const [selectedHydrateVolumeIndex, setSelectedHydrateVolumeIndex] = useState<number>(defaultDayIndex);

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
  const dailyCalorieGoal = userGoals.dailyCalorieBudget || 2000;
  const dailyStepGoal = userGoals.stepGoal || 6000;
  const dailyWaterGoal = userGoals.waterGoalMl || 2500;
  const userWeightKg = userGoals.currentWeightKg || 70;
  const userHeightCm = userGoals.heightCm || 175;
  const weightUnit = userGoals.weightUnit || 'kg';
  const unitFactor = weightUnit === 'lbs' ? 2.20462 : 1;

  // Active Report Meta configuration
  const activeReportMeta = useMemo(() => {
    return REPORT_CATEGORIES.find((c) => c.id === activeReport) || REPORT_CATEGORIES[0];
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
        allDates: days.map((d) => d.dateStr),
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
    return dateRangeInfo.days.map((item) => {
      if ('log' in item) {
        const nutrition = getLogNutrition(item.log);
        return {
          dateStr: item.dateStr,
          dayNum: item.dayNum,
          dayName: item.dayName,
          calories: nutrition.calories,
          goalCalories: dailyCalorieGoal,
          burnedCalories: nutrition.burnedCalories,
        };
      }

      // Monthly or Yearly aggregated bucket
      const dates = (item as any).bucketDates || (item as any).monthDates || [];
      let totalCal = 0;
      let activeDaysCount = 0;

      dates.forEach((d: string) => {
        const nutrition = getLogNutrition(dailyLogs[d]);
        if (nutrition.calories > 0) {
          totalCal += nutrition.calories;
          activeDaysCount++;
        }
      });

      const avgCal = activeDaysCount > 0 ? Math.round(totalCal / activeDaysCount) : 0;
      return {
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        calories: avgCal,
        goalCalories: dailyCalorieGoal,
      };
    });
  }, [dateRangeInfo.days, dailyCalorieGoal, dailyLogs]);

  // 100% Stacked Macronutrient Distribution Days
  const macroRatioDays: DayMacroRatioData[] = useMemo(() => {
    // Determine user's target fallback ratio if day has 0 food logged
    const targetCarbsKcal = (userGoals?.targetCarbs || 225) * 4;
    const targetProteinKcal = (userGoals?.targetProtein || 100) * 4;
    const targetFatKcal = (userGoals?.targetFat || 78) * 9;
    const targetTotalKcal = targetCarbsKcal + targetProteinKcal + targetFatKcal;
    const defaultCarbsPct = targetTotalKcal > 0 ? Math.round((targetCarbsKcal / targetTotalKcal) * 100) : 45;
    const defaultProteinPct = targetTotalKcal > 0 ? Math.round((targetProteinKcal / targetTotalKcal) * 100) : 20;
    const defaultFatPct = Math.max(0, 100 - defaultCarbsPct - defaultProteinPct);

    return dateRangeInfo.days.map((item) => {
      let proteinG = 0;
      let carbsG = 0;
      let fatG = 0;
      let fiberG = 0;

      if ('log' in item) {
        const nutrition = getLogNutrition(item.log);
        proteinG = Math.round(nutrition.protein * 10) / 10;
        carbsG = Math.round(nutrition.carbs * 10) / 10;
        fatG = Math.round(nutrition.fat * 10) / 10;
        fiberG = Math.round(nutrition.fiber * 10) / 10;
      } else {
        const dates = (item as any).bucketDates || (item as any).monthDates || [];
        let pSum = 0, cSum = 0, fSum = 0, fibSum = 0, count = 0;
        dates.forEach((d: string) => {
          const nutrition = getLogNutrition(dailyLogs[d]);
          if (nutrition.calories > 0) {
            pSum += nutrition.protein;
            cSum += nutrition.carbs;
            fSum += nutrition.fat;
            fibSum += nutrition.fiber;
            count++;
          }
        });
        if (count > 0) {
          proteinG = Math.round((pSum / count) * 10) / 10;
          carbsG = Math.round((cSum / count) * 10) / 10;
          fatG = Math.round((fSum / count) * 10) / 10;
          fiberG = Math.round((fibSum / count) * 10) / 10;
        }
      }

      const cKcal = carbsG * 4;
      const pKcal = proteinG * 4;
      const fKcal = fatG * 9;
      const totalKcal = cKcal + pKcal + fKcal;

      let carbsPct = defaultCarbsPct;
      let proteinPct = defaultProteinPct;
      let fatPct = defaultFatPct;

      if (totalKcal > 0) {
        carbsPct = Math.round((cKcal / totalKcal) * 100);
        proteinPct = Math.round((pKcal / totalKcal) * 100);
        fatPct = Math.max(0, 100 - carbsPct - proteinPct);
      }

      return {
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        carbsPct,
        proteinPct,
        fatPct,
        carbsGrams: carbsG,
        proteinGrams: proteinG,
        fatGrams: fatG,
        fiberGrams: fiberG,
        carbs: carbsG,
        protein: proteinG,
        fat: fatG,
        fiber: fiberG,
      };
    });
  }, [dateRangeInfo.days, dailyLogs, userGoals]);


  // =========================================================================
  // 2. STEP REPORT DATA
  // =========================================================================
  const { stepDays, calorieBurnDays, timeDays, stepSummary } = useMemo(() => {
    let totalSteps = 0;
    let totalCalories = 0;
    let totalDistanceKm = 0;
    let totalDurationMinutes = 0;

    const sDays: DayStepData[] = [];
    const cDays: DayCalorieData[] = [];
    const tDays: DayTimeData[] = [];

    dateRangeInfo.days.forEach((item) => {
      let steps = 0;

      if ('log' in item) {
        steps = item.log?.steps || 0;
      } else {
        const dates = (item as any).bucketDates || (item as any).monthDates || [];
        let bucketSum = 0;
        let count = 0;
        dates.forEach((d: string) => {
          const s = dailyLogs[d]?.steps;
          if (s && s > 0) {
            bucketSum += s;
            count++;
          }
        });
        steps = count > 0 ? Math.round(bucketSum / count) : 0;
      }

      totalSteps += steps;

      const metrics = calculateStepMetrics(steps, userWeightKg);
      totalCalories += metrics.calories;
      totalDistanceKm += metrics.distanceKm;
      totalDurationMinutes += metrics.durationMinutes;

      sDays.push({
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        steps,
        goalSteps: dailyStepGoal,
        completionPct: dailyStepGoal > 0 ? Math.round((steps / dailyStepGoal) * 100) : 0,
      });

      cDays.push({
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        calories: metrics.calories,
      });

      tDays.push({
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        durationMinutes: metrics.durationMinutes,
      });
    });

    return {
      stepDays: sDays,
      calorieBurnDays: cDays,
      timeDays: tDays,
      stepSummary: {
        totalSteps,
        totalCalories,
        totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
        totalDurationMinutes,
      },
    };
  }, [dateRangeInfo.days, dailyLogs, dailyStepGoal, userWeightKg]);

  // =========================================================================
  // 3. WATER REPORT DATA
  // =========================================================================
  const { waterCompletionDays, hydrateDays, drinkTypesBreakdown, totalDrinkVolume } = useMemo(() => {
    const cDays: DayCompletionData[] = [];
    const hDays: DayHydrateData[] = [];
    const beverageMap: Record<string, number> = {};
    let grandVolumeMl = 0;

    dateRangeInfo.days.forEach((item) => {
      let ml = 0;

      if ('log' in item) {
        ml = item.log?.waterMl || 0;
        item.log?.waterEntries?.forEach((wl) => {
          const bevId = wl.beverageType || 'water';
          beverageMap[bevId] = (beverageMap[bevId] || 0) + (wl.amountMl || 0);
          grandVolumeMl += wl.amountMl || 0;
        });
      } else {
        const dates = (item as any).bucketDates || (item as any).monthDates || [];
        let bucketSum = 0;
        let count = 0;
        dates.forEach((d: string) => {
          const w = dailyLogs[d]?.waterMl;
          if (w && w > 0) {
            bucketSum += w;
            count++;
          }
          dailyLogs[d]?.waterEntries?.forEach((wl) => {
            const bevId = wl.beverageType || 'water';
            beverageMap[bevId] = (beverageMap[bevId] || 0) + (wl.amountMl || 0);
            grandVolumeMl += wl.amountMl || 0;
          });
        });
        ml = count > 0 ? Math.round(bucketSum / count) : 0;
      }

      cDays.push({
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        intakeMl: ml,
        goalMl: dailyWaterGoal,
        completionPct: dailyWaterGoal > 0 ? Math.round((ml / dailyWaterGoal) * 100) : 0,
      });

      hDays.push({
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        intakeMl: ml,
      });
    });

    const breakdown: DrinkTypeBreakdown[] = Object.keys(beverageMap).map((bevId) => {
      const cfg = getBeverageConfig(bevId);
      const volumeMl = beverageMap[bevId];
      return {
        id: bevId,
        name: cfg.name,
        color: cfg.color,
        amountMl: volumeMl,
        pct: grandVolumeMl > 0 ? Math.round((volumeMl / grandVolumeMl) * 100) : 0,
      };
    });

    breakdown.sort((a, b) => b.amountMl - a.amountMl);

    return {
      waterCompletionDays: cDays,
      hydrateDays: hDays,
      drinkTypesBreakdown: breakdown,
      totalDrinkVolume: grandVolumeMl,
    };
  }, [dateRangeInfo.days, dailyLogs, dailyWaterGoal]);

  // =========================================================================
  // 4. WEIGHT REPORT DATA
  // =========================================================================
  const { weightTrendDays, weightSummary } = useMemo(() => {
    const tDays: DayWeightTrendData[] = [];
    let latestWeight = userWeightKg;

    dateRangeInfo.days.forEach((item) => {
      let w = userWeightKg;

      if ('log' in item && item.log?.weightKg) {
        w = item.log.weightKg;
        latestWeight = w;
      }

      const displayWeight = Number((w * unitFactor).toFixed(1));
      tDays.push({
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        weightKg: w,
        displayWeight,
      });
    });

    const startW = userGoals.startWeightKg || latestWeight;
    const currentW = latestWeight;
    const targetW = userGoals.targetWeightKg || 68;
    const netChange = currentW - startW;

    const summary: WeightSummaryData = {
      currentWeightKg: Number(currentW.toFixed(1)),
      startWeightKg: Number(startW.toFixed(1)),
      targetWeightKg: Number(targetW.toFixed(1)),
      netChangeKg: Number(netChange.toFixed(1)),
      avgWeightKg: Number(currentW.toFixed(1)),
      unit: weightUnit,
    };

    return {
      weightTrendDays: tDays,
      weightSummary: summary,
    };
  }, [dateRangeInfo.days, userWeightKg, unitFactor, weightUnit, userGoals]);

  // Date Navigation Handlers
  const handlePrevPeriod = () => setPeriodOffset((prev) => prev - 1);
  const handleNextPeriod = () => {
    if (dateRangeInfo.canGoForward) {
      setPeriodOffset((prev) => Math.min(0, prev + 1));
    }
  };

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
          <Text style={styles.headerTitle}>Analytics</Text>

          {/* Report Selector Capsule Button */}
          <Pressable
            style={({ pressed }) => [styles.reportCapsuleBtn, pressed && styles.btnPressed]}
            onPress={() => setReportPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Active report: ${activeReportMeta.title}. Tap to change report.`}
          >
            <View style={[styles.capsuleIconWrap, { backgroundColor: activeReportMeta.iconBg }]}>
              <Ionicons name={activeReportMeta.iconName} size={15} color={activeReportMeta.iconColor} />
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
          {(['weekly', 'monthly', 'yearly'] as ReportTimeframe[]).map((tab) => {
            const isActive = timeframe === tab;
            const isLocked = !isPro && tab !== 'weekly';
            const displayLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
            return (
              <Pressable
                key={tab}
                style={[
                  styles.timeframeTab,
                  isActive && styles.timeframeTabActive,
                ]}
                onPress={() => handleChangeTimeframe(tab)}
                accessibilityRole="button"
                accessibilityLabel={isLocked ? `${displayLabel} timeframe (Calorify Pro required)` : `${displayLabel} timeframe`}
              >
                <View style={styles.tabContentRow}>
                  <Text
                    style={[
                      styles.timeframeTabText,
                      isActive && styles.timeframeTabTextActive,
                    ]}
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
        {/* NUTRITION & CALORIES REPORT */}
        {activeReport === 'nutrition' && (
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

            <DrinkTypesCard
              breakdown={drinkTypesBreakdown}
              totalIntakeMl={totalDrinkVolume}
            />
          </>
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

            <BMIGaugeCard
              weightKg={userWeightKg}
              heightCm={userHeightCm}
              unit={weightUnit}
            />
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
    fontSize: 26,
    lineHeight: 32,
    color: '#0F172A',
    fontWeight: '700',
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
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  capsuleChevron: {
    marginLeft: 4,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  controlsBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FAF9F6',
  },
  timeframeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
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
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  timeframeTabText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  timeframeTabTextActive: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    fontWeight: '700',
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
    fontWeight: '700',
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
});
