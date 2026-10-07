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
        {/* Left: Back Button */}
        <View style={styles.leftContainer}>
          {onBack ? (
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed ? styles.btnPressedSubtle : null]}
              onPress={onBack}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={backAccessibilityLabel}
              testID={`${testID}-back`}
            >
              <Ionicons name="arrow-back" size={20} color="#1C274C" />
            </Pressable>
          ) : null}
        </View>

        {/* Center: Official Calorify Brand Logo with Flame Badge & Typography (Dead-Centered) */}
        <View style={styles.centerContainer} pointerEvents="box-none">
          <View style={styles.logoRow}>
            <View style={styles.logoIconBadge}>
              <Ionicons name="flame" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>Calorify</Text>
          </View>
        </View>

        {/* Right: Custom Right Element, onSkip CTA, or Legacy Step Indicator */}
        <View style={styles.rightContainer}>
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

      {/* Section Progress Bar */}
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
          <View style={styles.segmentTrackRow}>
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
                  <View
                    style={[
                      styles.segmentFill,
                      { width: progressPct as any },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    zIndex: 10,
  },
  headerBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    position: 'relative',
    width: '100%',
  },
  leftContainer: {
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  btnPressedSubtle: {
    opacity: 0.88,
    backgroundColor: Colors.surfaceContainer,
    transform: [{ scale: 0.985 }],
  },
  centerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  logoText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  rightContainer: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepIndicatorText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skipButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#64748B',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    width: '100%',
  },
  segmentTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  segmentBackground: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
