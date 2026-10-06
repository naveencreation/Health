import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, PanResponder } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { OnboardingHeader } from '../components/OnboardingHeader';

export type HeightUnit = 'cm' | 'ft';

interface HeightSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (heightCm: number, unit: HeightUnit) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialHeightCm?: number;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
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
  if (isMajor || isCenter) {
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
      <View style={styles.tickLineSlot}>
        <View
          style={[
            styles.tickLineBase,
            isMajor ? styles.tickLineMajor : styles.tickLineMinor,
            isCenter ? styles.tickLineCenter : null,
          ]}
        />
      </View>
      {isMajor || isCenter ? (
        <Text
          style={[styles.tickLabel, isCenter ? styles.tickLabelCenter : styles.tickLabelDefault]}
        >
          {labelText}
        </Text>
      ) : (
        <View style={styles.tickLabelSpacer} />
      )}
    </Pressable>
  );
});
TickItem.displayName = 'TickItem';

export const HeightSelectionScreen: React.FC<HeightSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  onSignIn,
  initialHeightCm = 170,
  sectionIndex = 1,
  totalSections = 4,
  sectionProgress = 0.25,
}) => {
  const [unit, setUnit] = useState<HeightUnit>('cm');
  const [heightCm, setHeightCm] = useState<number>(initialHeightCm);

  // Single source of truth: totalInches and activeValue are strictly derived
  const totalInches = Math.round(heightCm / 2.54);
  const activeValue = unit === 'cm' ? heightCm : totalInches;

  // Real-time micro vertical drag visual feedback
  const dragAnimY = useSharedValue(0);

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragAnimY.value }],
  }));
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
        dragAnimY.value = 0;
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
        dragAnimY.value = remainder * 0.4;
      },
      onPanResponderRelease: (_, g) => {
        // Momentum flick
        if (g.vy > 0.5) {
          updateHeight(currentValRef.current + 2);
        } else if (g.vy < -0.5) {
          updateHeight(currentValRef.current - 2);
        }

        dragAnimY.value = withTiming(0, { duration: 200 });
      },
      onPanResponderTerminate: () => {
        dragAnimY.value = withTiming(0, { duration: 200 });
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
            <Text style={styles.screenTitle}>How tall are you?</Text>
            <Text style={styles.screenSubtitle}>
              Used to calculate your daily energy needs accurately.
            </Text>
          </View>
        </View>

        {/* Center: Interactive Measurement Instrument */}
        <View style={styles.centerInstrumentContainer}>
          {/* Segmented Unit Toggle (Cm / Ft) */}
          <View style={styles.unitToggleContainer}>
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

          {/* Live Height Hero Display: e.g. 182 cm or 5' 11" */}
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

          {/* Polished Stadiometer Instrument Card */}
          <View style={styles.stadiometerSection}>
            <View
              style={styles.rulerFrame}
              {...panResponder.panHandlers}
              // @ts-ignore Web wheel event
              onWheel={handleWheel}
            >
              {/* Stationary Center Pointer Needle in Calorify Coral (#F47551) */}
              <View style={styles.centerNeedleContainer}>
                <View style={styles.needlePointerTriangle} />
                <View style={styles.centerNeedleLine} />
              </View>

              {/* Vertically Slidable Ticks Tape */}
              <Animated.View style={[styles.ticksTape, dragStyle]}>
                {ticks.map(tickVal => (
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
            testID="btn-height-continue"
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
  btnPressedSubtle: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
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

  // Frame 13: Segmented Unit Toggle (Cm / Ft) (matches Weight 1:1)
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
    opacity: 0.85,
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

  // Value Display: 182 cm (matches Weight 1:1)
  displayValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 18,
  },
  numberWithUnitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
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
  displayUnitSmall: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 20,
    color: '#64748B',
    marginLeft: 4,
  },
  imperialDisplayCol: {
    alignItems: 'center',
  },
  secondaryCmHint: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#64748B',
    marginTop: -2,
  },

  // Stadiometer Section
  stadiometerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulerFrame: {
    width: 220,
    height: 210,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 0,
    shadowOpacity: 0,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'grab',
          userSelect: 'none',
        } as any)
      : {}),
  },

  // Center Coral Needle (#F47551)
  centerNeedleContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -1.5,
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
    borderLeftColor: '#F47551',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 39,
  },
  centerNeedleLine: {
    width: 50,
    height: 3,
    backgroundColor: '#F47551',
    borderRadius: 1.5,
  },

  ticksTape: {
    alignItems: 'center',
    width: '100%',
  },
  tickSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    width: 110,
  },
  tickSlotPressed: {
    opacity: 0.6,
  },
  tickLineSlot: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 16,
  },
  tickLineBase: {
    height: 2,
    borderRadius: 1,
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
    opacity: 0, // Covered cleanly by stationary center needle
  },
  tickLabel: {
    fontSize: 13,
    lineHeight: 18,
    width: 48,
  },
  tickLabelDefault: {
    fontFamily: Fonts.urbanist.medium,
    color: '#64748B',
  },
  tickLabelCenter: {
    color: '#F47551', // Calorify Coral!
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
  },
  tickLabelSpacer: {
    height: 18,
    width: 48,
  },

  // Ruler Top/Bottom Fade Gradients
  rulerFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 5,
    pointerEvents: 'none',
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(to bottom, #F8FAFC 0%, rgba(248, 250, 252, 0) 100%)',
        } as any)
      : {
          backgroundColor: '#F8FAFC',
          opacity: 0.85,
        }),
  },
  rulerFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 5,
    pointerEvents: 'none',
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(to top, #F8FAFC 0%, rgba(248, 250, 252, 0) 100%)',
        } as any)
      : {
          backgroundColor: '#F8FAFC',
          opacity: 0.85,
        }),
  },

  // Frame 9: Continue CTA & Footer Links (matches Weight & Age 1:1)
  footerContainer: {
    alignItems: 'center',
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
