import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MotionCurves, MotionDurations } from '@/theme/motion';
import { haptics } from '@/utils/haptics';
import { buildPlanLedger, formatSignedKcal, LedgerRow } from '../services/planLedger';
import type { CalculatedHealthPlan, Pace } from '../services/onboardingCalculator';

interface BuildingPlanScreenProps {
  name?: string;
  plan: CalculatedHealthPlan;
  activityLabel: string;
  pace?: Pace;
  weightUnit: 'kg' | 'lbs';
  targetWeightKg?: number;
  onComplete: () => void;
}

const ROW_TIMES = [600, 1200, 1800];
const TOTAL_TIME = 2400;
const END_TIME = 4000;
const REDUCED_END_TIME = 1500;
const COUNT_MS = 600;
const COUNT_STEPS = 20;

const LedgerRowView: React.FC<{
  row: LedgerRow;
  index: number;
  revealed: boolean;
  animate: boolean;
}> = ({ row, index, revealed, animate }) => {
  const opacity = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (revealed && animate) {
      opacity.set(
        withTiming(1, { duration: MotionDurations.sheet, easing: MotionCurves.decelerate })
      );
    }
  }, [revealed, animate, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const text = index === 0 ? row.value.toLocaleString('en-US') : formatSignedKcal(row.value);
  return (
    <View
      style={[styles.row, index > 0 && styles.rowDivider]}
      testID={`building-plan-row-${index}`}
    >
      {revealed ? (
        <Animated.View style={[styles.rowInner, style]}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowTitle}>{row.title}</Text>
            <Text style={styles.rowSub}>{row.sub}</Text>
          </View>
          <Text style={[styles.rowValue, row.value < 0 && styles.rowValueNegative]}>{text}</Text>
        </Animated.View>
      ) : (
        <View style={styles.rowInner} testID={`building-plan-placeholder-${index}`}>
          <View style={styles.rowLeft}>
            <View style={[styles.bar, { width: 110, height: 16 }]} />
            <View style={[styles.bar, { width: 170, height: 13, marginTop: 4 }]} />
          </View>
          <View style={[styles.bar, { width: 56, height: 20 }]} />
        </View>
      )}
    </View>
  );
};

export const BuildingPlanScreen: React.FC<BuildingPlanScreenProps> = ({
  name,
  plan,
  activityLabel,
  pace,
  weightUnit,
  targetWeightKg,
  onComplete,
}) => {
  const reduceMotion = useReducedMotion();
  const ledger = useMemo(
    () => buildPlanLedger(plan, { activityLabel, pace, weightUnit, targetWeightKg }),
    [plan, activityLabel, pace, weightUnit, targetWeightKg]
  );
  const [shown, setShown] = useState(reduceMotion ? 3 : 0);
  const [totalShown, setTotalShown] = useState(!!reduceMotion);
  const [count, setCount] = useState(reduceMotion ? ledger.total : 0);
  const [done, setDone] = useState(false);

  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const totalOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const totalStyle = useAnimatedStyle(() => ({ opacity: totalOpacity.get() }));

  useEffect(() => {
    if (!reduceMotion) {
      progress.set(withTiming(1, { duration: END_TIME, easing: Easing.linear }));
    }
  }, [reduceMotion, progress]);

  useEffect(() => {
    if (totalShown && !reduceMotion) {
      totalOpacity.set(
        withTiming(1, { duration: MotionDurations.sheet, easing: MotionCurves.decelerate })
      );
    }
  }, [totalShown, reduceMotion, totalOpacity]);

  const total = ledger.total;
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | undefined;
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    if (reduceMotion) {
      at(REDUCED_END_TIME, () => {
        setDone(true);
        onComplete();
      });
    } else {
      ROW_TIMES.forEach((ms, i) =>
        at(ms, () => {
          setShown(i + 1);
          haptics.selection();
        })
      );
      at(TOTAL_TIME, () => {
        setTotalShown(true);
        setDone(true);
        haptics.selection();
        let step = 0;
        interval = setInterval(() => {
          step += 1;
          setCount(Math.round((total * step) / COUNT_STEPS));
          if (step >= COUNT_STEPS) clearInterval(interval);
        }, COUNT_MS / COUNT_STEPS);
      });
      at(END_TIME, onComplete);
    }

    return () => {
      timers.forEach(clearTimeout);
      if (interval) clearInterval(interval);
    };
  }, [onComplete, reduceMotion, total]);

  const trimmed = name?.trim();
  const suffix = trimmed ? `, ${trimmed}` : '';
  const finished = done || (reduceMotion && totalShown);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {finished ? `Your number${suffix}` : `Working it out${suffix}`}
        </Text>
        <Text style={styles.subtitle}>
          {finished
            ? 'Built from your answers. Your full plan is next.'
            : 'Built from your answers, one step at a time.'}
        </Text>

        <View style={styles.ledgerCard}>
          {ledger.rows.map((row, i) => (
            <LedgerRowView
              key={row.title}
              row={row}
              index={i}
              revealed={shown > i}
              animate={!reduceMotion}
            />
          ))}
        </View>

        <Animated.View
          style={[styles.totalCard, totalStyle]}
          testID="building-plan-total"
          accessibilityLiveRegion="polite"
          accessibilityLabel={
            totalShown
              ? `Your daily target is ${total.toLocaleString('en-US')} calories`
              : undefined
          }
        >
          <View style={styles.rowLeft}>
            <Text style={styles.totalTitle}>Daily target</Text>
            <Text style={styles.rowSub}>{ledger.totalSub}</Text>
          </View>
          <View style={styles.totalRight}>
            <Text style={styles.totalNumber}>{count.toLocaleString('en-US')}</Text>
            <Text style={styles.totalUnit}>kcal</Text>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, progressStyle]} />
          </View>
          <Text style={styles.footerText}>
            {finished ? 'Opening your plan…' : 'Building your plan…'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 24,
  },
  ledgerCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    borderCurve: 'continuous',
    elevation: 0,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: { minHeight: 64, justifyContent: 'center' },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
  rowInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15.5,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 17,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  rowValueNegative: { color: Colors.primaryDeep },
  bar: { backgroundColor: Colors.surfaceInset, borderRadius: 6 },
  totalCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    elevation: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 15,
    color: Colors.primaryDeep,
  },
  totalRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  totalNumber: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  totalUnit: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textMuted,
  },
  footer: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  track: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    overflow: 'hidden',
  },
  fill: { height: 4, borderRadius: 2, backgroundColor: Colors.primary },
  footerText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13.5,
    color: Colors.textMuted,
  },
});
