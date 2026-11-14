import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { MotionCurves, MotionDurations } from '@/theme/motion';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { ActivityLevel, STEP_GOALS } from '../services/onboardingCalculator';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');

interface ActivityLevelScreenProps {
  onBack?: () => void;
  onContinue: (activityLevel: ActivityLevel) => void;
  onSkip?: () => void;
  initialActivityLevel?: ActivityLevel;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

interface ActivityOption {
  id: ActivityLevel;
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'sedentary',
    title: 'Mostly sitting',
    subtitle: 'Desk job, little exercise',
    iconName: 'desktop-outline',
  },
  {
    id: 'lightly_active',
    title: 'Lightly active',
    subtitle: 'Walks, 1–3 workouts a week',
    iconName: 'walk-outline',
  },
  {
    id: 'moderately_active',
    title: 'Moderately active',
    subtitle: '3–5 workouts a week',
    iconName: 'pulse-outline',
  },
  {
    id: 'very_active',
    title: 'Very active',
    subtitle: 'Daily training, manual job',
    iconName: 'bicycle-outline',
  },
];

const REPLY_LEAD: Record<ActivityLevel, string> = {
  sedentary: 'No judgement, most desk jobs look like this.',
  lightly_active: 'A good base to build on.',
  moderately_active: 'Solid routine.',
  very_active: 'I’ll make sure you eat enough to fuel that.',
};

export const activityReply = (level: ActivityLevel): string =>
  `${REPLY_LEAD[level]} Your step goal starts at ${STEP_GOALS[level].toLocaleString('en-US')}.`;

export const ActivityLevelScreen: React.FC<ActivityLevelScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialActivityLevel,
  sectionIndex = 1,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<ActivityLevel | null>(
    initialActivityLevel ?? null
  );
  const reduceMotion = useReducedMotion();
  const reply = useSharedValue(initialActivityLevel ? 1 : 0);

  const replyStyle = useAnimatedStyle(() => ({
    opacity: reply.value,
    transform: [{ translateY: (1 - reply.value) * 8 }],
  }));

  const handleSelectOption = (option: ActivityOption) => {
    haptics.selection();
    if (option.id === selectedLevel) return;
    setSelectedLevel(option.id);
    if (reduceMotion) {
      reply.set(1);
      return;
    }
    reply.set(0);
    reply.set(
      withTiming(1, {
        duration: MotionDurations.sheet,
        easing: MotionCurves.decelerate,
      })
    );
  };

  const handleContinue = () => {
    if (!selectedLevel) return;
    haptics.selection();
    onContinue(selectedLevel);
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
            How active is a normal week?
          </Text>
          <Text style={styles.subtitle}>
            Count your job and workouts together. Pick the closest.
          </Text>

          <View style={styles.list} accessibilityRole="radiogroup">
            {ACTIVITY_OPTIONS.map(option => {
              const selected = selectedLevel === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelectOption(option)}
                  style={({ pressed }) => [
                    styles.card,
                    selected && styles.cardSelected,
                    pressed && styles.cardPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={`${option.title}, ${option.subtitle}`}
                  testID={`activity-card-${option.id}`}
                >
                  <View style={[styles.iconTile, selected && styles.iconTileSelected]}>
                    <Ionicons
                      name={option.iconName}
                      size={22}
                      color={selected ? Colors.primaryDeep : Colors.textPrimary}
                    />
                  </View>

                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
                      {option.title}
                    </Text>
                    <Text style={styles.cardSubtitle} maxFontSizeMultiplier={1.3}>
                      {option.subtitle}
                    </Text>
                  </View>

                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color={Colors.textInverse} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {selectedLevel ? (
            <Animated.View style={[styles.replyRow, replyStyle]}>
              <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
              <View
                style={styles.bubble}
                accessibilityLiveRegion="polite"
                testID="activity-ria-reply"
              >
                <Text style={styles.bubbleText}>{activityReply(selectedLevel)}</Text>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={!selectedLevel}
            style={({ pressed }) => [
              styles.continueButton,
              !selectedLevel && styles.continueButtonDisabled,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !selectedLevel }}
            testID="activity-continue-button"
          >
            <Text style={[styles.continueText, !selectedLevel && styles.continueTextDisabled]}>
              Continue
            </Text>
            {selectedLevel ? (
              <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
            ) : null}
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
  list: {
    marginTop: 22,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    borderCurve: 'continuous',
    elevation: 0,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12.5,
    paddingHorizontal: 13.5,
  },
  cardPressed: {
    opacity: 0.95,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.borderLight,
  },
  iconTileSelected: {
    backgroundColor: Colors.primaryLight,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16.5,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13.5,
    color: Colors.textMuted,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  replyRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  bubble: {
    flexShrink: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
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
  continueButtonDisabled: {
    backgroundColor: Colors.borderInset,
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
  continueTextDisabled: {
    color: Colors.textMuted,
  },
});
