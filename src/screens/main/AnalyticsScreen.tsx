import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { haptics } from '@/utils/haptics';
import { parseDateString } from '@/utils/dateUtils';
import { usePro, ProPaywallModal } from '@/features/subscription';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import { computeCalorieDays, computeMacroRatioDays } from '@/features/nutrition/services';
import { computeMovementAnalytics } from '@/features/movement/services';
import { computeHydrationAnalytics } from '@/features/hydration/services';
import { computeWeightAnalytics } from '@/features/weight/services';
import { getTodayBMICategory } from '@/features/weight/utils/bmiCalculator';
import { summarizeSeries, SeriesSummary } from '@/services/insights/seriesSummary';
import {
  InsightBarChart,
  InsightLineChart,
  InsightStatRow,
  InsightStat,
  InsightSectionHeader,
  InsightSplitBar,
  InsightBmiScale,
} from '@/components/report/InsightCharts';

export interface AnalyticsScreenProps {
  scrollRef?: React.RefObject<ScrollView | null>;
  initialScrollOffset?: number;
  onScrollPositionChange?: (offset: number) => void;
}

export type ReportTimeframe = 'weekly' | 'monthly' | 'yearly';
type ReportId = 'nutrition' | 'steps' | 'water' | 'weight';

const REPORT_TABS: { id: ReportId; title: string; color: string }[] = [
  { id: 'nutrition', title: 'Calories', color: Colors.primary },
  { id: 'steps', title: 'Steps', color: Colors.steps },
  { id: 'water', title: 'Water', color: Colors.water },
  { id: 'weight', title: 'Weight', color: Colors.weight },
];

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

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

// Index of the bucket holding today: weekday (Mon=0), week of month (0-4) or month (0-11)
const currentBucketIndex = (tf: ReportTimeframe, now = new Date()) =>
  tf === 'weekly'
    ? (now.getDay() + 6) % 7
    : tf === 'monthly'
      ? Math.min(4, Math.floor((now.getDate() - 1) / 7))
      : now.getMonth();

const TIMEFRAME_LABEL: Record<ReportTimeframe, string> = {
  weekly: 'Week',
  monthly: 'Month',
  yearly: 'Year',
};
const PERIOD_NOUN: Record<ReportTimeframe, string> = {
  weekly: 'days',
  monthly: 'weeks',
  yearly: 'months',
};

