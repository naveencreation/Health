import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { haptics } from '@/utils/haptics';
import { usePro, ProPaywallModal } from '@/features/subscription';
import {
  buildPeriodRange,
  defaultSelectedIndex,
  ReportTimeframe,
} from '@/services/insights/periodRange';
import { buildMetricSeries, InsightMetric } from '@/services/insights/metricSeries';
import { averageOfLogged, percentChange } from '@/services/insights/metricInsights';
import { buildMetricTip } from '@/services/insights/metricTip';
import { InsightMetricChart, fmtInt, fmtLitres } from '@/components/report/InsightMetricChart';
import { StatTiles, StatTile } from '@/components/report/InsightCharts';

const MASCOT = require('../../../assets/ria_avatar.webp');

export interface InsightMetricDetailProps {
  metric: InsightMetric;
  onClose: () => void;
}

const TITLES: Record<InsightMetric, string> = {
  calories: 'Calories',
  steps: 'Steps',
  water: 'Water',
  weight: 'Weight',
};

const TIMEFRAMES: { id: ReportTimeframe; label: string }[] = [
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
  { id: 'yearly', label: 'Year' },
];

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : fmtInt(n));

const NOUN: Record<InsightMetric, string> = {
  calories: 'calories',
  steps: 'steps',
  water: 'water',
  weight: 'weigh-ins',
};

