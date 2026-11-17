import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useDailyLog, useGoals } from '@/context/HealthContext';
import { useOverlay } from '@/navigation/OverlayContext';
import { BASE_BAR_HEIGHT } from '@/components/navigation/BottomNavBar';
import { ProfileButton, sheetStyles, sheetSurface } from '@/components/profile/ProfileUI';
import { ScopedStorage } from '@/services/storage/scopedStorage';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MotionCurves, MotionDurations } from '@/theme/motion';
import { FirstMealDemo } from './FirstMealDemo';
import {
  WALKTHROUGH_KEY,
  WalkthroughState,
  resolveWalkthroughView,
} from '../services/firstMealWalkthrough';

interface Props {
  activeTab: string;
  onOpenRia: () => void;
}

// Mirrors BottomNavBar: 16 px side padding, a 64 px centre slot, four equal tabs (Ria is the second)
const BAR_PAD = 16;
const FAB_SLOT = 64;
const TIP_GAP = 10;
const ARROW = 8;
const SHEET_OFFSET = 420;

const firstName = (name?: string) => {
  const n = name?.trim().split(/\s+/)[0];
  return n && n !== 'Friend' && n !== 'User' ? n : '';
};

export const FirstMealWalkthrough: React.FC<Props> = ({ activeTab, onOpenRia }) => {
  const { currentUser } = useAuth();
  const { userGoals } = useGoals();
  const { dailyLogs } = useDailyLog();
  const { activeModal, openModal } = useOverlay();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const uid = currentUser?.id;

  const [loaded, setLoaded] = useState<{ uid?: string; value: WalkthroughState } | null>(null);
  // Ignore a value loaded for a previous account
  const state = loaded && loaded.uid === uid ? loaded.value : null;
  const [leaving, setLeaving] = useState(false);
  const progress = useSharedValue(0);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    ScopedStorage.getItem<WalkthroughState>(WALKTHROUGH_KEY, uid).then(v => {
      if (alive) setLoaded({ uid, value: v === 'intro' || v === 'ria_tip' ? v : 'done' });
    });
    return () => {
      alive = false;
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [uid]);

  const persist = useCallback(
    (next: WalkthroughState) => {
      setLoaded({ uid, value: next });
      ScopedStorage.setItem(WALKTHROUGH_KEY, next, uid).catch(() => {});
    },
    [uid]
  );

  const hasMeals = Object.values(dailyLogs).some(l => (l.meals?.length ?? 0) > 0);
  const view = resolveWalkthroughView({
    state,
    hasMeals,
    activeTab,
    overlayOpen: activeModal !== null,
  });

  // 'finish' already renders nothing, so only storage needs updating
  useEffect(() => {
    if (view === 'finish') ScopedStorage.setItem(WALKTHROUGH_KEY, 'done', uid).catch(() => {});
  }, [view, uid]);

  useEffect(() => {
    if (view !== 'intro') return;
    progress.set(
      reduceMotion
        ? 1
        : withTiming(1, { duration: MotionDurations.sheet, easing: MotionCurves.decelerate })
    );
  }, [view, reduceMotion, progress]);

  const closeIntro = useCallback(() => {
    if (leaving) return;
    if (reduceMotion) {
      persist('ria_tip');
      return;
    }
    setLeaving(true);
    progress.set(
      withTiming(0, { duration: MotionDurations.emphasized, easing: MotionCurves.easeIn })
    );
    exitTimer.current = setTimeout(() => {
      persist('ria_tip');
      setLeaving(false);
    }, MotionDurations.emphasized);
  }, [leaving, reduceMotion, persist, progress]);

  const tryNow = () => {
    persist('ria_tip');
    openModal({ type: 'foodVision' });
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.get()) * SHEET_OFFSET }],
  }));

  if (view === 'intro') {
    const name = firstName(userGoals?.name);
    return (
      <Modal
        transparent
        visible
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeIntro}
      >
        <View style={styles.root}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
          <Pressable
            style={sheetStyles.backdrop}
            onPress={closeIntro}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <Animated.View
            style={[sheetSurface, styles.sheet, { paddingBottom: 16 + insets.bottom }, sheetAnim]}
            accessibilityViewIsModal
          >
            <View style={sheetStyles.handle} />
            <View style={styles.demo}>
              <FirstMealDemo />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {name ? `Snap your first meal, ${name}` : 'Snap your first meal'}
            </Text>
            <Text style={styles.body}>
              Ria reads the photo and fills in calories and protein. You check it, then log.
            </Text>
            <ProfileButton
              label="Try it now"
              variant="primary"
              testID="btn-walkthrough-try"
              onPress={tryNow}
              style={styles.try}
            />
            <Pressable
              testID="btn-walkthrough-later"
              style={({ pressed }) => [styles.later, pressed && styles.pressed]}
              onPress={closeIntro}
              accessibilityRole="button"
              accessibilityLabel="Later"
            >
              <Text style={styles.laterText}>Later</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  if (view !== 'tip') return null;

  const barWidth = Math.min(width, 480);
  const tabW = (barWidth - 2 * BAR_PAD - FAB_SLOT) / 4;
  const riaCenter = BAR_PAD + tabW * 1.5;
  const cardW = Math.min(280, barWidth - 2 * BAR_PAD);
  const cardLeft = Math.max(BAR_PAD, Math.min(riaCenter - cardW / 2, barWidth - BAR_PAD - cardW));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.tipLayer, { bottom: BASE_BAR_HEIGHT + insets.bottom + TIP_GAP }]}
    >
      <Pressable
        testID="walkthrough-tip"
        onPress={() => {
          persist('done');
          onOpenRia();
        }}
        accessibilityRole="button"
        accessibilityLabel="Ask Ria about it. Try “How much protein was that?” or “What should dinner be?”. Opens Ria."
        style={[styles.tip, { width: cardW, left: cardLeft }]}
      >
        <Text style={styles.tipTitle}>Ask Ria about it</Text>
        <Text style={styles.tipBody}>“How much protein was that?” or “What should dinner be?”</Text>
        <Pressable
          testID="btn-walkthrough-got-it"
          onPress={() => persist('done')}
          accessibilityRole="button"
          accessibilityLabel="Got it"
          hitSlop={8}
          style={styles.gotIt}
        >
          <Text style={styles.gotItText}>Got it</Text>
        </Pressable>
        <View style={[styles.arrow, { left: riaCenter - cardLeft - ARROW }]} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  scrim: { backgroundColor: Colors.overlayScrim },
  sheet: { paddingHorizontal: 16, paddingTop: 4 },
  demo: { marginTop: 8, borderRadius: 10, borderCurve: 'continuous', overflow: 'hidden' },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.textPrimary,
    marginTop: 16,
  },
  body: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  try: { marginTop: 16 },
  later: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  laterText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 15, color: Colors.textSecondary },
  pressed: { opacity: 0.85 },
  tipLayer: { position: 'absolute', left: 0, right: 0, zIndex: 600, elevation: 0 },
  tip: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: Colors.textPrimary,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 0,
  },
  tipTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textInverse,
  },
  tipBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 3,
  },
  gotIt: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', marginTop: 6 },
  gotItText: { fontFamily: Fonts.urbanist.bold, fontSize: 14, color: Colors.burnBorder },
  arrow: {
    position: 'absolute',
    bottom: -ARROW + 1,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderTopWidth: ARROW,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.textPrimary,
  },
});
