import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  BackHandler,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import {
  StepCompletionCard,
  DayStepData,
  StepCalorieBurnCard,
  DayCalorieData,
  StepTimeDurationCard,
  DayTimeData,
  StepTotalSummaryCard,
} from '@/components/report';
import { calculateStepMetrics } from '@/utils/stepHistoryUtils';

export type ReportTimeframe = 'weekly' | 'monthly' | 'yearly';

export interface StepReportScreenProps {
  onBack: () => void;
}

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const StepReportScreen: React.FC<StepReportScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { dailyLogs } = useDailyLog();
  const { userGoals } = useGoals();
  const dailyStepGoal = userGoals.stepGoal ?? 6000;

  const [timeframe, setTimeframe] = useState<ReportTimeframe>('weekly');
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  // Independent Selected Day Index per chart so clicking one chart does not affect others
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });
  const [selectedCalorieIndex, setSelectedCalorieIndex] = useState<number>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });

  // Android hardware back button handler
  useEffect(() => {
    const backAction = () => {
      onBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBack]);

  // Calculate Date Range Label, Chart Items, and navigation bounds based on timeframe & periodOffset
  const dateRangeInfo = useMemo(() => {
    const now = new Date();

    // 1. WEEKLY TIMEFRAME (7 individual days Mon–Sun)
    if (timeframe === 'weekly') {
      const currentDay = now.getDay(); // 0 is Sun, 1 is Mon...
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

      // Format matching Reference Screenshot: "Sep 28 – Oct 4, 2026"
      const label =
        monMonth === sunMonth
          ? `${monMonth} ${monDay} – ${sunDay}, ${year}`
          : `${monMonth} ${monDay} – ${sunMonth} ${sunDay}, ${year}`;

      const days: DayStepData[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const log = dailyLogs[dateStr];
        const steps = log?.steps ?? 0;
        const completionPct = dailyStepGoal > 0 ? Math.round((steps / dailyStepGoal) * 100) : 0;
        return {
          dateStr,
          dayNum: d.getDate(),
          dayName: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
          steps,
          goalSteps: dailyStepGoal,
          completionPct,
        };
      });

      return {
        label,
        chartItems: days,
        allDates: days.map((d) => d.dateStr),
        canGoForward: periodOffset < 0,
      };
    }

    // 2. MONTHLY TIMEFRAME (Weekly interval buckets W1 to W4/W5 across calendar month)
    if (timeframe === 'monthly') {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
      const year = targetMonth.getFullYear();
      const monthIdx = targetMonth.getMonth();
      const label = `${FULL_MONTH_NAMES[monthIdx]} ${year}`;
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

      const allDates: string[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const mm = String(monthIdx + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        allDates.push(`${year}-${mm}-${dd}`);
      }

      // Group month into 4 or 5 interval buckets
      const bucketRanges = [
        { start: 1, end: 7, name: '1-7' },
        { start: 8, end: 14, name: '8-14' },
        { start: 15, end: 21, name: '15-21' },
        { start: 22, end: 28, name: '22-28' },
        ...(daysInMonth > 28 ? [{ start: 29, end: daysInMonth, name: `29-${daysInMonth}` }] : []),
      ];

      const chartItems: DayStepData[] = bucketRanges.map((bucket, idx) => {
        let bucketTotalSteps = 0;
        const count = bucket.end - bucket.start + 1;
        for (let d = bucket.start; d <= bucket.end; d++) {
          const mm = String(monthIdx + 1).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          const log = dailyLogs[`${year}-${mm}-${dd}`];
          bucketTotalSteps += log?.steps ?? 0;
        }
        const avgDailySteps = Math.round(bucketTotalSteps / count);
        const completionPct = dailyStepGoal > 0 ? Math.round((avgDailySteps / dailyStepGoal) * 100) : 0;
        return {
          dateStr: `w_${idx + 1}`,
          dayNum: `W${idx + 1}`,
          dayName: bucket.name,
          steps: avgDailySteps,
          goalSteps: dailyStepGoal,
          completionPct,
        };
      });

      return {
        label,
        chartItems,
        allDates,
        canGoForward: periodOffset < 0,
      };
    }

    // 3. YEARLY TIMEFRAME (12 Months: Jan to Dec with monthly daily averages)
    const targetYear = now.getFullYear() + periodOffset;
    const label = `${targetYear}`;
    const allDates: string[] = [];

    const chartItems: DayStepData[] = Array.from({ length: 12 }, (_, m) => {
      const daysInM = new Date(targetYear, m + 1, 0).getDate();
      let monthTotalSteps = 0;
      for (let day = 1; day <= daysInM; day++) {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateStr = `${targetYear}-${mm}-${dd}`;
        allDates.push(dateStr);
        const log = dailyLogs[dateStr];
        monthTotalSteps += log?.steps ?? 0;
      }
      const avgDailySteps = Math.round(monthTotalSteps / daysInM);
      const completionPct = dailyStepGoal > 0 ? Math.round((avgDailySteps / dailyStepGoal) * 100) : 0;
      return {
        dateStr: `m_${m + 1}`,
        dayNum: MONTH_NAMES[m],
        dayName: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][m],
        steps: avgDailySteps,
        goalSteps: dailyStepGoal,
        completionPct,
      };
    });

    return {
      label,
      chartItems,
      allDates,
      canGoForward: periodOffset < 0,
    };
  }, [timeframe, periodOffset, dailyLogs, dailyStepGoal]);

  const handlePrevPeriod = () => setPeriodOffset((prev) => prev - 1);
  const handleNextPeriod = () => {
    if (dateRangeInfo.canGoForward) {
      setPeriodOffset((prev) => prev + 1);
    }
  };

  const handleChangeTimeframe = (newTimeframe: ReportTimeframe) => {
    if (newTimeframe !== timeframe) {
      setTimeframe(newTimeframe);
      setPeriodOffset(0); // Reset to current period
      setSelectedStepIndex(0);
      setSelectedCalorieIndex(0);
      setSelectedTimeIndex(0);
    }
  };

  // Safe selected indices within bounds for each independent chart
  const maxChartIndex = Math.max(0, dateRangeInfo.chartItems.length - 1);
  const safeStepIndex = Math.min(selectedStepIndex, maxChartIndex);
  const safeCalorieIndex = Math.min(selectedCalorieIndex, maxChartIndex);
  const safeTimeIndex = Math.min(selectedTimeIndex, maxChartIndex);

  // Derive calorie metrics for each period item
  const calorieItems: DayCalorieData[] = useMemo(() => {
    return dateRangeInfo.chartItems.map((item) => {
      const metrics = calculateStepMetrics(item.steps);
      return {
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        calories: metrics.calories,
      };
    });
  }, [dateRangeInfo.chartItems]);

  // Derive walking duration metrics for each period item
  const timeItems: DayTimeData[] = useMemo(() => {
    return dateRangeInfo.chartItems.map((item) => {
      const metrics = calculateStepMetrics(item.steps);
      return {
        dateStr: item.dateStr,
        dayNum: item.dayNum,
        dayName: item.dayName,
        durationMinutes: metrics.durationMinutes,
      };
    });
  }, [dateRangeInfo.chartItems]);

  // Average daily duration minutes in current period
  const periodDailyAvgDurationMinutes = useMemo(() => {
    const totalDays = Math.max(1, dateRangeInfo.allDates.length);
    let totalMins = 0;
    for (const dStr of dateRangeInfo.allDates) {
      const log = dailyLogs[dStr];
      const s = log?.steps ?? 0;
      totalMins += calculateStepMetrics(s).durationMinutes;
    }
    return Math.round(totalMins / totalDays);
  }, [dateRangeInfo.allDates, dailyLogs]);

  // Comprehensive period totals & daily averages across all calendar dates in period
  const periodSummary = useMemo(() => {
    let totalSteps = 0;
    let totalDistKm = 0;
    let totalCal = 0;

    for (const dStr of dateRangeInfo.allDates) {
      const log = dailyLogs[dStr];
      const s = log?.steps ?? 0;
      totalSteps += s;
      const metrics = calculateStepMetrics(s);
      totalDistKm += metrics.distanceKm;
      totalCal += metrics.calories;
    }

    const totalDays = Math.max(1, dateRangeInfo.allDates.length);
    const avgSteps = Math.round(totalSteps / totalDays);
    const avgDist = Math.round((totalDistKm / totalDays) * 10) / 10;
    const avgCal = Math.round(totalCal / totalDays);

    return {
      totalSteps,
      totalDistanceKm: Math.round(totalDistKm * 10) / 10,
      totalCalories: Math.round(totalCal),
      avgSteps,
      avgDistanceKm: avgDist,
      avgCalories: avgCal,
    };
  }, [dateRangeInfo.allDates, dailyLogs]);

  // All-time step metrics across all recorded history
  const allTimeSummary = useMemo(() => {
    let allSteps = 0;
    Object.values(dailyLogs).forEach((log) => {
      allSteps += log?.steps ?? 0;
    });
    const metrics = calculateStepMetrics(allSteps);
    return {
      totalSteps: allSteps,
      totalDurationMinutes: metrics.durationMinutes,
      totalCalories: metrics.calories,
      totalDistanceKm: metrics.distanceKm,
    };
  }, [dailyLogs]);

  return (
    <View style={[styles.rootContainer, { paddingTop: Math.max(insets.top, 14) }]}>
      <View style={styles.mobileContainer}>
        {/* 1. Top Navigation Header */}
        <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.navCircleBtn, pressed && styles.btnPressed]}
          onPress={onBack}
          hitSlop={HIT_SLOP_10}
          accessibilityRole="button"
          accessibilityLabel="Back to Step History"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.iconNavy} />
        </Pressable>

        <Text style={styles.headerTitle}>Step Report</Text>

        <Pressable
          style={({ pressed }) => [styles.navCircleBtn, pressed && styles.btnPressed]}
          onPress={() => {}}
          hitSlop={HIT_SLOP_10}
          accessibilityRole="button"
          accessibilityLabel="Report Options"
        >
          <Ionicons name="ellipsis-vertical" size={18} color={Colors.iconNavy} />
        </Pressable>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Timeframe Segmented Tabs (Weekly | Monthly | Yearly) - Placed at the top matching other report screens */}
        <View style={styles.timeframeSegmentContainer}>
          {(['weekly', 'monthly', 'yearly'] as ReportTimeframe[]).map((tab) => {
            const isActive = timeframe === tab;
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
                accessibilityLabel={`${displayLabel} timeframe`}
              >
                <Text
                  style={[
                    styles.timeframeTabText,
                    isActive && styles.timeframeTabTextActive,
                  ]}
                >
                  {displayLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 2. All-Time Summary Card */}
        <StepTotalSummaryCard
          totalSteps={allTimeSummary.totalSteps}
          totalDurationMinutes={allTimeSummary.totalDurationMinutes}
          totalCalories={allTimeSummary.totalCalories}
          totalDistanceKm={allTimeSummary.totalDistanceKm}
        />

        {/* 3. Date Range Navigator (< Sep 28 – Oct 4, 2026 >) */}
        <View style={styles.dateNavRow}>
          <Pressable
            style={({ pressed }) => [
              styles.dateNavArrowBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={handlePrevPeriod}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Previous period"
          >
            <Ionicons name="chevron-back" size={18} color="#64748B" />
          </Pressable>

          <Text style={styles.dateRangeText}>{dateRangeInfo.label}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.dateNavArrowBtn,
              !dateRangeInfo.canGoForward && styles.dateNavArrowDisabled,
              pressed && dateRangeInfo.canGoForward && styles.btnPressed,
            ]}
            onPress={handleNextPeriod}
            disabled={!dateRangeInfo.canGoForward}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Next period"
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={dateRangeInfo.canGoForward ? '#64748B' : '#CBD5E1'}
            />
          </Pressable>
        </View>

        {/* 4. Chart 1: Step Completion Bar & Line Chart Card */}
        <StepCompletionCard
          days={dateRangeInfo.chartItems}
          selectedIndex={safeStepIndex}
          onSelectDay={setSelectedStepIndex}
          stepGoal={dailyStepGoal}
          activeColor="#F97316"
          defaultChartType="bar"
        />

        {/* 5. Chart 2: Active Calorie Burn Trend Card */}
        <StepCalorieBurnCard
          days={calorieItems}
          selectedIndex={safeCalorieIndex}
          onSelectDay={setSelectedCalorieIndex}
          activeColor="#EA580C"
          defaultChartType="bar"
          periodDailyAvgCalories={periodSummary.avgCalories}
        />

        {/* 6. Chart 3: Active Walking Time Trend Card */}
        <StepTimeDurationCard
          days={timeItems}
          selectedIndex={safeTimeIndex}
          onSelectDay={setSelectedTimeIndex}
          activeColor="#F97316"
          defaultChartType="bar"
          periodDailyAvgMinutes={periodDailyAvgDurationMinutes}
        />
      </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // Timeframe Segment Tabs (Matching Image 1)
  timeframeSegmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 4,
    marginBottom: 16,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeTabActive: {
    backgroundColor: '#F97316',
    ...Platform.select({
      ios: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  timeframeTabText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#475569',
  },
  timeframeTabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.poppins.bold,
  },
  // Date Range Navigator (Matching Image 1)
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 18,
  },
  dateNavArrowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  dateNavArrowDisabled: {
    opacity: 0.35,
  },
  dateRangeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
});

export default StepReportScreen;
