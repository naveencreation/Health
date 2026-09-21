import React, { useState, useRef, useCallback, useEffect } from 'react';
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

export type HeightUnit = 'cm' | 'ft';

interface HeightSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (heightCm: number, unit: HeightUnit) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialHeightCm?: number;
}

const MIN_CM = 100;
const MAX_CM = 250;
const MIN_TOTAL_INCHES = 39; // 3 ft 3 in (~100 cm)
const MAX_TOTAL_INCHES = 98; // 8 ft 2 in (~250 cm)

const RULER_STEP_PX = 12; // vertical drag pixels per unit
const VISIBLE_TICKS_COUNT = 31; // vertical visible span
const HIT_SLOP_12 = { top: 12, bottom: 12, left: 12, right: 12 };

interface TickItemProps {
  tickVal: number;
  unit: HeightUnit;
  isCenter: boolean;
  onSelect: (val: number) => void;
}

const TickItem = React.memo<TickItemProps>(({ tickVal, unit, isCenter, onSelect }) => {
  const isCm = unit === 'cm';
  const isMajor = isCm ? tickVal % 5 === 0 : tickVal % 6 === 0;

  let labelText = '';
  if (isMajor) {
    if (isCm) {
      labelText = `${tickVal}`;
    } else {
      const f = Math.floor(tickVal / 12);
      const i = tickVal % 12;
      labelText = i === 0 ? `${f}'` : `${f}'${i}"`;
    }
  }

  const handlePress = useCallback(() => {
    onSelect(tickVal);
  }, [onSelect, tickVal]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.tickSlot, pressed ? styles.tickSlotPressed : null]}
      accessibilityRole="button"
      accessibilityLabel={`Select height ${labelText || tickVal}`}
      accessibilityState={{ selected: isCenter }}
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
          {labelText}
        </Text>
      ) : (
        <View style={styles.tickLabelSpacer} />
      )}
    </Pressable>
  );
});

