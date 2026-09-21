import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface WeightSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (weight: number, unit: 'kg' | 'lbs') => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialWeightKg?: number;
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
}) => {
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightKg, setWeightKg] = useState<number>(initialWeightKg);
  const [weightLbs, setWeightLbs] = useState<number>(() => Math.round(initialWeightKg * 2.20462));

  const activeWeight = unit === 'kg' ? weightKg : weightLbs;

  // Real-time micro horizontal sliding feedback
  const dragAnimX = useRef(new Animated.Value(0)).current;
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
        dragAnimX.setValue(0);
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
        dragAnimX.setValue(remainder * 0.45);
      },
      onPanResponderRelease: (_, g) => {
        // Momentum glide
        if (g.vx < -0.5) {
          updateWeight(currentWeightRef.current + 2);
        } else if (g.vx > 0.5) {
          updateWeight(currentWeightRef.current - 2);
        }

        Animated.spring(dragAnimX, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragAnimX, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
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
        {/* Frame 12: Header Bar */}
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed ? styles.btnPressedSubtle : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP_12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#1C274C" />
          </Pressable>

          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoDot} />
            <Text style={styles.logoBadgeText}>Calori</Text>
          </View>

          <View style={styles.stepBadge}>
            <Text style={styles.stepIndicatorText}>Step 2 of 5</Text>
          </View>
        </View>

        {/* Title & Cognitive Context */}
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>What is your weight?</Text>
          <Text style={styles.screenSubtitle}>
            Calibrates your daily energy burn and calorie baseline
          </Text>
        </View>

        {/* Frame 13: Segmented Unit Toggle (Kg / Lbs) */}
        <View style={styles.unitToggleContainer}>
          {/* Kg Button */}
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

          {/* Lbs Button */}
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

        {/* Live Weight Display: e.g. 65 Kg */}
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
          <Animated.View
            style={[
              styles.ticksTape,
              {
                transform: [{ translateX: dragAnimX }],
              },
            ]}
          >
            {ticks.map((tickVal) => {
              const isMajor = tickVal % 5 === 0;
              const isCenter = tickVal === activeWeight;

              return (
                <Pressable
                  key={tickVal}
                  onPress={() => updateWeight(tickVal)}
                  style={({ pressed }) => [styles.tickSlot, pressed ? styles.tickSlotPressed : null]}
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

        {/* Frame 9: Accessible Continue CTA & Skip */}
        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [styles.continueButton, pressed ? styles.continueButtonPressed : null]}
            onPress={handleContinuePress}
            accessibilityRole="button"
            accessibilityLabel="Continue with selected weight"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#0F172A" />
          </Pressable>

          {/* Skip & Sign In Actions */}
          <View style={styles.footerLinksRow}>
            <Pressable
              style={({ pressed }) => [styles.skipContainer, pressed ? styles.btnPressedSubtle : null]}
              onPress={onSkip}
              hitSlop={HIT_SLOP_12}
              accessibilityRole="button"
              accessibilityLabel="Skip weight selection"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            {onSignIn ? (
              <Pressable
                onPress={onSignIn}
                hitSlop={HIT_SLOP_12}
                style={({ pressed }) => [styles.signInBottomBtn, pressed ? styles.btnPressedSubtle : null]}
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
              >
                <Text style={styles.signInLinkText}>
                  Have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 375,
    height: 812,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    paddingBottom: 28,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 12px 30px rgba(0, 0, 0, 0.08)',
        } as any)
      : {}),
  },

  // Frame 12: Top Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CDE26D',
  },
  logoBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
  stepBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepIndicatorText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.2,
  },

  // Title: What’s your weight?
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },

  // Frame 13: Segmented Unit Toggle (Kg / Lbs)
  unitToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    width: 200,
    height: 44,
    borderRadius: 14,
    padding: 4,
    alignSelf: 'center',
    marginTop: 16,
  },
  unitButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  unitButtonActive: {
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
        } as any)
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }),
  },
  unitButtonInactive: {
    backgroundColor: 'transparent',
  },
  unitButtonText: {
    fontSize: 14,
  },
  unitTextActive: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#0F172A',
  },
  unitTextInactive: {
    fontFamily: 'Poppins_500Medium',
    color: '#64748B',
  },

  // Value Display: 65 kg
  displayValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  displayNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 64,
    lineHeight: 72,
    color: '#0F172A',
    letterSpacing: -1,
  },
  displayUnit: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: '#64748B',
    marginLeft: 6,
  },

  // Frame 14: Horizontal Ruler
  rulerFrame: {
    width: 360,
    height: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
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
    opacity: 0.6,
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_700Bold',
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
    alignItems: 'center',
    gap: 16,
    paddingBottom: 4,
  },
  continueButton: {
    width: 220,
    height: 52,
    backgroundColor: '#CDE26D',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#CDE26D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnPressedSubtle: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  continueButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  skipContainer: {
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: '#64748B',
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 4,
  },
  signInBottomBtn: {
    paddingVertical: 6,
  },
  signInLinkText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#64748B',
  },
  signInLinkBold: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#F47551',
  },
});
