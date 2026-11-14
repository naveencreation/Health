import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { haptics } from '@/utils/haptics';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/services/notifications/defaults';
import { OnboardingHeader } from '../components/OnboardingHeader';

export interface RemindersStepScreenProps {
  name?: string;
  skipsBreakfast: boolean;
  mealTimes: { breakfast: string; lunch: string; dinner: string };
  stepGoal: number;
  onEnable: () => void | Promise<void>;
  onNotNow: () => void | Promise<void>;
  onBack: () => void;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

// Fixed fire times; the planner hardcodes them (engine/planner.ts, steps and streak sections).
const STEPS_TIME = '17:30';
const STREAK_TIME = '21:00';

/** 'HH:mm' -> '1:00 pm'; withMinutes=false drops ':00' ('10 pm'). */
const to12h = (hhmm: string, withMinutes = true): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return withMinutes || m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
};

type RowData = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  time?: string;
  tile: string;
  tint: string;
  off?: boolean;
};

export const RemindersStepScreen: React.FC<RemindersStepScreenProps> = ({
  name = '',
  skipsBreakfast,
  mealTimes,
  stepGoal,
  onEnable,
  onNotNow,
  onBack,
  sectionIndex = 3,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const [busy, setBusy] = useState(false);
  const displayName = name.trim();
  const isWeb = Platform.OS === 'web';
  const unlogged = 'Only if it isn’t logged yet';
  const { quietHours, water } = DEFAULT_NOTIFICATION_SETTINGS;

  const rows: RowData[] = [
    {
      key: 'breakfast',
      icon: 'restaurant-outline',
      title: 'Breakfast',
      desc: skipsBreakfast ? 'Off · you skip breakfast' : unlogged,
      time: skipsBreakfast ? '—' : to12h(mealTimes.breakfast),
      tile: skipsBreakfast ? Colors.surfaceContainer : Colors.primaryLight,
      tint: skipsBreakfast ? Colors.textMuted : Colors.primaryDeep,
      off: skipsBreakfast,
    },
    {
      key: 'lunch',
      icon: 'restaurant-outline',
      title: 'Lunch',
      desc: unlogged,
      time: to12h(mealTimes.lunch),
      tile: Colors.primaryLight,
      tint: Colors.primaryDeep,
    },
    {
      key: 'dinner',
      icon: 'restaurant-outline',
      title: 'Dinner',
      desc: unlogged,
      time: to12h(mealTimes.dinner),
      tile: Colors.primaryLight,
      tint: Colors.primaryDeep,
    },
    {
      key: 'water',
      icon: 'water-outline',
      title: 'Water',
      desc: `${water.intervalMinutes / 60} hours after your last glass`,
      tile: Colors.waterTrack,
      tint: Colors.water,
    },
    {
      key: 'steps',
      icon: 'footsteps-outline',
      title: 'Steps',
      desc: `How far you are from ${stepGoal.toLocaleString('en-US')}`,
      time: to12h(STEPS_TIME),
      tile: Colors.stepsLight,
      tint: Colors.steps,
    },
    {
      key: 'streak',
      icon: 'flame-outline',
      title: 'Streak',
      desc: 'Only if nothing’s logged today',
      time: to12h(STREAK_TIME),
      tile: Colors.primaryLight,
      tint: Colors.primaryDeep,
    },
  ];

  const run = (fn: () => void | Promise<void>) => async () => {
    if (busy) return;
    haptics.impactMedium();
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.phoneFrame}>
        <OnboardingHeader
          onBack={onBack}
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          sectionProgress={sectionProgress}
          testID="header-reminders"
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {displayName
              ? `Want a nudge at meal times, ${displayName}?`
              : 'Want a nudge at meal times?'}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            Each reminder opens the camera, so logging is one photo.
          </Text>

          <View style={styles.card}>
            {rows.map((row, i) => (
              <View
                key={row.key}
                style={[styles.row, i > 0 && styles.rowDivider]}
                accessible
                accessibilityLabel={`${row.title}. ${row.desc}${
                  row.time && row.time !== '—' ? `. ${row.time}` : ''
                }`}
              >
                <View style={[styles.iconTile, { backgroundColor: row.tile }]}>
                  <Ionicons name={row.icon} size={18} color={row.tint} />
                </View>
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowTitle, row.off && styles.off]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {row.title}
                  </Text>
                  <Text style={styles.rowDesc} maxFontSizeMultiplier={1.3}>
                    {row.desc}
                  </Text>
                </View>
                {row.time ? (
                  <Text style={[styles.time, row.off && styles.off]} maxFontSizeMultiplier={1.3}>
                    {row.time}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          <Text style={styles.fine} maxFontSizeMultiplier={1.3}>
            {`Quiet from ${to12h(quietHours.start, false)} to ${to12h(quietHours.end, false)}. Change any of these in Profile → Reminders.`}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          {isWeb ? (
            <Pressable
              onPress={run(onEnable)}
              disabled={busy}
              style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ disabled: busy }}
              testID="btn-reminders-continue"
            >
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={run(onEnable)}
                disabled={busy}
                style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Turn on reminders"
                accessibilityState={{ disabled: busy }}
                testID="btn-reminders-enable"
              >
                <Text style={styles.buttonText}>Turn on reminders</Text>
              </Pressable>
              <Pressable
                onPress={run(onNotNow)}
                disabled={busy}
                style={styles.ghost}
                accessibilityRole="button"
                accessibilityLabel="Not now"
                accessibilityState={{ disabled: busy }}
                testID="btn-reminders-not-now"
              >
                <Text style={styles.ghostText}>Not now</Text>
              </Pressable>
            </>
          )}
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
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 22, paddingBottom: 20 },
  question: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  card: {
    marginTop: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    borderCurve: 'continuous',
    elevation: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderSubtle },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: Fonts.urbanist.extraBold, fontSize: 15, color: Colors.textPrimary },
  rowDesc: {
    marginTop: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  time: { fontFamily: Fonts.urbanist.extraBold, fontSize: 14.5, color: Colors.textPrimary },
  off: { color: Colors.textMuted },
  fine: {
    marginTop: 12,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  footer: { paddingTop: 12, paddingBottom: 12 },
  button: {
    height: ControlHeights.button + 4,
    borderRadius: ControlRadii.button,
    borderCurve: 'continuous',
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  buttonText: { fontFamily: Fonts.urbanist.bold, fontSize: 17, color: Colors.textInverse },
  ghost: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  ghostText: { fontFamily: Fonts.urbanist.bold, fontSize: 15, color: Colors.textSecondary },
});
