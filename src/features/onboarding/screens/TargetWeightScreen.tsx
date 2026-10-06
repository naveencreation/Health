import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import {
  minSafeTargetKg,
  calculateGoalDate,
  GoalType,
} from '../services/onboardingCalculator';

interface TargetWeightScreenProps {
  onBack?: () => void;
  onContinue: (targetWeightKg: number) => void;
  onSkip?: () => void;
  currentWeightKg: number;
  heightCm: number;
  goal: GoalType;
  initialTargetWeightKg?: number;
  weightUnit?: 'kg' | 'lbs';
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const RULER_STEP_PX = 10; // Drag pixels to change 1 unit
const VISIBLE_TICKS_COUNT = 33;

export const TargetWeightScreen: React.FC<TargetWeightScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  currentWeightKg,
  heightCm,
  goal,
  initialTargetWeightKg,
  weightUnit = 'kg',
  sectionIndex = 1,
  totalSections = 4,
  sectionProgress = 0.75,
}) => {
  const isLoss = goal === 'lose_weight';
  const minSafe = useMemo(() => minSafeTargetKg(heightCm), [heightCm]);

  // Sensible default: 5 kg loss or 3 kg gain
  const defaultTarget = useMemo(() => {
    if (initialTargetWeightKg) return initialTargetWeightKg;
    if (isLoss) {
      const suggested = Math.max(minSafe, currentWeightKg - 5);
      return Math.round(suggested);
    } else {
      return Math.round(currentWeightKg + 3);
    }
  }, [initialTargetWeightKg, isLoss, minSafe, currentWeightKg]);

  const [targetKg, setTargetKg] = useState<number>(defaultTarget);

  // Check if target is below safe BMI 18.5 floor for weight loss
  const isBelowSafeFloor = isLoss && targetKg < minSafe;
  const effectiveTarget = isBelowSafeFloor ? minSafe : targetKg;

  const diffKg = Math.abs(currentWeightKg - effectiveTarget);

  // Estimate weeks at steady pace: ~0.5 kg/week for loss, 0.25 kg/week for gain
  const estimatedWeeks = useMemo(() => {
    if (diffKg === 0) return 0;
    const weeklyRate = isLoss ? 0.5 : 0.25;
    return Math.max(1, Math.round(diffKg / weeklyRate));
  }, [diffKg, isLoss]);

  const goalDateStr = useMemo(() => {
    return calculateGoalDate(estimatedWeeks);
  }, [estimatedWeeks]);

  const displayTarget =
    weightUnit === 'kg' ? targetKg : Math.round(targetKg * 2.20462);

  const displayCurrent =
    weightUnit === 'kg' ? currentWeightKg : Math.round(currentWeightKg * 2.20462);

  const displayDiff =
    weightUnit === 'kg' ? diffKg : Math.round(diffKg * 2.20462);

  const adjustWeight = useCallback((deltaKg: number) => {
    haptics.selection();
    setTargetKg(prev => {
      const next = prev + deltaKg;
      return Math.max(30, Math.min(250, next));
    });
  }, []);

  // Sync refs for gesture slider
  const startTargetRef = useRef<number>(targetKg);
  const currentTargetRef = useRef<number>(targetKg);

  useEffect(() => {
    currentTargetRef.current = targetKg;
  }, [targetKg]);

  const dragAnimX = useSharedValue(0);
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragAnimX.value }],
  }));

  const updateTargetWeight = useCallback((val: number) => {
    const clamped = Math.max(30, Math.min(250, val));
    if (clamped !== currentTargetRef.current) {
      currentTargetRef.current = clamped;
      haptics.selection();
      setTargetKg(clamped);
    }
  }, []);

  // Horizontal pan responder for ruler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
      onPanResponderGrant: () => {
        startTargetRef.current = currentTargetRef.current;
        dragAnimX.value = 0;
      },
      onPanResponderMove: (_, g) => {
        const steps = Math.trunc(-g.dx / RULER_STEP_PX);
        const targetVal = Math.max(30, Math.min(250, startTargetRef.current + steps));
        if (targetVal !== currentTargetRef.current) {
          updateTargetWeight(targetVal);
        }
        const remainder = g.dx + steps * RULER_STEP_PX;
        dragAnimX.value = remainder * 0.45;
      },
      onPanResponderRelease: (_, g) => {
        if (g.vx < -0.5) {
          updateTargetWeight(currentTargetRef.current + 2);
        } else if (g.vx > 0.5) {
          updateTargetWeight(currentTargetRef.current - 2);
        }
        dragAnimX.value = withTiming(0, { duration: 200 });
      },
      onPanResponderTerminate: () => {
        dragAnimX.value = withTiming(0, { duration: 200 });
      },
    })
  ).current;

  // Web wheel / trackpad support
  const handleWheel = (e: any) => {
    if (Platform.OS === 'web') {
      const deltaX = e.nativeEvent?.deltaX ?? e.deltaX ?? 0;
      const deltaY = e.nativeEvent?.deltaY ?? e.deltaY ?? 0;
      const effectiveDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      if (Math.abs(effectiveDelta) > 8) {
        const direction = effectiveDelta > 0 ? 1 : -1;
        updateTargetWeight(currentTargetRef.current + direction);
      }
    }
  };

  const handleContinue = () => {
    haptics.selection();
    onContinue(effectiveTarget);
  };

  // Generate ruler ticks around targetKg
  const halfSpan = Math.floor(VISIBLE_TICKS_COUNT / 2);
  const ticks = Array.from({ length: VISIBLE_TICKS_COUNT }, (_, i) => {
    return targetKg - halfSpan + i;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        <OnboardingHeader
          onBack={onBack}
          onSkip={onSkip}
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          sectionProgress={sectionProgress}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>Where would you like to be?</Text>
            <Text style={styles.screenSubtitle}>
              Starting at {displayCurrent} {weightUnit}. We'll adjust your calorie budget to get you there safely.
            </Text>
          </View>

          {/* Goal Instrument Card */}
          <View style={styles.instrumentCard}>
            <View style={styles.startingNodeBadge}>
              <Ionicons name="flag-outline" size={13} color="#64748B" />
              <Text style={styles.startingNodeText}>
                STARTING AT {displayCurrent} {weightUnit.toUpperCase()}
              </Text>
            </View>

            {/* Hero Value Row with Nudge Controls */}
            <View style={styles.heroRow}>
              <Pressable
                onPress={() => adjustWeight(-1)}
                style={({ pressed }) => [styles.nudgeButton, pressed && styles.nudgeButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Decrease target weight by 1"
                testID="decrease-weight-button"
              >
                <Ionicons name="remove" size={20} color="#1E293B" />
              </Pressable>

              <View style={styles.displayTargetContainer}>
                <Text style={styles.displayTargetNumber}>{displayTarget}</Text>
                <Text style={styles.displayTargetUnit}>{weightUnit}</Text>
              </View>

              <Pressable
                onPress={() => adjustWeight(1)}
                style={({ pressed }) => [styles.nudgeButton, pressed && styles.nudgeButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Increase target weight by 1"
                testID="increase-weight-button"
              >
                <Ionicons name="add" size={20} color="#1E293B" />
              </Pressable>
            </View>

            {/* Delta Tag */}
            <View style={styles.deltaTag}>
              <Ionicons
                name={isLoss ? 'arrow-down' : 'arrow-up'}
                size={12}
                color="#F47551"
              />
              <Text style={styles.deltaTagText}>
                {isLoss ? 'Lose' : 'Gain'} {displayDiff} {weightUnit}
              </Text>
            </View>

            {/* Interactive Horizontal Ruler */}
            <View
              style={styles.rulerFrame}
              {...panResponder.panHandlers}
              // @ts-ignore Web wheel
              onWheel={handleWheel}
            >
              {/* Stationary Center Coral Needle */}
              <View style={styles.needleContainer}>
                <View style={styles.centerNeedle} />
              </View>

              {/* Slidable Ticks Tape */}
              <Animated.View style={[styles.ticksTape, dragStyle]}>
                {ticks.map(tickVal => {
                  const isMajor = tickVal % 5 === 0;
                  const isCenter = tickVal === targetKg;

                  return (
                    <Pressable
                      key={tickVal}
                      onPress={() => updateTargetWeight(tickVal)}
                      style={styles.tickSlot}
                      accessibilityRole="button"
                      accessibilityLabel={`Set target weight to ${tickVal}`}
                    >
                      <View
                        style={[
                          styles.tickLineBase,
                          isMajor ? styles.tickLineMajor : styles.tickLineMinor,
                          isCenter ? styles.tickLineCenter : null,
                        ]}
                      />
                      {isMajor ? (
                        <Text
                          style={[
                            styles.tickLabel,
                            isCenter ? styles.tickLabelCenter : styles.tickLabelDefault,
                          ]}
                        >
                          {tickVal}
                        </Text>
                      ) : (
                        <View style={styles.tickLabelSpacer} />
                      )}
                    </Pressable>
                  );
                })}
              </Animated.View>

              {/* Edge Gradient Fades */}
              <View style={styles.rulerFadeLeft} />
              <View style={styles.rulerFadeRight} />
            </View>

            {/* Quick Offset Milestone Chips */}
            <View style={styles.quickChipsRow}>
              {isLoss ? (
                <>
                  <Pressable
                    onPress={() => setTargetKg(Math.max(minSafe, currentWeightKg - 3))}
                    style={({ pressed }) => [
                      styles.quickChip,
                      pressed && styles.quickChipPressed,
                    ]}
                  >
                    <Text style={styles.quickChipText}>-3 {weightUnit}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTargetKg(Math.max(minSafe, currentWeightKg - 5))}
                    style={({ pressed }) => [
                      styles.quickChip,
                      pressed && styles.quickChipPressed,
                    ]}
                  >
                    <Text style={styles.quickChipText}>-5 {weightUnit}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTargetKg(Math.max(minSafe, currentWeightKg - 10))}
                    style={({ pressed }) => [
                      styles.quickChip,
                      pressed && styles.quickChipPressed,
                    ]}
                  >
                    <Text style={styles.quickChipText}>-10 {weightUnit}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => setTargetKg(currentWeightKg + 2)}
                    style={({ pressed }) => [
                      styles.quickChip,
                      pressed && styles.quickChipPressed,
                    ]}
                  >
                    <Text style={styles.quickChipText}>+2 {weightUnit}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTargetKg(currentWeightKg + 5)}
                    style={({ pressed }) => [
                      styles.quickChip,
                      pressed && styles.quickChipPressed,
                    ]}
                  >
                    <Text style={styles.quickChipText}>+5 {weightUnit}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Live Feedback Card */}
          <View style={styles.feedbackCard} testID="live-feedback-card">
            <View style={styles.feedbackHeader}>
              <Ionicons name="trending-up-outline" size={17} color="#F47551" />
              <Text style={styles.feedbackTitle}>Projected Timeline</Text>
            </View>
            <Text style={styles.feedbackBody}>
              {isLoss ? '-' : '+'}
              {displayDiff} {weightUnit} · about {estimatedWeeks} {estimatedWeeks === 1 ? 'week' : 'weeks'} at a steady pace · around {goalDateStr}
            </Text>
          </View>

          {/* Safety Guardrail Alert Banner */}
          {isBelowSafeFloor && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.guardrailBanner}
              testID="guardrail-warning-banner"
            >
              <Ionicons name="heart-outline" size={18} color="#D97706" style={styles.guardrailIcon} />
              <Text style={styles.guardrailText}>
                That's below a healthy range for your height, so let's aim for {minSafe} kg.
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to activity level"
            testID="target-weight-continue-button"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  titleContainer: {
    marginBottom: 16,
  },
  screenTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimary ?? '#1E293B',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary ?? '#64748B',
  },

  // Target Instrument Card
  instrumentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    marginBottom: 14,
  },
  startingNodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  startingNodeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#64748B',
  },

  // Hero Row: [-] 91 kg [+]
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 6,
  },
  nudgeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  nudgeButtonPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.94 }],
  },
  displayTargetContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 130,
  },
  displayTargetNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 54,
    lineHeight: 62,
    color: '#0F172A',
    letterSpacing: -1,
  },
  displayTargetUnit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 20,
    color: '#64748B',
    marginLeft: 6,
  },

  // Delta Tag: Lose 4 kg
  deltaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FFF1ED',
    marginBottom: 16,
  },
  deltaTagText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#F47551',
  },

  // Horizontal Tape-Ruler
  rulerFrame: {
    width: '100%',
    height: 94,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    marginBottom: 16,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'grab',
          userSelect: 'none',
        } as any)
      : {}),
  },
  needleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  centerNeedle: {
    width: 3.5,
    height: 52,
    backgroundColor: '#F47551',
    borderRadius: 2,
  },
  ticksTape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: 80,
  },
  tickSlot: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tickLineBase: {
    borderRadius: 1,
  },
  tickLineMinor: {
    backgroundColor: '#CBD5E1',
    width: 1.5,
    height: 16,
    marginTop: 16,
  },
  tickLineMajor: {
    backgroundColor: '#64748B',
    width: 2,
    height: 32,
    marginTop: 8,
  },
  tickLineCenter: {
    opacity: 0,
  },
  tickLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 6,
    width: 34,
  },
  tickLabelDefault: {
    color: '#64748B',
  },
  tickLabelCenter: {
    color: '#0F172A',
    fontFamily: Fonts.urbanist.bold,
  },
  tickLabelSpacer: {
    height: 16,
    marginTop: 6,
  },
  rulerFadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 44,
    zIndex: 5,
    pointerEvents: 'none',
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(to right, #F8FAFC 0%, rgba(248, 250, 252, 0) 100%)',
        } as any)
      : {}),
  },
  rulerFadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    zIndex: 5,
    pointerEvents: 'none',
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(to left, #F8FAFC 0%, rgba(248, 250, 252, 0) 100%)',
        } as any)
      : {}),
  },

  // Milestone Quick Chips
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.96 }],
  },
  quickChipText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#475569',
  },

  // Live Feedback Card
  feedbackCard: {
    backgroundColor: '#FFFBF9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  feedbackTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#9A3412',
    letterSpacing: 0.2,
  },
  feedbackBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
  },

  // Guardrail Banner
  guardrailBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  guardrailIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  guardrailText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#92400E',
  },

  // Footer
  footerContainer: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  continueButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
