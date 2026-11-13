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

export type HeightUnit = 'cm' | 'ft';

interface HeightSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (heightCm: number, unit: HeightUnit) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialHeightCm?: number;
  initialUnit?: HeightUnit;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const MIN_CM = 100;
const MAX_CM = 250;
const MIN_TOTAL_INCHES = 39; // 3 ft 3 in (~100 cm)
const MAX_TOTAL_INCHES = 98; // 8 ft 2 in (~250 cm)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const cmToFtIn = (cm: number) => {
  const totalIn = Math.round(clamp(cm, MIN_CM, MAX_CM) / 2.54);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
};

export const ftInToCm = (ft: number, inch: number) => {
  const totalIn = clamp(ft * 12 + inch, MIN_TOTAL_INCHES, MAX_TOTAL_INCHES);
  return clamp(Math.round(totalIn * 2.54), MIN_CM, MAX_CM);
};

const UNIT_OPTIONS: { id: HeightUnit; label: string; testID: string }[] = [
  { id: 'cm', label: 'cm', testID: 'height-unit-cm' },
  { id: 'ft', label: 'ft · in', testID: 'height-unit-ft' },
];

export const HeightSelectionScreen: React.FC<HeightSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialHeightCm = 170,
  initialUnit = 'cm',
  sectionIndex = 1,
  totalSections = 4,
  sectionProgress = 0.25,
}) => {
  const [heightCm, setHeightCm] = useState<number>(clamp(initialHeightCm, MIN_CM, MAX_CM));
  const [unit, setUnit] = useState<HeightUnit>(initialUnit);

  const { ft, inch } = cmToFtIn(heightCm);

  const pickUnit = (next: HeightUnit) => {
    if (next === unit) return;
    haptics.selection();
    setUnit(next);
  };

  const handleContinue = () => {
    haptics.selection();
    onContinue?.(heightCm, unit);
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
            How tall are you?
          </Text>
          <Text style={styles.subtitle}>
            Taller bodies burn more at rest, so this sharpens your estimate.
          </Text>

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
                  accessibilityLabel={opt.id === 'cm' ? 'Centimetres' : 'Feet and inches'}
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

          <View style={styles.wheelWrap}>
            {unit === 'cm' ? (
              <WheelPicker
                min={MIN_CM}
                max={MAX_CM}
                value={heightCm}
                onChange={setHeightCm}
                unit="cm"
                accessibilityLabel="Height in centimetres"
                testID="height-wheel-cm"
              />
            ) : (
              <View style={styles.wheelRow}>
                <View style={styles.wheelCol}>
                  <WheelPicker
                    min={3}
                    max={8}
                    value={ft}
                    onChange={v => setHeightCm(ftInToCm(v, inch))}
                    unit="ft"
                    accessibilityLabel="Feet"
                    testID="height-wheel-ft"
                  />
                </View>
                <View style={styles.wheelCol}>
                  <WheelPicker
                    min={0}
                    max={11}
                    value={inch}
                    onChange={v => setHeightCm(ftInToCm(ft, v))}
                    unit="in"
                    accessibilityLabel="Inches"
                    testID="height-wheel-in"
                  />
                </View>
              </View>
            )}
          </View>

          <Text style={styles.conversion} testID="height-conversion">
            {unit === 'cm' ? `That’s ${ft} ft ${inch} in` : `That’s ${heightCm} cm`}
          </Text>
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
            testID="height-continue-button"
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
  wheelWrap: {
    marginTop: 18,
  },
  wheelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  wheelCol: {
    flex: 1,
  },
  conversion: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
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
