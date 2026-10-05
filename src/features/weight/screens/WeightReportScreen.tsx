import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import {
  WeightSummaryCard,
  WeightSummaryData,
  WeightTrendCard,
  DayWeightTrendData,
  BMIGaugeCard,
} from '@/components/report';
import { usePro, ProPaywallModal } from '@/features/subscription';
import { haptics } from '@/utils/haptics';

export type ReportTimeframe = 'weekly' | 'monthly' | 'yearly';

export interface WeightReportScreenProps {
  onBack: () => void;
}

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

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

export const WeightReportScreen: React.FC<WeightReportScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { dailyLogs } = useDailyLog();
  const { userGoals } = useGoals();

  const unit = userGoals.weightUnit || 'kg';
  const unitFactor = unit === 'lbs' ? 2.20462 : 1;

  // Pro Subscription State
  const { isPro } = usePro();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const [timeframe, setTimeframe] = useState<ReportTimeframe>('weekly');
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });

  // Calculate Date Range Info and Trend Items
  const dateRangeInfo = useMemo(() => {
    const now = new Date();

    // 1. WEEKLY TIMEFRAME (7 individual days Mon–Sun)
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
          ? `${monMonth} ${monDay} - ${sunDay}, ${year}`
          : `${monMonth} ${monDay} - ${sunMonth} ${sunDay}, ${year}`;

      const allDates: string[] = [];
      const trendItems: DayWeightTrendData[] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        allDates.push(dateStr);

        const log = dailyLogs[dateStr];
        const rawWeightKg =
          log && typeof log.weightKg === 'number' && log.weightKg > 0
            ? log.weightKg
            : log?.weightEntries && log.weightEntries.length > 0
              ? log.weightEntries[0].weightKg
              : null;
        const displayWeight = rawWeightKg !== null ? rawWeightKg * unitFactor : null;

        trendItems.push({
          dateStr,
          dayNum: d.getDate(),
          dayName: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
          weightKg: rawWeightKg,
          displayWeight,
        });
      }

      return {
        label,
        trendItems,
        allDates,
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

      const bucketRanges = [
        { start: 1, end: 7, name: '1-7' },
        { start: 8, end: 14, name: '8-14' },
        { start: 15, end: 21, name: '15-21' },
        { start: 22, end: 28, name: '22-28' },
        ...(daysInMonth > 28 ? [{ start: 29, end: daysInMonth, name: `29-${daysInMonth}` }] : []),
      ];

      const trendItems: DayWeightTrendData[] = [];

      bucketRanges.forEach((bucket, idx) => {
        let sumKg = 0;
        let count = 0;

        for (let d = bucket.start; d <= bucket.end; d++) {
          const mm = String(monthIdx + 1).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          const log = dailyLogs[`${year}-${mm}-${dd}`];
          const rawWeight =
            log && typeof log.weightKg === 'number' && log.weightKg > 0
              ? log.weightKg
              : log?.weightEntries && log.weightEntries.length > 0
                ? log.weightEntries[0].weightKg
                : null;
          if (rawWeight !== null) {
            sumKg += rawWeight;
            count += 1;
          }
        }

        const avgKg = count > 0 ? Math.round((sumKg / count) * 10) / 10 : null;
        const displayAvg = avgKg !== null ? avgKg * unitFactor : null;

        trendItems.push({
          dateStr: `w${idx + 1}`,
          dayNum: `W${idx + 1}`,
          dayName: bucket.name,
          weightKg: avgKg,
          displayWeight: displayAvg,
        });
      });

      return {
        label,
        trendItems,
        allDates,
        canGoForward: periodOffset < 0,
      };
    }

    // 3. YEARLY TIMEFRAME (12 monthly buckets Jan–Dec)
    const targetYear = now.getFullYear() + periodOffset;
    const label = `${targetYear}`;
    const allDates: string[] = [];
    const trendItems: DayWeightTrendData[] = [];

    for (let m = 0; m < 12; m++) {
      const daysInM = new Date(targetYear, m + 1, 0).getDate();
      let sumKg = 0;
      let count = 0;

      for (let day = 1; day <= daysInM; day++) {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateStr = `${targetYear}-${mm}-${dd}`;
        allDates.push(dateStr);

        const log = dailyLogs[dateStr];
        const rawWeight =
          log && typeof log.weightKg === 'number' && log.weightKg > 0
            ? log.weightKg
            : log?.weightEntries && log.weightEntries.length > 0
              ? log.weightEntries[0].weightKg
              : null;
        if (rawWeight !== null) {
          sumKg += rawWeight;
          count += 1;
        }
      }

      const avgKg = count > 0 ? Math.round((sumKg / count) * 10) / 10 : null;
      const displayAvg = avgKg !== null ? avgKg * unitFactor : null;

      trendItems.push({
        dateStr: `m_${m}`,
        dayNum: m + 1,
        dayName: MONTH_NAMES[m],
        weightKg: avgKg,
        displayWeight: displayAvg,
      });
    }

    return {
      label,
      trendItems,
      allDates,
      canGoForward: periodOffset < 0,
    };
  }, [timeframe, periodOffset, dailyLogs, unitFactor]);

  // Adjust selected trend index safely when timeframe changes
  const safeTrendIndex = Math.min(
    Math.max(0, selectedTrendIndex),
    Math.max(0, dateRangeInfo.trendItems.length - 1)
  );

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
      setSelectedTrendIndex(0);
    }
  };

  const handlePrevPeriod = () => {
    setPeriodOffset(prev => prev - 1);
  };

  const handleNextPeriod = () => {
    if (dateRangeInfo.canGoForward) {
      setPeriodOffset(prev => prev + 1);
    }
  };

  // Compute Period Overview Summary Data
  const periodSummaryData: WeightSummaryData = useMemo(() => {
    const validWeights: number[] = [];
    dateRangeInfo.trendItems.forEach(item => {
      if (item.weightKg !== null && item.weightKg > 0) {
        validWeights.push(item.weightKg);
      }
    });

    if (validWeights.length === 0) {
      return {
        netChangeKg: 0,
        currentWeightKg: userGoals.currentWeightKg ?? null,
        avgWeightKg: null,
        targetWeightKg: userGoals.targetWeightKg,
        startWeightKg: userGoals.startWeightKg,
        unit,
      };
    }

    const firstWeight = validWeights[0];
    const lastWeight = validWeights[validWeights.length - 1];
    const netChangeKg =
      validWeights.length > 1 ? Math.round((lastWeight - firstWeight) * 100) / 100 : 0;

    const sum = validWeights.reduce((acc, curr) => acc + curr, 0);
    const avgWeightKg = Math.round((sum / validWeights.length) * 10) / 10;

    return {
      netChangeKg,
      currentWeightKg: lastWeight,
      avgWeightKg,
      targetWeightKg: userGoals.targetWeightKg,
      startWeightKg: userGoals.startWeightKg,
      unit,
    };
  }, [dateRangeInfo.trendItems, userGoals, unit]);

  return (
    <View style={[styles.rootContainer, { paddingTop: 6 }]}>
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.navCircleBtn, pressed && styles.btnPressed]}
          onPress={onBack}
          hitSlop={HIT_SLOP_10}
          accessibilityRole="button"
          accessibilityLabel="Back to Weight Tracker"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.iconNavy} />
        </Pressable>

        <Text style={styles.headerTitle}>Weight Report</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Timeframe Segment Tabs (Weekly | Monthly | Yearly) */}
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

        {/* 3. Date Range Navigator (< Dec 16 - Dec 22, 2024 >) */}
        <View style={styles.dateNavRow}>
          <Pressable
            style={({ pressed }) => [styles.dateNavArrowBtn, pressed && styles.btnPressed]}
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

        {/* 4. Period Overview Summary Card */}
        <WeightSummaryCard data={periodSummaryData} activeColor={Colors.weight} />

        {/* 5. Hero Weight Trend Card (Dual Line ⇄ Bar with Goal Reference Line) */}
        <WeightTrendCard
          days={dateRangeInfo.trendItems}
          selectedIndex={safeTrendIndex}
          onSelectDay={setSelectedTrendIndex}
          targetWeightKg={userGoals.targetWeightKg}
          unit={unit}
          activeColor={Colors.weight}
          defaultChartType="line"
        />

        {/* 6. BMI Speedometer Gauge Visualizer */}
        <BMIGaugeCard
          weightKg={periodSummaryData.currentWeightKg ?? userGoals.currentWeightKg ?? 72.5}
          heightCm={userGoals.heightCm ?? 178}
          unit={unit}
        />
      </ScrollView>

      {/* Pro Paywall Modal for Monthly/Yearly Trends */}
      <ProPaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  navCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  timeframeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 2.5,
    marginBottom: 16,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
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
    borderColor: 'rgba(15, 23, 42, 0.06)',
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
    color: '#0F172A',
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  dateNavArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavArrowDisabled: {
    opacity: 0.4,
  },
  dateRangeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
});
