import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

export type OnboardingSectionKey = 'about_you' | 'your_goal' | 'your_lifestyle' | 'your_plan';

export interface OnboardingSectionInfo {
  key: OnboardingSectionKey;
  label: string;
}

export const ONBOARDING_SECTIONS: OnboardingSectionInfo[] = [
  { key: 'about_you', label: 'About you' },
  { key: 'your_goal', label: 'Your goal' },
  { key: 'your_lifestyle', label: 'Your lifestyle' },
  { key: 'your_plan', label: 'Your plan' },
];

export interface OnboardingHeaderProps {
  onBack?: () => void;
  onSkip?: () => void;
  stepText?: string;
  rightElement?: React.ReactNode;
  backAccessibilityLabel?: string;
  testID?: string;
  /**
   * 0-indexed section index (0: About you, 1: Your goal, 2: Your lifestyle, 3: Your plan)
   */
  sectionIndex?: number;
  /**
   * Total number of sections (defaults to 4)
   */
  totalSections?: number;
  /**
   * Optional fractional progress within the active section (0.0 to 1.0)
   */
  sectionProgress?: number;
  /**
   * Whether to display the section progress bar (defaults to true if sectionIndex is provided)
   */
  showProgressBar?: boolean;
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  onBack,
  onSkip,
  stepText,
  rightElement,
  backAccessibilityLabel = 'Go back',
  testID = 'onboarding-header',
  sectionIndex,
  totalSections = 4,
  sectionProgress,
  showProgressBar = sectionIndex !== undefined,
}) => {
  const activeSection =
    sectionIndex !== undefined && sectionIndex >= 0 && sectionIndex < ONBOARDING_SECTIONS.length
      ? ONBOARDING_SECTIONS[sectionIndex]
      : undefined;

  return (
    <View style={styles.wrapper} testID={testID}>
      <View style={styles.headerBar}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed ? styles.btnPressedSubtle : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            testID={`${testID}-back`}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </Pressable>
        ) : null}

        {showProgressBar && sectionIndex !== undefined ? (
          <View
            style={styles.progressContainer}
            accessibilityRole="progressbar"
            accessibilityLabel={
              activeSection
                ? `Section ${sectionIndex + 1} of ${totalSections}: ${activeSection.label}`
                : `Section ${sectionIndex + 1} of ${totalSections}`
            }
            testID={`${testID}-progress`}
          >
            {Array.from({ length: totalSections }).map((_, index) => {
              const isCompleted = index < sectionIndex;
              const isActive = index === sectionIndex;
              const progressPct = isCompleted
                ? '100%'
                : isActive
                  ? `${Math.max(15, Math.min(100, Math.round((sectionProgress ?? 1) * 100)))}%`
                  : '0%';

              return (
                <View
                  key={`progress-segment-${index}`}
                  style={styles.segmentBackground}
                  testID={`${testID}-segment-${index}`}
                >
                  <View style={[styles.segmentFill, { width: progressPct as any }]} />
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.spacer} />
        )}

        {rightElement ? (
          rightElement
        ) : onSkip ? (
          <Pressable
            onPress={onSkip}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Skip this step"
            testID={`${testID}-skip`}
            style={({ pressed }) => [styles.skipButton, pressed ? styles.btnPressedSubtle : null]}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        ) : stepText && !showProgressBar ? (
          <View style={styles.stepBadge}>
            <Text style={styles.stepIndicatorText}>{stepText}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    zIndex: 10,
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  btnPressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  spacer: {
    flex: 1,
  },
  stepBadge: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  stepIndicatorText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  segmentBackground: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderInset,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
});
