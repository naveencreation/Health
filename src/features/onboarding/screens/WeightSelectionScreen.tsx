import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { WheelPicker } from '../components/WheelPicker';
import { LBS_PER_KG } from '../services/goalsForm';

export type WeightUnit = 'kg' | 'lbs';

interface WeightSelectionScreenProps {
  onBack?: () => void;
  /** Always receives kilograms; `unit` is only the display preference. */
  onContinue?: (weightKg: number, unit: WeightUnit) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialWeightKg?: number;
  initialUnit?: WeightUnit;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const RANGE = { kg: { min: 30, max: 200 }, lbs: { min: 66, max: 440 } } as const;

const clampTenths = (tenths: number, unit: WeightUnit) =>
  Math.min(RANGE[unit].max * 10, Math.max(RANGE[unit].min * 10, tenths));

/** Weight in tenths of the given display unit (integer, avoids float drift). */
export const toTenths = (kg: number, unit: WeightUnit) =>
  clampTenths(Math.round(kg * (unit === 'kg' ? 1 : LBS_PER_KG) * 10), unit);

/** Kilograms rounded to 0.1, clamped to 30-200. */
export const tenthsToKg = (tenths: number, unit: WeightUnit) => {
  const kgTenths = Math.round(unit === 'kg' ? tenths : tenths / LBS_PER_KG);
  return Math.min(2000, Math.max(300, kgTenths)) / 10;
};

const UNIT_OPTIONS: { id: WeightUnit; label: string; testID: string }[] = [
  { id: 'kg', label: 'kg', testID: 'weight-unit-kg' },
  { id: 'lbs', label: 'lb', testID: 'weight-unit-lbs' },
];

export const WeightSelectionScreen: React.FC<WeightSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialWeightKg = 68,
  initialUnit = 'kg',
  sectionIndex = 1,
  totalSections = 4,
  sectionProgress = 0.5,
}) => {
  const [unit, setUnit] = useState<WeightUnit>(initialUnit);
  const [tenths, setTenths] = useState<number>(toTenths(initialWeightKg, initialUnit));

  const whole = Math.floor(tenths / 10);
  const dec = tenths % 10;
  const kg = tenthsToKg(tenths, unit);

  const pickUnit = (next: WeightUnit) => {
    if (next === unit) return;
    haptics.selection();
    setTenths(toTenths(kg, next));
    setUnit(next);
  };

  const handleContinue = () => {
    haptics.selection();
    onContinue?.(kg, unit);
  };

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
          <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            What do you weigh today?
          </Text>
          <Text style={styles.subtitle}>Just a starting point. You can update it anytime.</Text>

          <View style={styles.segmentTrack} accessibilityRole="radiogroup">
            {UNIT_OPTIONS.map(opt => {
              const checked = unit === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => pickUnit(opt.id)}
                  hitSlop={{ top: 2, bottom: 2 }}
                  style={[styles.segment, checked && styles.segmentSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked, selected: checked }}
                  accessibilityLabel={opt.id === 'kg' ? 'Kilograms' : 'Pounds'}
                  testID={opt.testID}
                >
                  <Text
                    style={[styles.segmentText, checked && styles.segmentTextSelected]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.wheelRow}>
            <View style={styles.wheelWhole}>
              <WheelPicker
                key={unit}
                min={RANGE[unit].min}
                max={RANGE[unit].max}
                value={whole}
                onChange={w => setTenths(clampTenths(w * 10 + dec, unit))}
                accessibilityLabel={unit === 'kg' ? 'Kilograms' : 'Pounds'}
                testID="weight-wheel-whole"
              />
            </View>
            <Text style={styles.dot}>.</Text>
            <View style={styles.wheelTenths}>
              <WheelPicker
                key={unit}
                min={0}
                max={9}
                value={dec}
                onChange={d => setTenths(clampTenths(whole * 10 + d, unit))}
                unit={unit === 'kg' ? 'kg' : 'lb'}
                accessibilityLabel="Tenths"
                testID="weight-wheel-tenths"
              />
            </View>
          </View>

          <Text style={styles.conversion} testID="weight-conversion">
            {unit === 'kg'
              ? `That’s ${(kg * LBS_PER_KG).toFixed(1)} lb`
              : `That’s ${kg.toFixed(1)} kg`}
          </Text>

          <View style={[styles.noteRow, { marginTop: 14 }]}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.noteText}>Private. Only used for your plan.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            testID="weight-continue-button"
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 22,
    paddingBottom: 20,
  },
  question: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  segmentTrack: {
    marginTop: 22,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceInset,
  },
  segment: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    elevation: 0,
  },
  segmentSelected: {
    backgroundColor: Colors.card,
    borderColor: Colors.borderSubtle,
  },
  segmentText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textMuted,
  },
  segmentTextSelected: {
    color: Colors.textPrimary,
  },
  wheelRow: {
    marginTop: 18,
    flexDirection: 'row',
  },
  wheelWhole: {
    flex: 3,
  },
  wheelTenths: {
    flex: 2,
  },
  dot: {
    width: 14,
    alignSelf: 'center',
    textAlign: 'center',
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 26,
    color: Colors.primaryDeep,
  },
  conversion: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textMuted,
  },
  noteRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noteText: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textMuted,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  continueButton: {
    height: ControlHeights.button + 4,
    borderRadius: ControlRadii.button,
    borderCurve: 'continuous',
    backgroundColor: Colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 0,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  continueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textInverse,
  },
});