const fmt = (n: number) => Math.round(n).toLocaleString();
const fmtDuration = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)}h ${Math.round(min % 60)}m` : `${Math.round(min)}m`;

interface Hero {
  label: string;
  value: string;
  unit: string;
  strong: string;
  rest: string;
  insight?: string;
  isEmpty?: boolean;
}

// Average-vs-goal summary for calories (goal is a ceiling), steps and water (goal is a floor)
const goalHero = (
  s: SeriesSummary | null,
  goal: number,
  unit: string,
  ceiling: boolean,
  noun: string
): Hero => {
  if (!s) {
    return {
      label: 'Average per day',
      value: '0',
      unit,
      strong: '',
      rest: `Your goal is ${fmt(goal)} ${unit} a day`,
      isEmpty: true,
    };
  }
  const gap = fmt(Math.abs(s.diff));
  return {
    label: 'Average per day',
    value: fmt(s.avg),
    unit,
    strong:
      s.diff === 0
        ? 'Right on'
        : s.diff > 0
          ? `${gap} over`
          : `${gap} ${ceiling ? 'under' : 'short of'}`,
    rest: ` your ${fmt(goal)} ${unit} goal`,
    insight: ceiling
      ? `${s.hits} of ${s.elapsed} ${noun} on target.`
      : `Goal hit ${s.hits} of ${s.elapsed} ${noun}.`,
  };
};

// "1,640 kcal · 210 under goal" for the selected bar
const goalReadout = (v: number, goal: number, unit: string, ceiling: boolean) => {
  if (v <= 0) return { value: 'Nothing logged', note: '' };
  const d = v - goal;
  const note =
    d === 0
      ? 'on goal'
      : d > 0
        ? `${fmt(d)} over goal`
        : `${fmt(-d)} ${ceiling ? 'under goal' : 'short'}`;
  return { value: `${fmt(v)} ${unit}`, note };
};

const AnalyticsScreenComponent: React.FC<AnalyticsScreenProps> = ({
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  const insets = useSafeAreaInsets();
  const { dailyLogs, todayStr } = useDailyLog();
  const { userGoals } = useGoals();

  const [activeReport, setActiveReport] = useState<ReportId>('nutrition');

  // Pro Subscription State
  const { isPro } = usePro();
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Timeframe and Navigation Offset
  const [timeframe, setTimeframe] = useState<ReportTimeframe>('weekly');
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  // One selected bucket drives the chart and the readout above it
  const [selectedIndex, setSelectedIndex] = useState<number>(() => currentBucketIndex('weekly'));

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
  const weightUnit: 'kg' | 'lbs' = userGoals.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitFactor = weightUnit === 'lbs' ? 2.20462 : 1;

  // Compute Active Period Date Range & Days
  const dateRangeInfo = useMemo(() => {
    // From context todayStr so the range rebuilds when the day rolls over
    const now = parseDateString(todayStr);

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
          // Spoken by screen readers on the chart columns
          dayName: `${WEEKDAYS[i]} ${d.getDate()}`,
          axisLabel: WEEKDAYS[i][0],
          readoutLabel: `${WEEKDAYS[i].slice(0, 3)}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
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
          dayName: `Week ${idx + 1}, days ${bucket.name}`,
          axisLabel: bucket.name,
          readoutLabel: `${MONTH_NAMES[monthIdx]} ${bucket.name.replace('-', '–')}`,
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
        dayNum: name,
        dayName: FULL_MONTH_NAMES[monthIdx],
        axisLabel: name[0],
        readoutLabel: `${FULL_MONTH_NAMES[monthIdx]} ${targetYear}`,
        monthDates,
      };
    });

    return {
      label,
      days,
      allDates,
      canGoForward: periodOffset < 0,
    };
  }, [timeframe, periodOffset, dailyLogs, todayStr]);

  const sel = Math.min(selectedIndex, Math.max(0, dateRangeInfo.days.length - 1));
  const axisLabels = dateRangeInfo.days.map(d => d.axisLabel);
  const noun = PERIOD_NOUN[timeframe];
  const periodWord = TIMEFRAME_LABEL[timeframe].toLowerCase();

  // =========================================================================
  // REPORT DATA (pure services, unchanged)
  // =========================================================================
  const calorieDays = useMemo(() => {
    return computeCalorieDays(dateRangeInfo.days as any, dailyCalorieGoal, dailyLogs);
  }, [dateRangeInfo.days, dailyCalorieGoal, dailyLogs]);

  const macroRatioDays = useMemo(() => {
    return computeMacroRatioDays(dateRangeInfo.days as any, userGoals, dailyLogs);
  }, [dateRangeInfo.days, dailyLogs, userGoals]);

  const { stepDays, stepSummary } = useMemo(() => {
    return computeMovementAnalytics(dateRangeInfo.days as any, dailyLogs, dailyStepGoal);
  }, [dateRangeInfo.days, dailyLogs, dailyStepGoal]);

  const { waterCompletionDays, drinkTypesBreakdown, totalDrinkVolume } = useMemo(() => {
    return computeHydrationAnalytics(dateRangeInfo.days as any, dailyLogs, dailyWaterGoal);
  }, [dateRangeInfo.days, dailyLogs, dailyWaterGoal]);

  const { weightTrendDays, weightSummary } = useMemo(() => {
    return computeWeightAnalytics(
      dateRangeInfo.days as any,
      dailyLogs,
      userWeightKg,
      userGoals,
      weightUnit,
      unitFactor
    );
  }, [dateRangeInfo.days, dailyLogs, userWeightKg, unitFactor, weightUnit, userGoals]);

  // Date Navigation Handlers
  const handlePrevPeriod = () => setPeriodOffset(prev => prev - 1);
  const handleNextPeriod = () => {
    if (dateRangeInfo.canGoForward) {
      setPeriodOffset(prev => Math.min(0, prev + 1));
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
      setSelectedIndex(currentBucketIndex(newTimeframe));
    }
  };

  const handleSelect = (i: number) => {
    haptics.selection();
    setSelectedIndex(i);
  };

  const handleSelectReport = (id: ReportId) => {
    if (id === activeReport) return;
    haptics.selection();
    setActiveReport(id);
  };

  // =========================================================================
  // ACTIVE REPORT VIEW MODEL
  // =========================================================================
  const tab = REPORT_TABS.find(t => t.id === activeReport) ?? REPORT_TABS[0];
  const avgSuffix = timeframe === 'weekly' ? '' : ' · daily avg';
  const readoutLabel = `${dateRangeInfo.days[sel]?.readoutLabel ?? ''}${avgSuffix}`;

  let hero: Hero;
  let readout: { value: string; note: string };
  let stats: InsightStat[] = [];
  let empty: { title: string; message: string } | null = null;
  let chart: React.ReactNode;
  let secondary: React.ReactNode = null;

  const barChart = (values: number[], goal: number, unit: string, goalLabel: string) => (
    <InsightBarChart
      values={values}
      labels={axisLabels}
      a11yLabels={values.map(
        (v, i) =>
          `${dateRangeInfo.days[i].dayName}, ${v > 0 ? `${fmt(v)} ${unit}` : 'nothing logged'}`
      )}
      selectedIndex={sel}
      onSelect={handleSelect}
      color={tab.color}
      goal={goal}
      goalLabel={goalLabel}
    />
  );

  if (activeReport === 'nutrition') {
    const values = calorieDays.map(d => d.calories);
    const s = summarizeSeries(
      calorieDays.map(d => ({ dateStr: d.dateStr, value: d.calories })),
      dailyCalorieGoal,
      todayStr,
      'band'
    );
    hero = goalHero(s, dailyCalorieGoal, 'kcal', true, noun);
    readout = goalReadout(values[sel] ?? 0, dailyCalorieGoal, 'kcal', true);
    chart = barChart(values, dailyCalorieGoal, 'kcal', `Goal\n${fmt(dailyCalorieGoal)}`);
    if (!s) {
      empty = {
        title: `No meals logged this ${periodWord}`,
        message: 'Log food from Today to see your calorie trend.',
      };
    } else {
      stats = [
        { label: 'On target', value: String(s.hits), unit: `of ${s.elapsed}` },
        { label: 'Highest', value: fmt(s.max) },
        { label: 'Lowest', value: fmt(s.min) },
      ];
      const logged = macroRatioDays.filter(
        d => (d.proteinGrams ?? 0) + (d.carbsGrams ?? 0) + (d.fatGrams ?? 0) > 0
      );
      const avg = (k: 'proteinGrams' | 'carbsGrams' | 'fatGrams') =>
        logged.length ? Math.round(logged.reduce((t, d) => t + (d[k] ?? 0), 0) / logged.length) : 0;
      const macros = [
        {
          name: 'Protein',
          grams: avg('proteinGrams'),
          kcalPerG: 4,
          target: userGoals.targetProtein || BIOMETRIC_DEFAULTS.targetProtein,
          color: Colors.protein,
          track: Colors.proteinLight,
        },
        {
          name: 'Carbs',
          grams: avg('carbsGrams'),
          kcalPerG: 4,
          target: userGoals.targetCarbs || BIOMETRIC_DEFAULTS.targetCarbs,
          color: Colors.carbs,
          track: Colors.carbsLight,
        },
        {
          name: 'Fat',
          grams: avg('fatGrams'),
          kcalPerG: 9,
          target: userGoals.targetFat || BIOMETRIC_DEFAULTS.targetFat,
          color: Colors.fat,
          track: Colors.fatLight,
        },
      ];
      const macroKcal = macros.reduce((t, m) => t + m.grams * m.kcalPerG, 0) || 1;
      const proteinGap = macros[0].target - macros[0].grams;
      secondary = (
        <View style={styles.section}>
          <InsightSectionHeader title="Macros" caption="Avg per day" />
          <InsightSplitBar
            segments={macros.map(m => ({ weight: m.grams * m.kcalPerG, color: m.color }))}
          />
          {macros.map(m => (
            <View
              key={m.name}
              style={styles.macroRow}
              accessible
              accessibilityLabel={`${m.name}: ${m.grams} of ${m.target} grams`}
            >
              <View style={styles.macroLine}>
                <View style={[styles.dot, { backgroundColor: m.color }]} />
                <Text style={styles.macroName}>
                  {m.name}
                  <Text style={styles.muted}>
                    {`  ${Math.round(((m.grams * m.kcalPerG) / macroKcal) * 100)}%`}
                  </Text>
                </Text>
                <Text style={styles.macroValue}>
                  {`${m.grams} g`}
                  <Text style={styles.muted}>{` / ${m.target} g`}</Text>
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: m.track }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, (m.grams / Math.max(1, m.target)) * 100)}%`,
                      backgroundColor: m.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
          <Text style={styles.sectionNote}>
            {proteinGap > 0
              ? `Protein is your gap: ${proteinGap} g short of target on average.`
              : 'Protein target met on average.'}
          </Text>
        </View>
      );
    }
  } else if (activeReport === 'steps') {
    const values = stepDays.map(d => d.steps);
    const s = summarizeSeries(
      stepDays.map(d => ({ dateStr: d.dateStr, value: d.steps })),
      dailyStepGoal,
      todayStr,
      'floor'
    );
    hero = goalHero(s, dailyStepGoal, 'steps', false, noun);
    readout = goalReadout(values[sel] ?? 0, dailyStepGoal, 'steps', false);
    chart = barChart(
      values,
      dailyStepGoal,
      'steps',
      `Goal\n${dailyStepGoal >= 1000 ? `${Math.round(dailyStepGoal / 100) / 10}k` : dailyStepGoal}`
    );
    if (!s) {
      empty = {
        title: `No steps this ${periodWord}`,
        message: 'Add steps from Today, or sync them from Health Connect.',
      };
    } else {
      secondary = (
        <View style={styles.section}>
          <InsightSectionHeader title="Activity" caption={`${TIMEFRAME_LABEL[timeframe]} total`} />
          <InsightStatRow
            columns={2}
            stats={[
              { label: 'Distance', value: stepSummary.totalDistanceKm.toFixed(1), unit: 'km' },
              { label: 'Active time', value: fmtDuration(stepSummary.totalDurationMinutes) },
              { label: 'Burned', value: fmt(stepSummary.totalCalories), unit: 'kcal' },
              { label: 'Steps', value: fmt(stepSummary.totalSteps) },
            ]}
          />
        </View>
      );
    }
  } else if (activeReport === 'water') {
    const values = waterCompletionDays.map(d => d.intakeMl);
    const s = summarizeSeries(
      waterCompletionDays.map(d => ({ dateStr: d.dateStr, value: d.intakeMl })),
      dailyWaterGoal,
      todayStr,
      'floor'
    );
    hero = goalHero(s, dailyWaterGoal, 'mL', false, noun);
    readout = goalReadout(values[sel] ?? 0, dailyWaterGoal, 'mL', false);
    chart = barChart(values, dailyWaterGoal, 'mL', `Goal\n${fmt(dailyWaterGoal)}`);
    if (!s) {
      empty = {
        title: `No drinks logged this ${periodWord}`,
        message: 'Log water from Today to see your hydration trend.',
      };
    } else {
      stats = [
        { label: 'Goal days', value: String(s.hits), unit: `of ${s.elapsed}` },
        { label: 'Best', value: fmt(s.max), unit: 'mL' },
        { label: 'Total', value: fmt(totalDrinkVolume), unit: 'mL' },
      ];
      const drinks = drinkTypesBreakdown
        .filter(d => d.amountMl > 0)
        .sort((a, b) => b.amountMl - a.amountMl);
      if (drinks.length > 0) {
        secondary = (
          <View style={styles.section}>
            <InsightSectionHeader title="What you drank" caption={`This ${periodWord}`} />
            <InsightSplitBar segments={drinks.map(d => ({ weight: d.amountMl, color: d.color }))} />
            <View>
              {drinks.map((d, i) => (
                <View
                  key={d.id}
                  style={[styles.listRow, i < drinks.length - 1 && styles.listRowDivided]}
                  accessible
                  accessibilityLabel={`${d.name}: ${fmt(d.amountMl)} millilitres, ${d.pct}%`}
                >
                  <View style={[styles.dot, { backgroundColor: d.color }]} />
                  <Text style={styles.listName}>{d.name}</Text>
                  <Text style={styles.listValue}>{`${fmt(d.amountMl)} mL`}</Text>
                  <Text style={styles.listPct}>{`${d.pct}%`}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      }
    }
  } else {
    const u = weightSummary.unit;
    const w = (kg: number) => (kg * unitFactor).toFixed(1);
    const values = weightTrendDays.map(d => d.displayWeight);
    const logged = values.filter((v): v is number => v !== null);
    const cur = weightSummary.currentWeightKg;
    const net = weightSummary.netChangeKg;
    const target = weightSummary.targetWeightKg;
    const selW = values[sel];
    readout =
      selW == null
        ? { value: 'No weigh-in', note: '' }
        : { value: `${selW.toFixed(1)} ${u}`, note: '' };

    if (cur === null || logged.length === 0) {
      hero = {
        label: 'Latest',
        value: '–',
        unit: u,
        strong: '',
        rest: `No weigh-ins this ${periodWord}`,
        isEmpty: true,
      };
      empty = {
        title: `No weigh-ins this ${periodWord}`,
        message: 'Log your weight from Today to see your trend.',
      };
    } else {
      const steady = net !== null && Math.abs(net) < 0.05;
      hero = {
        label: 'Latest',
        value: w(cur),
        unit: u,
        strong:
          net === null ? '' : steady ? 'Steady' : `${net < 0 ? '▼' : '▲'} ${w(Math.abs(net))} ${u}`,
        rest: net === null ? 'One weigh-in this period' : ` this ${periodWord}`,
        insight:
          target === undefined
            ? undefined
            : Math.abs(cur - target) < 0.05
              ? 'You are at your goal weight.'
              : `${w(Math.abs(cur - target))} ${u} to your ${w(target)} ${u} goal.`,
      };
      const elapsed = weightTrendDays.filter(d => d.dateStr <= todayStr).length;
      stats = [
        {
          label: 'Start',
          value: weightSummary.startWeightKg !== undefined ? w(weightSummary.startWeightKg) : '–',
          unit: u,
        },
        { label: 'Lowest', value: Math.min(...logged).toFixed(1), unit: u },
        { label: 'Logged', value: String(logged.length), unit: `of ${elapsed}` },
      ];
    }
    chart = (
      <InsightLineChart
        values={values}
        labels={axisLabels}
        a11yLabels={values.map(
          (v, i) =>
            `${dateRangeInfo.days[i].dayName}, ${v === null ? 'no weigh-in' : `${v.toFixed(1)} ${u}`}`
        )}
        selectedIndex={sel}
        onSelect={handleSelect}
        color={Colors.weight}
        fill={Colors.weightLight}
      />
    );

    // No height on file: ask for it instead of silently assuming one
    const heightCm = userGoals.heightCm;
    const bmi = heightCm ? Number((userWeightKg / (heightCm / 100) ** 2).toFixed(1)) : null;
    const category = bmi !== null ? getTodayBMICategory(bmi) : null;
    secondary = (
      <View style={styles.section}>
        <InsightSectionHeader
          title="BMI"
          caption={heightCm ? `Height ${heightCm} cm` : undefined}
        />
        {bmi !== null && category ? (
          <>
            <View
              style={styles.bmiRow}
              accessible
              accessibilityLabel={`BMI ${bmi}, ${category.name}`}
            >
              <Text style={styles.bmiValue}>{bmi}</Text>
              <View style={styles.bmiPill}>
                <View style={[styles.dot, { backgroundColor: category.color }]} />
                <Text style={styles.bmiPillText}>{category.name}</Text>
              </View>
            </View>
            <InsightBmiScale bmi={bmi} />
          </>
        ) : (
          <Text style={styles.sectionNote}>Add your height in Profile to see your BMI.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      {/* Header: title + timeframe, metric tabs, period navigator */}
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Insights
          </Text>
          <View style={styles.segment}>
            {(['weekly', 'monthly', 'yearly'] as ReportTimeframe[]).map(tf => {
              const isActive = timeframe === tf;
              const isLocked = !isPro && tf !== 'weekly';
              const displayLabel = TIMEFRAME_LABEL[tf];
              return (
                <Pressable
                  key={tf}
                  style={({ pressed }) => [
                    styles.segmentTab,
                    isActive && styles.segmentTabActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleChangeTimeframe(tf)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={
                    isLocked
                      ? `${displayLabel} timeframe (Calorify Pro required)`
                      : `${displayLabel} timeframe`
                  }
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {displayLabel}
                  </Text>
                  {isLocked && (
                    <Ionicons name="lock-closed" size={10} color={Colors.textSecondary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {REPORT_TABS.map(t => {
            const isActive = t.id === activeReport;
            return (
              <Pressable
                key={t.id}
                style={({ pressed }) => [
                  styles.tab,
                  isActive && { borderBottomColor: t.color },
                  pressed && styles.pressed,
                ]}
                onPress={() => handleSelectReport(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${t.title} report`}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.title}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dateRow}>
          <Pressable
            style={({ pressed }) => [styles.navArrowBtn, pressed && styles.pressed]}
            onPress={handlePrevPeriod}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Previous time period"
          >
            <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.dateRangeText} numberOfLines={1}>
            {dateRangeInfo.label}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.navArrowBtn,
              pressed && dateRangeInfo.canGoForward && styles.pressed,
            ]}
            onPress={handleNextPeriod}
            disabled={!dateRangeInfo.canGoForward}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Next time period"
            accessibilityState={{ disabled: !dateRangeInfo.canGoForward }}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={dateRangeInfo.canGoForward ? Colors.textPrimary : Colors.borderMedium}
            />
          </Pressable>
        </View>
      </View>

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
        {/* Hero: the one number for this period */}
        <View style={styles.hero} accessible>
          <Text style={styles.heroLabel}>{hero.label}</Text>
          <View style={styles.heroValueRow}>
            <Text style={[styles.heroValue, hero.isEmpty && styles.heroValueEmpty]}>
              {hero.value}
            </Text>
            <Text style={styles.heroUnit}>{hero.unit}</Text>
          </View>
          <Text style={styles.heroDelta}>
            {hero.strong ? <Text style={styles.heroDeltaStrong}>{hero.strong}</Text> : null}
            {hero.rest}
          </Text>
          {hero.insight ? <Text style={styles.heroInsight}>{hero.insight}</Text> : null}
        </View>

        {/* Embedded chart, with the selected bucket read out above it */}
        <View style={styles.chartSection}>
          {empty ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="bar-chart-outline" size={32} color={Colors.borderMedium} />
              <Text style={styles.emptyTitle}>{empty.title}</Text>
              <Text style={styles.emptyMessage}>{empty.message}</Text>
            </View>
          ) : (
            <>
              <View style={styles.readoutRow} accessibilityLiveRegion="polite">
                <Text style={styles.readoutLabel}>{readoutLabel}</Text>
                <Text style={styles.readoutValue}>
                  {readout.value}
                  {readout.note ? <Text style={styles.muted}>{` · ${readout.note}`}</Text> : null}
                </Text>
              </View>
              {chart}
            </>
          )}
        </View>

        {stats.length > 0 && (
          <View style={styles.statsBlock}>
            <InsightStatRow stats={stats} />
          </View>
        )}

        {secondary}
      </ScrollView>

      {/* Pro Paywall for Deep Trends */}
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
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.7,
  },
  segment: {
    flexDirection: 'row',
    padding: 2,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  segmentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentTabActive: {
    backgroundColor: Colors.card,
    borderColor: Colors.borderWhisper,
    elevation: 0,
  },
  segmentText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderMedium,
  },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRangeText: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  hero: {
    gap: 4,
  },
  heroLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  heroValueEmpty: {
    color: Colors.borderMedium,
  },
  heroUnit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 17,
    color: Colors.textSecondary,
  },
  heroDelta: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  heroDeltaStrong: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
  },
  heroInsight: {
    marginTop: 8,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  chartSection: {
    marginTop: 28,
  },
  readoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 14,
  },
  readoutLabel: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  readoutValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  muted: {
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textSecondary,
  },
  emptyBlock: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderMedium,
  },
  emptyTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyMessage: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statsBlock: {
    marginTop: 24,
  },
  section: {
    marginTop: 32,
    gap: 14,
  },
  sectionNote: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    elevation: 0,
  },
  macroRow: {
    gap: 6,
  },
  macroLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroName: {
    flex: 1,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  macroValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  listRowDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderMedium,
  },
  listName: {
    flex: 1,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  listValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  listPct: {
    width: 40,
    textAlign: 'right',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bmiValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 32,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  bmiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  bmiPillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
