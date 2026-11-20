import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  BackHandler,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { haptics } from '@/utils/haptics';
import { buildPeriodRange, defaultSelectedIndex } from '@/services/insights/periodRange';
import { buildMetricSeries, InsightMetric } from '@/services/insights/metricSeries';
import { buildWeekVerdict } from '@/services/insights/weekVerdict';
import { buildWeekBalance, BalanceAxisId } from '@/services/insights/weekBalance';
import { goalStreak, percentChange } from '@/services/insights/metricInsights';
import { SlideInSubScreen } from '@/components/common/SlideInSubScreen';
import { InsightHeroCard } from '@/components/report/InsightHeroCard';
import { MetricCard, MetricTrend } from '@/components/report/MetricCard';
import { RadarChart } from '@/components/report/RadarChart';
import { MacroDonut } from '@/components/report/MacroDonut';
import { InsightMetricChart, fmtInt, fmtLitres } from '@/components/report/InsightMetricChart';
import { InsightMetricDetail } from './InsightMetricDetail';

export interface AnalyticsScreenProps {
  scrollRef?: React.RefObject<ScrollView | null>;
  initialScrollOffset?: number;
  onScrollPositionChange?: (offset: number) => void;
}

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

const EMPTY: Record<InsightMetric, { message: string; hint: string }> = {
  calories: {
    message: 'No meals logged this week',
    hint: 'Log food from Today to see your calorie trend.',
  },
  steps: {
    message: 'No steps this week',
    hint: 'Add steps from Today, or sync them from Health Connect.',
  },
  water: {
    message: 'No drinks logged this week',
    hint: 'Log water from Today to see your hydration trend.',
  },
  weight: {
    message: 'No weigh-ins this week',
    hint: 'Log your weight from Today to see your trend.',
  },
};

const BALANCE_ICON: Record<BalanceAxisId, React.ComponentProps<typeof Ionicons>['name']> = {
  calories: 'flame',
  protein: 'nutrition',
  water: 'water',
  steps: 'footsteps',
  weighIns: 'scale',
};

