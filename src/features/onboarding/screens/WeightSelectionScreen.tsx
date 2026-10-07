import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, PanResponder } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { OnboardingHeader } from '../components/OnboardingHeader';

interface WeightSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (weight: number, unit: 'kg' | 'lbs') => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialWeightKg?: number;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const MIN_KG = 30;
const MAX_KG = 200;
const MIN_LBS = 66;
const MAX_LBS = 440;
const RULER_STEP_PX = 10; // px of horizontal drag to change 1 unit
const VISIBLE_TICKS_COUNT = 37; // span of ticks visible across the 368px ruler
const HIT_SLOP_12 = { top: 12, bottom: 12, left: 12, right: 12 };

export const WeightSelectionScreen: React.FC<WeightSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  onSignIn,
  initialWeightKg = 68,
  sectionIndex = 1,
  totalSections = 4,
  sectionProgress = 0.5,
}) => {
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightKg, setWeightKg] = useState<number>(initialWeightKg);
  const [weightLbs, setWeightLbs] = useState<number>(() => Math.round(initialWeightKg * 2.20462));

  const activeWeight = unit === 'kg' ? weightKg : weightLbs;

  // Real-time micro horizontal sliding feedback
  const dragAnimX = useSharedValue(0);

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragAnimX.value }],
  }));
  const startWeightRef = useRef<number>(activeWeight);
  const currentWeightRef = useRef<number>(activeWeight);

  React.useEffect(() => {
    currentWeightRef.current = activeWeight;
  }, [activeWeight]);

  const handleUnitToggle = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === unit) return;
    if (newUnit === 'lbs') {
      const converted = Math.round(weightKg * 2.20462);
      setWeightLbs(converted);
    } else {
      const converted = Math.round(weightLbs / 2.20462);
      setWeightKg(converted);
    }
    setUnit(newUnit);
  };

  const updateWeight = useCallback(
    (newVal: number) => {
      if (unit === 'kg') {
        const clamped = Math.max(MIN_KG, Math.min(MAX_KG, newVal));
        setWeightKg(clamped);
        setWeightLbs(Math.round(clamped * 2.20462));
      } else {
        const clamped = Math.max(MIN_LBS, Math.min(MAX_LBS, newVal));
        setWeightLbs(clamped);
        setWeightKg(Math.round(clamped / 2.20462));
      }
    },
    [unit]
  );

  // Pan Responder for horizontal ruler sliding
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
      onPanResponderGrant: () => {
        startWeightRef.current = currentWeightRef.current;
        dragAnimX.value = 0;
      },
      onPanResponderMove: (_, g) => {
        // Dragging LEFT (-dx) moves ruler right (increases weight)
        // Dragging RIGHT (+dx) moves ruler left (decreases weight)
        const steps = Math.trunc(-g.dx / RULER_STEP_PX);
        const minVal = unit === 'kg' ? MIN_KG : MIN_LBS;
        const maxVal = unit === 'kg' ? MAX_KG : MAX_LBS;
        const targetVal = Math.max(minVal, Math.min(maxVal, startWeightRef.current + steps));

        if (targetVal !== currentWeightRef.current) {
          updateWeight(targetVal);
        }

        // Tactile micro-offset
        const remainder = g.dx + steps * RULER_STEP_PX;
        dragAnimX.value = remainder * 0.45;
      },
      onPanResponderRelease: (_, g) => {
        // Momentum glide
        if (g.vx < -0.5) {
          updateWeight(currentWeightRef.current + 2);
        } else if (g.vx > 0.5) {
          updateWeight(currentWeightRef.current - 2);
        }

        dragAnimX.value = withTiming(0, { duration: 200 });
      },
      onPanResponderTerminate: () => {
        dragAnimX.value = withTiming(0, { duration: 200 });
      },
    })
  ).current;

  // Web horizontal wheel / trackpad support
  const handleWheel = (e: any) => {
    if (Platform.OS === 'web') {
      const deltaX = e.nativeEvent?.deltaX ?? e.deltaX ?? 0;
      const deltaY = e.nativeEvent?.deltaY ?? e.deltaY ?? 0;
      const effectiveDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      if (Math.abs(effectiveDelta) > 8) {
        const direction = effectiveDelta > 0 ? 1 : -1;
        updateWeight(currentWeightRef.current + direction);
      }
    }
  };

  const handleContinuePress = () => {
    if (onContinue) onContinue(activeWeight, unit);
  };

  // Generate ticks around current value for ruler
  const halfSpan = Math.floor(VISIBLE_TICKS_COUNT / 2); // 18 ticks left, 18 ticks right
  const ticks = Array.from({ length: VISIBLE_TICKS_COUNT }, (_, i) => {
    const val = activeWeight - halfSpan + i;
    return val;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Top: Header Bar & Title */}
        <View style={styles.topSection}>
          <OnboardingHeader
            onBack={onBack}
            onSkip={onSkip}
            sectionIndex={sectionIndex}
            totalSections={totalSections}
            sectionProgress={sectionProgress}
          />

          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>What's your current weight?</Text>
            <Text style={styles.screenSubtitle}>
              This sets your baseline. You can update it anytime.
            </Text>
          </View>
        </View>

        {/* Center: Interactive Measurement Instrument */}
        <View style={styles.centerInstrumentContainer}>
          {/* Segmented Unit Toggle (Kg / Lbs) */}
          <View style={styles.unitToggleContainer}>
            <Pressable
              onPress={() => handleUnitToggle('kg')}
              style={({ pressed }) => [
                styles.unitButton,
                unit === 'kg' ? styles.unitButtonActive : styles.unitButtonInactive,
                pressed ? styles.unitButtonPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Switch to kilograms"
              accessibilityState={{ selected: unit === 'kg' }}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  unit === 'kg' ? styles.unitTextActive : styles.unitTextInactive,
                ]}
              >
                Kg
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleUnitToggle('lbs')}
              style={({ pressed }) => [
                styles.unitButton,
                unit === 'lbs' ? styles.unitButtonActive : styles.unitButtonInactive,
                pressed ? styles.unitButtonPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Switch to pounds"
              accessibilityState={{ selected: unit === 'lbs' }}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  unit === 'lbs' ? styles.unitTextActive : styles.unitTextInactive,
                ]}
              >
                Lbs
              </Text>
            </Pressable>
          </View>

          {/* Live Weight Hero Display: e.g. 65 Kg */}
          <View style={styles.displayValueContainer}>
            <Text style={styles.displayNumber}>{activeWeight}</Text>
            <Text style={styles.displayUnit}>{unit === 'kg' ? 'kg' : 'lbs'}</Text>
          </View>

          {/* Frame 14: Horizontal Slidable Ruler */}
          <View
            style={styles.rulerFrame}
            {...panResponder.panHandlers}
            // @ts-ignore Web wheel event
            onWheel={handleWheel}
          >
            {/* Stationary Center Needle */}
            <View style={styles.centerNeedleContainer}>
              <View style={styles.centerNeedle} />
            </View>

            {/* Horizontally Slidable Ticks Tape */}
            <Animated.View style={[styles.ticksTape, dragStyle]}>
              {ticks.map(tickVal => {
                const isMajor = tickVal % 5 === 0;
                const isCenter = tickVal === activeWeight;

                return (
                  <Pressable
                    key={tickVal}
                    onPress={() => updateWeight(tickVal)}
                    style={({ pressed }) => [
                      styles.tickSlot,
                      pressed ? styles.tickSlotPressed : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select weight ${tickVal} ${unit}`}
                    accessibilityState={{ selected: isCenter }}
                  >
                    {/* Tick line */}
                    <View
                      style={[
                        styles.tickLineBase,
                        isMajor ? styles.tickLineMajor : styles.tickLineMinor,
                        isCenter ? styles.tickLineCenter : null,
                      ]}
                    />

                    {/* Major number label (every 5 units, e.g. 50, 55, 60, 65...) */}
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

            {/* Left and Right Fade Gradients */}
            <View style={styles.rulerFadeLeft} />
            <View style={styles.rulerFadeRight} />
          </View>
        </View>

        {/* Bottom: Accessible Continue CTA */}
        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed ? styles.continueButtonPressed : null,
            ]}
            onPress={handleContinuePress}
            accessibilityRole="button"
            accessibilityLabel="Continue to next step"
            testID="btn-weight-continue"
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

  topSection: {
    width: '100%',
  },
  titleContainer: {
    marginTop: 16,
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

  centerInstrumentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },

  // Frame 13: Segmented Unit Toggle (Kg / Lbs)
  unitToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    width: 180,
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  unitButton: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  unitButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    elevation: 0,
    shadowOpacity: 0,
  },
  unitButtonInactive: {
    backgroundColor: 'transparent',
  },
  unitButtonText: {
    fontSize: 14,
  },
  unitTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: '#0F172A',
  },
  unitTextInactive: {
    fontFamily: Fonts.urbanist.medium,
    color: '#64748B',
  },

  // Value Display: 65 kg
  displayValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 18,
  },
  displayNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 60,
    lineHeight: 68,
    color: '#0F172A',
    letterSpacing: -1,
  },
  displayUnit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 22,
    color: '#64748B',
    marginLeft: 6,
  },

  // Frame 14: Horizontal Ruler
  rulerFrame: {
    width: 360,
    height: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'grab',
          userSelect: 'none',
        } as any)
      : {}),
  },
  centerNeedleContainer: {
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
    width: 4,
    height: 60,
    backgroundColor: '#F47551',
    borderRadius: 2,
  },
  ticksTape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: 96,
  },
  tickSlot: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tickSlotPressed: {
    opacity: 0.85,
  },
  tickLineBase: {
    borderRadius: 1,
  },
  tickLineMinor: {
    backgroundColor: '#CBD5E1',
    width: 1.5,
    height: 20,
    marginTop: 20,
  },
  tickLineMajor: {
    backgroundColor: '#64748B',
    width: 2,
    height: 38,
    marginTop: 10,
  },
  tickLineCenter: {
    opacity: 0, // Covered by needle
  },
  tickLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    width: 36,
  },
  tickLabelDefault: {
    color: '#64748B',
  },
  tickLabelCenter: {
    color: '#0F172A',
    fontFamily: Fonts.urbanist.bold,
  },
  tickLabelSpacer: {
    height: 18,
    marginTop: 8,
  },

  // Fade gradients for ruler edges
  rulerFadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 50,
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
    width: 50,
    zIndex: 5,
    pointerEvents: 'none',
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(to left, #F8FAFC 0%, rgba(248, 250, 252, 0) 100%)',
        } as any)
      : {}),
  },

  // Frame 9: Continue Button
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
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  btnPressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  continueButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
