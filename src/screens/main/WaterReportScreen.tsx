import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import {
  DrinkCompletionCard,
  DayCompletionData,
  HydrateVolumeCard,
  DayHydrateData,
  DrinkTypesCard,
  DrinkTypeBreakdown,
} from '@/components/report';
import { getBeverageConfig } from '@/utils/beverageUtils';

export type ReportTimeframe = 'weekly' | 'monthly' | 'yearly';

export interface WaterReportScreenProps {
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

export const WaterReportScreen: React.FC<WaterReportScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { dailyLogs } = useDailyLog();
  const { userGoals } = useGoals();
  const dailyWaterGoal = userGoals.waterGoalMl ?? 2500;

  const [timeframe, setTimeframe] = useState<ReportTimeframe>('weekly');
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });
  const [selectedHydrateDayIndex, setSelectedHydrateDayIndex] = useState<number>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });

  // Calculate Date Range Label, Chart Items, and All Dates based on timeframe & periodOffset
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

      const label =
        monMonth === sunMonth
          ? `${monMonth} ${monDay} - ${sunDay}, ${year}`
          : `${monMonth} ${monDay} - ${sunMonth} ${sunDay}, ${year}`;

      const days: DayCompletionData[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const log = dailyLogs[dateStr];
        const intakeMl = log?.waterMl ?? 0;
        const completionPct = dailyWaterGoal > 0 ? Math.round((intakeMl / dailyWaterGoal) * 100) : 0;
        return {
          dateStr,
          dayNum: d.getDate(),
          dayName: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
          intakeMl,
          goalMl: dailyWaterGoal,
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

    // 2. MONTHLY TIMEFRAME (Weekly buckets: W1 to W4/W5 across calendar month)
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

      const chartItems: DayCompletionData[] = bucketRanges.map((bucket, idx) => {
        let bucketTotalMl = 0;
        const count = bucket.end - bucket.start + 1;
        for (let d = bucket.start; d <= bucket.end; d++) {
          const mm = String(monthIdx + 1).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          const log = dailyLogs[`${year}-${mm}-${dd}`];
          bucketTotalMl += log?.waterMl ?? 0;
        }
        const avgDailyMl = Math.round(bucketTotalMl / count);
        const completionPct = dailyWaterGoal > 0 ? Math.round((avgDailyMl / dailyWaterGoal) * 100) : 0;
        return {
          dateStr: `w_${idx + 1}`,
          dayNum: `W${idx + 1}`,
          dayName: bucket.name,
          intakeMl: avgDailyMl,
          goalMl: dailyWaterGoal,
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

    const chartItems: DayCompletionData[] = Array.from({ length: 12 }, (_, m) => {
      const daysInM = new Date(targetYear, m + 1, 0).getDate();
      let monthTotalMl = 0;
      for (let day = 1; day <= daysInM; day++) {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateStr = `${targetYear}-${mm}-${dd}`;
        allDates.push(dateStr);
        const log = dailyLogs[dateStr];
        monthTotalMl += log?.waterMl ?? 0;
      }
      const avgDailyMl = Math.round(monthTotalMl / daysInM);
      const completionPct = dailyWaterGoal > 0 ? Math.round((avgDailyMl / dailyWaterGoal) * 100) : 0;
      return {
        dateStr: `m_${m + 1}`,
        dayNum: MONTH_NAMES[m],
        dayName: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][m],
        intakeMl: avgDailyMl,
        goalMl: dailyWaterGoal,
        completionPct,
      };
    });

    return {
      label,
      chartItems,
      allDates,
      canGoForward: periodOffset < 0,
    };
  }, [timeframe, periodOffset, dailyLogs, dailyWaterGoal]);

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
      setSelectedDayIndex(0);
      setSelectedHydrateDayIndex(0);
    }
  };

  // Safe selected indices within bounds of current timeframe's items
  const safeCompIndex = Math.min(selectedDayIndex, Math.max(0, dateRangeInfo.chartItems.length - 1));
  const safeHydrateIndex = Math.min(selectedHydrateDayIndex, Math.max(0, dateRangeInfo.chartItems.length - 1));

  // Volume data for HydrateVolumeCard
  const volumeData: DayHydrateData[] = useMemo(() => {
    return dateRangeInfo.chartItems.map((item) => ({
      dateStr: item.dateStr,
      dayNum: item.dayNum,
      dayName: item.dayName,
      intakeMl: item.intakeMl,
    }));
  }, [dateRangeInfo.chartItems]);

  // Average completion % across the period for the donut cutout center
  const periodAvgCompletion = useMemo(() => {
    if (dateRangeInfo.chartItems.length === 0) return 100;
    const activeItems = dateRangeInfo.chartItems.filter((i) => i.intakeMl > 0);
    if (activeItems.length === 0) return 100;
    const sum = activeItems.reduce((acc, curr) => acc + curr.completionPct, 0);
    return Math.round(sum / activeItems.length);
  }, [dateRangeInfo.chartItems]);

  // Dynamic beverage distribution calculated across all dates in the selected period
  const periodDrinkBreakdown: { breakdown: DrinkTypeBreakdown[]; totalMl: number } = useMemo(() => {
    const intakeByBev: Record<string, number> = {};
    let totalMl = 0;

    dateRangeInfo.allDates.forEach((dateStr) => {
      const log = dailyLogs[dateStr];
      if (!log) return;

      const entries = log.waterEntries ?? [];
      if (entries.length > 0) {
        entries.forEach((entry) => {
          const bevId = entry.beverageType || 'water';
          intakeByBev[bevId] = (intakeByBev[bevId] || 0) + (entry.amountMl || 0);
          totalMl += entry.amountMl || 0;
        });
      } else if (log.waterMl && log.waterMl > 0) {
        intakeByBev['water'] = (intakeByBev['water'] || 0) + log.waterMl;
        totalMl += log.waterMl;
      }
    });

    if (totalMl === 0) {
      return { breakdown: [], totalMl: 0 };
    }

    const rawBreakdown: DrinkTypeBreakdown[] = Object.entries(intakeByBev)
      .filter(([_, amount]) => amount > 0)
      .map(([id, amount]) => {
        const config = getBeverageConfig(id);
        const pct = Math.round((amount / totalMl) * 100);
        return {
          id,
          name: config.name,
          color: config.color,
          amountMl: amount,
          pct,
        };
      });

    rawBreakdown.sort((a, b) => b.amountMl - a.amountMl);

    // Mathematical guarantee: segments always sum to exactly 100%
    const currentSum = rawBreakdown.reduce((sum, item) => sum + item.pct, 0);
    if (currentSum !== 100 && rawBreakdown.length > 0) {
      rawBreakdown[0].pct += 100 - currentSum;
    }

    return { breakdown: rawBreakdown, totalMl };
  }, [dateRangeInfo.allDates, dailyLogs]);

  return (
    <View style={[styles.rootContainer, { paddingTop: 6 }]}>
      {/* 1. Header matching Reference Screen */}
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.navCircleBtn, pressed && styles.btnPressed]}
          onPress={onBack}
          hitSlop={HIT_SLOP_10}
          accessibilityRole="button"
          accessibilityLabel="Back to Water Tracker"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.iconNavy} />
        </Pressable>

        <Text style={styles.headerTitle}>Report</Text>

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

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Timeframe Segmented Tabs (Weekly | Monthly | Yearly) */}
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

        {/* 3. Date Range Navigator (< Dec 16 - Dec 22, 2024 >) */}
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

        {/* 4. Drink Completion Card (Dual Bar ⇄ Line) */}
        <DrinkCompletionCard
          days={dateRangeInfo.chartItems}
          selectedIndex={safeCompIndex}
          onSelectDay={setSelectedDayIndex}
          activeColor="#2563EB"
          defaultChartType="bar"
        />

        {/* 5. Hydrate Volume Card (Dual Line ⇄ Bar) */}
        <HydrateVolumeCard
          days={volumeData}
          selectedIndex={safeHydrateIndex}
          onSelectDay={setSelectedHydrateDayIndex}
          activeColor="#2563EB"
          defaultChartType="line"
        />

        {/* 6. Drink Types Card (SVG Donut + 2-Column Legend) */}
        <DrinkTypesCard
          breakdown={periodDrinkBreakdown.breakdown}
          totalIntakeMl={periodDrinkBreakdown.totalMl}
          centerPct={periodAvgCompletion}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  btnPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.95 }],
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  // Timeframe Segment Tabs
  timeframeSegmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 4,
    marginBottom: 16,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeTabActive: {
    backgroundColor: '#2563EB',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
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
  },
  // Date Range Navigator
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
    fontSize: 15,
    color: '#1E293B',
    letterSpacing: -0.2,
  },
});