export const InsightMetricDetail: React.FC<InsightMetricDetailProps> = ({ metric, onClose }) => {
  const insets = useSafeAreaInsets();
  const { dailyLogs, todayStr } = useDailyLog();
  const { userGoals } = useGoals();
  const { isPro } = usePro();

  const [timeframe, setTimeframe] = useState<ReportTimeframe>('weekly');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const range = useMemo(
    () => buildPeriodRange(timeframe, periodOffset, todayStr, dailyLogs),
    [timeframe, periodOffset, todayStr, dailyLogs]
  );
  const prevRange = useMemo(
    () => buildPeriodRange(timeframe, periodOffset - 1, todayStr, dailyLogs),
    [timeframe, periodOffset, todayStr, dailyLogs]
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    defaultSelectedIndex(range, todayStr)
  );

  const ctx = useMemo(() => ({ dailyLogs, userGoals, todayStr }), [dailyLogs, userGoals, todayStr]);
  const series = useMemo(
    () => buildMetricSeries(metric, range.days, ctx),
    [metric, range.days, ctx]
  );
  const prevSeries = useMemo(
    () => buildMetricSeries(metric, prevRange.days, ctx),
    [metric, prevRange.days, ctx]
  );

  const unit = series.weight?.unit ?? 'kg';
  const avg = averageOfLogged(series.values);
  const prevAvg = averageOfLogged(prevSeries.values);
  const change = avg !== null ? percentChange(avg, prevAvg) : null;
  const isYear = timeframe === 'yearly';
  const bucket = isYear ? 'month' : 'day';

  const changeTimeframe = async (tf: ReportTimeframe) => {
    if (tf !== 'weekly' && !isPro) {
      await haptics.impactLight();
      setPaywallVisible(true);
      return;
    }
    if (tf === timeframe) return;
    await haptics.selection();
    setTimeframe(tf);
    setPeriodOffset(0);
    setSelectedIndex(defaultSelectedIndex(buildPeriodRange(tf, 0, todayStr, {}), todayStr));
  };

  const changePeriod = (delta: number) => {
    const next = Math.min(0, periodOffset + delta);
    if (next === periodOffset) return;
    haptics.selection();
    setPeriodOffset(next);
    setSelectedIndex(
      defaultSelectedIndex(buildPeriodRange(timeframe, next, todayStr, {}), todayStr)
    );
  };

  const handleSelect = (i: number) => {
    haptics.selection();
    setSelectedIndex(i);
  };

  // ---- Header stat tiles -----------------------------------------------------
  const s = series.summary;
  const logged = series.values.filter((v): v is number => v !== null && v > 0);
  let tiles: StatTile[];
  if (metric === 'steps') {
    tiles = [
      { label: 'Average', value: avg === null ? '–' : fmtInt(avg) },
      { label: `Best ${bucket}`, value: s ? fmtInt(s.max) : '–' },
      { label: `Goal ${bucket}s`, value: String(s?.hits ?? 0), unit: `/${s?.elapsed ?? 0}` },
    ];
  } else if (metric === 'calories') {
    tiles = [
      {
        label: 'Average',
        value: avg === null ? '–' : fmtInt(avg),
        unit: avg === null ? undefined : 'kcal',
      },
      { label: 'Highest', value: s ? fmtInt(s.max) : '–' },
      { label: 'In zone', value: String(s?.hits ?? 0), unit: `/${s?.elapsed ?? 0}` },
    ];
  } else if (metric === 'water') {
    tiles = [
      {
        label: 'Average',
        value: avg === null ? '–' : fmtLitres(avg, 1),
        unit: avg === null ? undefined : 'L',
      },
      { label: `Best ${bucket}`, value: s ? fmtLitres(s.max, 1) : '–', unit: s ? 'L' : undefined },
      { label: `Goal ${bucket}s`, value: String(s?.hits ?? 0), unit: `/${s?.elapsed ?? 0}` },
    ];
  } else {
    const net = series.weight?.netChangeKg;
    const factor = series.weight?.unitFactor ?? 1;
    const latest = logged.length ? logged[logged.length - 1] : null;
    tiles = [
      {
        label: 'Latest',
        value: latest === null ? '–' : latest.toFixed(1),
        unit: latest === null ? undefined : unit,
      },
      {
        label: 'Change',
        value:
          net === null || net === undefined
            ? '–'
            : `${net > 0 ? '+' : net < 0 ? '−' : ''}${Math.abs(net * factor).toFixed(1)}`,
        unit: net === null || net === undefined ? undefined : unit,
      },
      {
        label: 'Weigh-ins',
        value: String(series.weight?.loggedCount ?? 0),
        unit: `/${series.elapsed}`,
      },
    ];
  }

  // ---- Footer ----------------------------------------------------------------
  const scope =
    periodOffset === 0
      ? `so far this ${timeframe === 'weekly' ? 'week' : timeframe === 'monthly' ? 'month' : 'year'}`
      : `in ${range.label}`;
  let totalLine: string;
  if (metric === 'steps') totalLine = `${compact(series.movement?.totalSteps ?? 0)} steps ${scope}`;
  else if (metric === 'water')
    totalLine = `${fmtLitres(series.water?.totalMl ?? 0, 1)} L total ${scope}`;
  else if (metric === 'weight') totalLine = `${series.weight?.loggedCount ?? 0} weigh-ins ${scope}`;
  else
    totalLine = `Logged on ${logged.length} of ${series.elapsed} ${bucket}s ${scope.replace('so far ', '')}`;

  const goodUp = metric === 'steps' || metric === 'water';
  const trendTone = change !== null && change > 0 && goodUp ? Colors.success : Colors.textSecondary;
  const trendText =
    change === null
      ? null
      : change === 0
        ? `Same as ${range.comparisonLabel}`
        : `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)}% vs ${range.comparisonLabel}`;

  // ---- Nomzo tip ---------------------------------------------------------------
  const targetKg = series.weight?.targetKg;
  const currentKg = series.weight?.currentKg;
  const tip = buildMetricTip({
    metric,
    avg,
    goal: series.goal,
    dayValues: isYear
      ? undefined
      : range.days.map((d, i) => ({ dateStr: d.dateStr, value: series.values[i] ?? 0 })),
    weightUnit: unit,
    weightToGoal:
      targetKg !== undefined && currentKg !== null && currentKg !== undefined
        ? Math.abs(currentKg - targetKg) * (series.weight?.unitFactor ?? 1)
        : null,
  });

  const description =
    metric === 'weight'
      ? `Showing weigh-ins for the ${timeframe === 'weekly' ? 'week' : timeframe === 'monthly' ? 'month' : 'year'}`
      : isYear
        ? `Showing monthly average ${NOUN[metric]} for the year`
        : `Showing daily ${NOUN[metric]} for the ${timeframe === 'weekly' ? 'week' : 'month'}`;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={onClose}
          hitSlop={HIT_SLOP_10}
          accessibilityRole="button"
          accessibilityLabel="Back to Insights"
        >
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {TITLES[metric]}
        </Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 16, 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.segment} accessibilityRole="tablist">
          {TIMEFRAMES.map(tf => {
            const active = tf.id === timeframe;
            const locked = !isPro && tf.id !== 'weekly';
            return (
              <Pressable
                key={tf.id}
                style={[styles.segmentTab, active && styles.segmentTabActive]}
                onPress={() => changeTimeframe(tf.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={
                  locked ? `${tf.label} timeframe (Nomzo Pro required)` : `${tf.label} timeframe`
                }
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {tf.label}
                </Text>
                {locked ? (
                  <Ionicons name="lock-closed" size={11} color={Colors.textSecondary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>{range.label}</Text>
              <Text style={styles.cardDesc}>{description}</Text>
            </View>
            <View style={styles.chevrons}>
              <Pressable
                onPress={() => changePeriod(-1)}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel="Previous time period"
              >
                <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => changePeriod(1)}
                disabled={!range.canGoForward}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel="Next time period"
                accessibilityState={{ disabled: !range.canGoForward }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={range.canGoForward ? Colors.textSecondary : Colors.borderMedium}
                />
              </Pressable>
            </View>
          </View>

          <StatTiles stats={tiles} />

          <View style={styles.chartWrap}>
            {series.hasData ? (
              <InsightMetricChart
                series={series}
                days={range.days}
                timeframe={timeframe}
                selectedIndex={selectedIndex}
                onSelect={handleSelect}
                entranceKey={`${timeframe}-${periodOffset}-${metric}`}
              />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="bar-chart-outline" size={28} color={Colors.borderMedium} />
                <Text style={styles.emptyText}>{`Nothing logged for ${range.label} yet`}</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            {trendText ? (
              <View style={styles.trendRow}>
                <Text style={styles.trendText}>{trendText}</Text>
                {change !== null && change !== 0 ? (
                  <Ionicons
                    name={change > 0 ? 'trending-up' : 'trending-down'}
                    size={15}
                    color={trendTone}
                  />
                ) : null}
              </View>
            ) : null}
            <Text style={styles.note}>{totalLine}</Text>
          </View>
        </View>

        {tip ? (
          <View style={styles.tipCard} accessible accessibilityLabel={`Nomzo tip. ${tip}`}>
            <Image source={MASCOT} style={styles.tipMascot} contentFit="contain" />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ) : null}
      </ScrollView>

      <ProPaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        highlightFeature="Deep Monthly & Annual Trends"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  backSpacer: {
    width: 38,
  },
  title: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 16,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    marginBottom: 14,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentTabActive: {
    backgroundColor: Colors.card,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  segmentText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  cardDesc: {
    marginTop: 2,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chevrons: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  chartWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  empty: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 3,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  note: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    elevation: 0,
  },
  tipMascot: {
    width: 46,
    height: 46,
  },
  tipText: {
    flex: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
});