const AnalyticsScreenComponent: React.FC<AnalyticsScreenProps> = ({
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { dailyLogs, todayStr } = useDailyLog();
  const { userGoals } = useGoals();

  // Weeks back from the current one (0 = this week)
  const [periodOffset, setPeriodOffset] = useState(0);
  const range = useMemo(
    () => buildPeriodRange('weekly', periodOffset, todayStr, dailyLogs),
    [periodOffset, todayStr, dailyLogs]
  );
  const prevRange = useMemo(
    () => buildPeriodRange('weekly', periodOffset - 1, todayStr, dailyLogs),
    [periodOffset, todayStr, dailyLogs]
  );

  // One selected day drives all the charts
  const [selectedIndex, setSelectedIndex] = useState(() => defaultSelectedIndex(range, todayStr));

  const [detailMetric, setDetailMetric] = useState<InsightMetric | null>(null);
  const [isClosingDetail, setIsClosingDetail] = useState(false);

  // Preserve scroll offset if mounted from tab switch
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (initialScrollOffset > 0) {
        scrollRef?.current?.scrollTo({ y: initialScrollOffset, animated: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset, scrollRef]);

  // Android back closes the details screen before anything else handles it
  useEffect(() => {
    if (!detailMetric) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsClosingDetail(true);
      return true;
    });
    return () => sub.remove();
  }, [detailMetric]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollPositionChange?.(e.nativeEvent.contentOffset.y);
  };

  const ctx = useMemo(() => ({ dailyLogs, userGoals, todayStr }), [dailyLogs, userGoals, todayStr]);
  const calories = useMemo(() => buildMetricSeries('calories', range.days, ctx), [range.days, ctx]);
  const steps = useMemo(() => buildMetricSeries('steps', range.days, ctx), [range.days, ctx]);
  const water = useMemo(() => buildMetricSeries('water', range.days, ctx), [range.days, ctx]);
  const weight = useMemo(() => buildMetricSeries('weight', range.days, ctx), [range.days, ctx]);
  const prevCalories = useMemo(
    () => buildMetricSeries('calories', prevRange.days, ctx),
    [prevRange.days, ctx]
  );
  const prevSteps = useMemo(
    () => buildMetricSeries('steps', prevRange.days, ctx),
    [prevRange.days, ctx]
  );

  const changeWeek = (delta: number) => {
    const next = Math.min(0, periodOffset + delta);
    if (next === periodOffset) return;
    haptics.selection();
    setPeriodOffset(next);
    setSelectedIndex(
      defaultSelectedIndex(buildPeriodRange('weekly', next, todayStr, {}), todayStr)
    );
  };

  const handleSelect = useCallback((i: number) => {
    haptics.selection();
    setSelectedIndex(i);
  }, []);

  const openDetails = (metric: InsightMetric) => {
    haptics.selection();
    setIsClosingDetail(false);
    setDetailMetric(metric);
  };

  const dayNames = range.days.map(d => d.dayName.split(' ')[0]);
  const verdict = buildWeekVerdict({
    calorie: calories.summary,
    stepValues: steps.values.map(v => v ?? 0),
    dayNames,
  });

  const chartProps = {
    days: range.days,
    timeframe: 'weekly' as const,
    selectedIndex,
    onSelect: handleSelect,
    entranceKey: `week-${periodOffset}`,
  };

  // ---- Week balance ---------------------------------------------------------
  const calS = calories.summary;
  const stepS = steps.summary;
  const waterS = water.summary;
  const w = weight.weight!;
  const balance = buildWeekBalance({
    calorieHits: calS?.hits ?? 0,
    elapsed: calS?.elapsed ?? 0,
    proteinAvg: calories.protein?.avg ?? 0,
    proteinTarget: calories.protein?.target ?? 0,
    waterAvg: waterS?.avg ?? 0,
    waterGoal: water.goal ?? 0,
    stepAvg: stepS?.avg ?? 0,
    stepGoal: steps.goal ?? 0,
    weighInDays: w.loggedCount,
    hasData: calories.hasData || steps.hasData || water.hasData || weight.hasData,
  });

  // ---- Calories -------------------------------------------------------------
  let calTrend: MetricTrend | null = null;
  let calNote: string | undefined;
  if (calS) {
    const prevS = prevCalories.summary;
    const better = prevS ? calS.hits > prevS.hits : calS.hits * 2 >= calS.elapsed;
    calTrend = {
      text: `${calS.hits} of ${calS.elapsed} days in your zone`,
      tone: better ? 'good' : 'neutral',
      icon: better ? 'trending-up' : undefined,
    };
    calNote = prevS
      ? `${calS.hits > prevS.hits ? 'Up from' : calS.hits < prevS.hits ? 'Down from' : 'Same as'} ${prevS.hits} of ${prevS.elapsed} last week`
      : `Your zone is your goal, give or take 10%`;
  }

  // ---- Steps ----------------------------------------------------------------
  let stepTrend: MetricTrend | null = null;
  if (stepS) {
    const pct = percentChange(stepS.avg, prevSteps.summary?.avg);
    stepTrend =
      pct === null
        ? { text: `${stepS.hits} of ${stepS.elapsed} days at goal`, tone: 'neutral' }
        : pct > 0
          ? { text: `Trending up ${pct}% this week`, tone: 'good', icon: 'trending-up' }
          : pct < 0
            ? {
                text: `Trending down ${Math.abs(pct)}% this week`,
                tone: 'neutral',
                icon: 'trending-down',
              }
            : { text: 'Holding steady this week', tone: 'neutral' };
  }
  const stepNote = stepS
    ? `${(steps.movement?.distanceKm ?? 0).toFixed(1)} km walked · ${fmtInt(steps.movement?.burnedKcal ?? 0)} kcal burned`
    : undefined;

  // ---- Water ----------------------------------------------------------------
  const waterStreak =
    water.goal && waterS
      ? goalStreak(
          water.values.map(v => v ?? 0),
          water.goal,
          waterS.elapsed - 1,
          periodOffset === 0
        )
      : 0;
  const topDrink = water.water?.topDrink;
  const waterTrend: MetricTrend | null = waterS
    ? waterStreak >= 2
      ? { text: `${waterStreak}-day goal streak`, tone: 'good', icon: 'flame' }
      : { text: `${waterS.hits} of ${waterS.elapsed} days at goal`, tone: 'neutral' }
    : null;
  const waterNote = waterS
    ? `${fmtLitres(water.water?.totalMl ?? 0, 1)} L total${
        topDrink ? ` · mostly ${topDrink.name.toLowerCase()} (${topDrink.pct}%)` : ''
      }`
    : undefined;

  // ---- Weight ---------------------------------------------------------------
  const u = w.unit;
  const toUnit = (kg: number) => (kg * w.unitFactor).toFixed(1);
  const currentKg = w.currentKg;
  const heightCm = userGoals.heightCm;
  const bmi = heightCm && currentKg ? Number((currentKg / (heightCm / 100) ** 2).toFixed(1)) : null;
  let weightTrend: MetricTrend | null = null;
  if (weight.hasData) {
    const net = w.netChangeKg;
    if (net === null) {
      weightTrend = { text: '1 weigh-in this week', tone: 'neutral' };
    } else if (Math.abs(net) < 0.05) {
      weightTrend = { text: 'Holding steady this week', tone: 'neutral' };
    } else {
      // Moving toward the target is the good direction, whichever way that points
      const target = w.targetKg;
      const wantsLoss = target !== undefined && currentKg !== null ? target < currentKg : null;
      const toward = wantsLoss === null ? false : wantsLoss ? net < 0 : net > 0;
      weightTrend = {
        text: `${net < 0 ? 'Down' : 'Up'} ${toUnit(Math.abs(net))} ${u} this week`,
        tone: toward ? 'good' : 'neutral',
        icon: net < 0 ? 'trending-down' : 'trending-up',
      };
    }
  }
  const weightNote =
    weight.hasData && w.targetKg !== undefined && currentKg !== null
      ? Math.abs(currentKg - w.targetKg) < 0.05
        ? 'You are at your goal weight'
        : `${toUnit(Math.abs(currentKg - w.targetKg))} ${u} to go`
      : undefined;

  const weakest = balance.weakest;
  return (
    <View style={styles.rootContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Insights
        </Text>
        <View style={styles.weekPill}>
          <Pressable
            onPress={() => changeWeek(-1)}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={16} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.weekText} numberOfLines={1}>
            {range.label}
          </Text>
          <Pressable
            onPress={() => changeWeek(1)}
            disabled={!range.canGoForward}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Next week"
            accessibilityState={{ disabled: !range.canGoForward }}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={range.canGoForward ? Colors.textPrimary : Colors.borderMedium}
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
        <View style={styles.heroWrap}>
          <InsightHeroCard {...verdict} />
        </View>

        <MetricCard
          title="Week balance"
          description="How close you got to each goal"
          trend={
            balance.hasData
              ? {
                  text: `Strongest: ${balance.strongest.label}`,
                  tone: 'neutral',
                  icon: BALANCE_ICON[balance.strongest.id],
                }
              : null
          }
          note={
            balance.hasData
              ? `${weakest.label} ${weakest.id === 'weighIns' ? 'need' : 'needs'} the most love this week`
              : undefined
          }
          empty={
            balance.hasData
              ? null
              : {
                  message: 'Nothing to balance yet',
                  hint: 'Log a meal, water or steps to see how your week stacks up.',
                }
          }
        >
          <RadarChart
            axes={balance.axes.map(a => ({ label: a.label, value: a.value }))}
            entranceKey={`week-${periodOffset}`}
          />
        </MetricCard>

        <MetricCard
          title="Calories"
          description={`${range.label} · goal ${fmtInt(calories.goal ?? 0)} kcal`}
          value={calS ? fmtInt(calS.avg) : '–'}
          unit="kcal avg / day"
          trend={calTrend}
          note={calNote}
          empty={calories.hasData ? null : EMPTY.calories}
          onDetails={() => openDetails('calories')}
        >
          <InsightMetricChart series={calories} {...chartProps} />
        </MetricCard>

        <MetricCard
          title="Macro split"
          description="Average of your logged days"
          bleed
          empty={
            calories.hasData
              ? null
              : { message: 'No macros yet', hint: 'Log food from Today to see your split.' }
          }
        >
          {calories.macroAvg && calS ? (
            <MacroDonut
              avgKcal={calS.avg}
              macros={[
                {
                  name: 'Protein',
                  grams: calories.macroAvg.protein,
                  target: calories.macroAvg.targets.protein,
                  color: Colors.protein,
                  kcalPerG: 4,
                },
                {
                  name: 'Carbs',
                  grams: calories.macroAvg.carbs,
                  target: calories.macroAvg.targets.carbs,
                  color: Colors.carbs,
                  kcalPerG: 4,
                },
                {
                  name: 'Fat',
                  grams: calories.macroAvg.fat,
                  target: calories.macroAvg.targets.fat,
                  color: Colors.fat,
                  kcalPerG: 9,
                },
              ]}
            />
          ) : null}
        </MetricCard>

        <MetricCard
          title="Steps"
          description={`${range.label} · goal ${fmtInt(steps.goal ?? 0)}`}
          value={stepS ? fmtInt(stepS.avg) : '–'}
          unit="avg / day"
          trend={stepTrend}
          note={stepNote}
          empty={steps.hasData ? null : EMPTY.steps}
          onDetails={() => openDetails('steps')}
        >
          <InsightMetricChart series={steps} {...chartProps} />
        </MetricCard>

        <MetricCard
          title="Water"
          description={`${range.label} · goal ${fmtLitres(water.goal ?? 0, 2)} L`}
          value={waterS ? fmtLitres(waterS.avg, 1) : '–'}
          unit="L avg / day"
          trend={waterTrend}
          note={waterNote}
          empty={water.hasData ? null : EMPTY.water}
          onDetails={() => openDetails('water')}
        >
          <InsightMetricChart series={water} {...chartProps} />
        </MetricCard>

        <MetricCard
          title="Weight"
          description={`${w.loggedCount} weigh-in${w.loggedCount === 1 ? '' : 's'}${
            w.targetKg !== undefined ? ` · goal ${toUnit(w.targetKg)} ${u}` : ''
          }`}
          value={weight.hasData && currentKg !== null ? toUnit(currentKg) : '–'}
          unit={`${u}${bmi !== null && weight.hasData ? ` · BMI ${bmi}` : ''}`}
          trend={weightTrend}
          note={weightNote}
          empty={weight.hasData ? null : EMPTY.weight}
          onDetails={() => openDetails('weight')}
        >
          <InsightMetricChart series={weight} {...chartProps} />
        </MetricCard>
      </ScrollView>

      {detailMetric ? (
        <SlideInSubScreen
          isClosing={isClosingDetail}
          onClosed={() => {
            setDetailMetric(null);
            setIsClosingDetail(false);
          }}
          screenWidth={Math.min(screenWidth, 480)}
          zIndex={300}
        >
          <InsightMetricDetail metric={detailMetric} onClose={() => setIsClosingDetail(true)} />
        </SlideInSubScreen>
      ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    minHeight: 60,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  weekText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  heroWrap: {
    marginBottom: 12,
  },
});