export const HeightSelectionScreen: React.FC<HeightSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  onSignIn,
  initialHeightCm = 170,
}) => {
  const [unit, setUnit] = useState<HeightUnit>('cm');
  const [heightCm, setHeightCm] = useState<number>(initialHeightCm);

  // Single source of truth: totalInches and activeValue are strictly derived
  const totalInches = Math.round(heightCm / 2.54);
  const activeValue = unit === 'cm' ? heightCm : totalInches;

  // Real-time micro vertical drag visual feedback
  const dragAnimY = useRef(new Animated.Value(0)).current;
  const startValRef = useRef<number>(activeValue);
  const currentValRef = useRef<number>(activeValue);

  useEffect(() => {
    currentValRef.current = activeValue;
  }, [activeValue]);

  // Unit toggle without state drift
  const handleUnitToggle = useCallback((newUnit: HeightUnit) => {
    setUnit(newUnit);
  }, []);

  const updateHeight = useCallback(
    (newVal: number) => {
      if (unit === 'cm') {
        const clamped = Math.max(MIN_CM, Math.min(MAX_CM, newVal));
        setHeightCm(clamped);
      } else {
        const clampedInches = Math.max(MIN_TOTAL_INCHES, Math.min(MAX_TOTAL_INCHES, newVal));
        setHeightCm(Math.round(clampedInches * 2.54));
      }
    },
    [unit]
  );

  // Pan Responder for vertical height tape sliding
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        startValRef.current = currentValRef.current;
        dragAnimY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        // Dragging DOWN (+dy) moves ruler down (increases height value)
        // Dragging UP (-dy) moves ruler up (decreases height value)
        const steps = Math.trunc(g.dy / RULER_STEP_PX);
        const minVal = unit === 'cm' ? MIN_CM : MIN_TOTAL_INCHES;
        const maxVal = unit === 'cm' ? MAX_CM : MAX_TOTAL_INCHES;
        const targetVal = Math.max(minVal, Math.min(maxVal, startValRef.current + steps));

        if (targetVal !== currentValRef.current) {
          updateHeight(targetVal);
        }

        // Tactile micro-offset
        const remainder = g.dy - steps * RULER_STEP_PX;
        dragAnimY.setValue(remainder * 0.4);
      },
      onPanResponderRelease: (_, g) => {
        // Momentum flick
        if (g.vy > 0.5) {
          updateHeight(currentValRef.current + 2);
        } else if (g.vy < -0.5) {
          updateHeight(currentValRef.current - 2);
        }

        Animated.spring(dragAnimY, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragAnimY, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      },
    })
  ).current;

  // Web vertical wheel / trackpad support
  const handleWheel = (e: any) => {
    if (Platform.OS === 'web') {
      const deltaY = e.nativeEvent?.deltaY ?? e.deltaY ?? 0;
      if (Math.abs(deltaY) > 8) {
        const direction = deltaY < 0 ? 1 : -1;
        updateHeight(currentValRef.current + direction);
      }
    }
  };

  const handleContinuePress = () => {
    if (onContinue) {
      onContinue(heightCm, unit);
    }
  };

  // Generate ticks around current value for vertical stadiometer
  const halfSpan = Math.floor(VISIBLE_TICKS_COUNT / 2); // 15 ticks above, 15 ticks below
  const ticks = Array.from({ length: VISIBLE_TICKS_COUNT }, (_, i) => {
    // Top ticks have higher values, bottom ticks have lower values (like real wall stadiometer)
    const val = activeValue + halfSpan - i;
    return val;
  });

  // Calculate feet and inches for display
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

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
            <Text style={styles.stepIndicatorText}>Step 3 of 5</Text>
          </View>
        </View>

        {/* Title & Cognitive Context */}
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>What is your height?</Text>
          <Text style={styles.screenSubtitle}>
            Calibrates your daily energy burn and body mass index
          </Text>
        </View>

        {/* Frame 13: Segmented Unit Toggle (Cm / Ft) */}
        <View style={styles.unitToggleContainer}>
          {/* Cm Button */}
          <Pressable
            onPress={() => handleUnitToggle('cm')}
            style={({ pressed }) => [
              styles.unitButton,
              unit === 'cm' ? styles.unitButtonActive : styles.unitButtonInactive,
              pressed ? styles.unitButtonPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Switch to centimeters"
            accessibilityState={{ selected: unit === 'cm' }}
          >
            <Text
              style={[
                styles.unitButtonText,
                unit === 'cm' ? styles.unitTextActive : styles.unitTextInactive,
              ]}
            >
              Cm
            </Text>
          </Pressable>

          {/* Ft Button */}
          <Pressable
            onPress={() => handleUnitToggle('ft')}
            style={({ pressed }) => [
              styles.unitButton,
              unit === 'ft' ? styles.unitButtonActive : styles.unitButtonInactive,
              pressed ? styles.unitButtonPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Switch to feet and inches"
            accessibilityState={{ selected: unit === 'ft' }}
          >
            <Text
              style={[
                styles.unitButtonText,
                unit === 'ft' ? styles.unitTextActive : styles.unitTextInactive,
              ]}
            >
              Ft
            </Text>
          </Pressable>
        </View>

        {/* Live Height Display: e.g. 175 cm or 5' 9" */}
        <View style={styles.displayValueContainer}>
          {unit === 'cm' ? (
            <View style={styles.numberWithUnitRow}>
              <Text style={styles.displayNumber}>{heightCm}</Text>
              <Text style={styles.displayUnit}>cm</Text>
            </View>
          ) : (
            <View style={styles.imperialDisplayCol}>
              <View style={styles.numberWithUnitRow}>
                <Text style={styles.displayNumber}>{feet}</Text>
                <Text style={styles.displayUnitSmall}>ft</Text>
                <Text style={[styles.displayNumber, { marginLeft: 12 }]}>{inches}</Text>
                <Text style={styles.displayUnitSmall}>in</Text>
              </View>
              <Text style={styles.secondaryCmHint}>{heightCm} cm</Text>
            </View>
          )}
        </View>

        {/* Frame 14: Polished Vertical Stadiometer Card */}
        <View style={styles.stadiometerSection}>
          <View
            style={styles.rulerFrame}
            {...panResponder.panHandlers}
            // @ts-ignore Web wheel event
            onWheel={handleWheel}
          >
            {/* Stationary Center Pointer Needle in Calori Coral (#F47551) */}
            <View style={styles.centerNeedleContainer}>
              <View style={styles.needlePointerTriangle} />
              <View style={styles.centerNeedleLine} />
            </View>

            {/* Vertically Slidable Ticks Tape */}
            <Animated.View
              style={[
                styles.ticksTape,
                {
                  transform: [{ translateY: dragAnimY }],
                },
              ]}
            >
              {ticks.map((tickVal) => (
                <TickItem
                  key={tickVal}
                  tickVal={tickVal}
                  unit={unit}
                  isCenter={tickVal === activeValue}
                  onSelect={updateHeight}
                />
              ))}
            </Animated.View>

            {/* Top and Bottom Fade Gradients */}
            <View style={styles.rulerFadeTop} />
            <View style={styles.rulerFadeBottom} />
          </View>
        </View>

        {/* Frame 9: Accessible Continue CTA & Footer Links */}
        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [styles.continueButton, pressed ? styles.continueButtonPressed : null]}
            onPress={handleContinuePress}
            accessibilityRole="button"
            accessibilityLabel="Continue with selected height"
            testID="btn-height-continue"
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
              accessibilityLabel="Skip height selection"
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
    borderCurve: 'continuous',
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

  // Frame 12: Header Bar (matches Weight & Age 1:1)
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
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressedSubtle: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  logoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CDE26D', // Calori Lime!
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
    borderCurve: 'continuous',
  },
  stepIndicatorText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.2,
  },

  // Title: What’s your height? (matches Weight 1:1)
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

  // Frame 13: Segmented Unit Toggle (Cm / Ft) (matches Weight 1:1)
  unitToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    width: 200,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 4,
    alignSelf: 'center',
    marginTop: 16,
  },
  unitButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
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

  // Value Display: 175 cm (matches Weight 1:1)
  displayValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  numberWithUnitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
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
  displayUnitSmall: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: '#64748B',
    marginLeft: 4,
  },
  imperialDisplayCol: {
    alignItems: 'center',
  },
  secondaryCmHint: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#64748B',
    marginTop: -2,
  },

  // Stadiometer Section
  stadiometerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  rulerFrame: {
    width: 280,
    height: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'grab',
          userSelect: 'none',
        } as any)
      : {}),
  },

  // Center Coral Needle (#F47551 - matches Weight needle!)
  centerNeedleContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  needlePointerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderBottomWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: '#F47551', // Calori Coral!
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 14,
  },
  centerNeedleLine: {
    flex: 1,
    height: 2.5,
    backgroundColor: '#F47551', // Calori Coral!
    borderRadius: 1,
  },

  ticksTape: {
    alignItems: 'flex-start',
    paddingLeft: 24,
  },
  tickSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    width: '100%',
  },
  tickSlotPressed: {
    opacity: 0.6,
  },
  tickLineBase: {
    height: 2,
    borderRadius: 1,
    marginRight: 16,
  },
  tickLineMinor: {
    width: 20,
    backgroundColor: '#CBD5E1',
  },
  tickLineMajor: {
    width: 38,
    backgroundColor: '#64748B',
  },
  tickLineCenter: {
    width: 48,
    backgroundColor: '#F47551', // Calori Coral!
    height: 3,
  },
  tickLabel: {
    fontSize: 13,
    lineHeight: 18,
    width: 48,
  },
  tickLabelDefault: {
    fontFamily: 'Poppins_500Medium',
    color: '#64748B',
  },
  tickLabelCenter: {
    color: '#0F172A',
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  tickLabelSpacer: {
    height: 18,
  },

  // Ruler Top/Bottom Fade Gradients
  rulerFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 5,
    backgroundColor: '#F8FAFC',
    opacity: 0.85,
    pointerEvents: 'none',
  },
  rulerFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 5,
    backgroundColor: '#F8FAFC',
    opacity: 0.85,
    pointerEvents: 'none',
  },

  // Frame 9: Continue CTA & Footer Links (matches Weight & Age 1:1)
  footerContainer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 4,
  },
  continueButton: {
    width: 220,
    height: 52,
    backgroundColor: '#CDE26D', // Calori Lime!
    borderRadius: 16,
    borderCurve: 'continuous',
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
    color: '#F47551', // Calori Coral!
  },
});
