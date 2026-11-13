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
import { Struggle } from '../services/onboardingDraft';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');

const MAX_PICKS = 3;

interface StrugglesScreenProps {
  onBack?: () => void;
  onContinue: (struggles: Struggle[]) => void;
  onSkip?: () => void;
  initialStruggles?: Struggle[];
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

interface StruggleOption {
  id: Struggle;
  label: string;
  reply: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const STRUGGLE_OPTIONS: StruggleOption[] = [
  {
    id: 'home_cooked',
    label: 'Counting home food',
    reply: "I know dal, roti and sabzi. Snap your plate and I'll estimate it.",
    iconName: 'home-outline',
  },
  {
    id: 'portions',
    label: 'Portion sizes',
    reply: 'No scales needed. A photo is enough for me to estimate portions.',
    iconName: 'pie-chart-outline',
  },
  {
    id: 'eating_out',
    label: 'Eating out',
    reply: "Snap the plate when it arrives and I'll estimate the calories.",
    iconName: 'restaurant-outline',
  },
  {
    id: 'consistency',
    label: 'Staying consistent',
    reply: "I'll remind you around your meal times, gently.",
    iconName: 'calendar-outline',
  },
  {
    id: 'protein',
    label: 'Enough protein',
    reply: "I'll track protein with every meal and suggest easy ways to add more.",
    iconName: 'barbell-outline',
  },
  {
    id: 'late_snacking',
    label: 'Late-night snacking',
    reply: "No guilt here. Log it, and I'll help you leave room for it.",
    iconName: 'moon-outline',
  },
  {
    id: 'not_sure',
    label: 'Not sure where to start',
    reply: "That's okay. We'll start with your first meal, together.",
    iconName: 'compass-outline',
  },
];

/** Pure selection rules; pick order is kept (first pick = main struggle). */
export function toggleStruggleSelection(prev: Struggle[], id: Struggle): Struggle[] {
  if (prev.includes(id)) return prev.filter(s => s !== id);
  if (id === 'not_sure') return ['not_sure'];
  const base = prev.filter(s => s !== 'not_sure');
  if (base.length >= MAX_PICKS) return prev;
  return [...base, id];
}

export const StrugglesScreen: React.FC<StrugglesScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialStruggles = [],
  sectionIndex = 0,
  totalSections = 4,
  sectionProgress = 0.6,
}) => {
  const [selected, setSelected] = useState<Struggle[]>(initialStruggles);
  const [lastAdded, setLastAdded] = useState<Struggle | null>(
    initialStruggles.length > 0 ? initialStruggles[initialStruggles.length - 1] : null
  );
  const reduceMotion = useReducedMotion();
  const reply = useSharedValue(initialStruggles.length > 0 ? 1 : 0);

  const replyStyle = useAnimatedStyle(() => ({
    opacity: reply.value,
    transform: [{ translateY: (1 - reply.value) * 8 }],
  }));

  const full = selected.length >= MAX_PICKS;

  const showReply = (id: Struggle | null) => {
    if (id === lastAdded) return;
    setLastAdded(id);
    if (!id) return;
    if (reduceMotion) {
      reply.value = 1;
      return;
    }
    reply.value = 0;
    reply.value = withTiming(1, {
      duration: MotionDurations.sheet,
      easing: MotionCurves.decelerate,
    });
  };

  const handleToggle = (id: Struggle) => {
    const next = toggleStruggleSelection(selected, id);
    if (next === selected) return;
    haptics.selection();
    setSelected(next);
    const added = next.includes(id);
    // On removal fall back to the newest remaining pick (or hide when empty).
    showReply(added ? id : (next[next.length - 1] ?? null));
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    haptics.selection();
    onContinue(selected);
  };

  const shownOption = STRUGGLE_OPTIONS.find(o => o.id === lastAdded);
  const canContinue = selected.length > 0;

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
            What makes tracking hard for you?
          </Text>
          <Text style={styles.subtitle}>Pick up to 3. Ria will help with these first.</Text>

          <View style={styles.counterRow}>
            <View style={styles.segments}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[styles.segment, i < selected.length && styles.segmentFilled]}
                />
              ))}
            </View>
            <Text
              style={styles.counterText}
              accessibilityLiveRegion="polite"
              testID="struggles-counter"
            >
              {selected.length} of 3 picked
            </Text>
          </View>

          <View style={styles.chips}>
            {STRUGGLE_OPTIONS.map(option => {
              const isSelected = selected.includes(option.id);
              const locked = full && !isSelected;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleToggle(option.id)}
                  disabled={locked}
                  style={({ pressed }) => [
                    styles.chip,
                    isSelected && styles.chipSelected,
                    locked && styles.locked,
                    pressed && styles.chipPressed,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled: locked }}
                  accessibilityLabel={option.label}
                  testID={`struggle-chip-${option.id}`}
                >
                  {isSelected ? (
                    <Ionicons name="checkmark" size={16} color={Colors.primaryDeep} />
                  ) : (
                    <Ionicons name={option.iconName} size={18} color={Colors.textPrimary} />
                  )}
                  <Text
                    style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {shownOption ? (
            <Animated.View style={[styles.replyRow, replyStyle]}>
              <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
              <View
                style={styles.bubble}
                accessibilityLiveRegion="polite"
                testID="struggles-ria-reply"
              >
                <Text style={styles.bubbleText}>{shownOption.reply}</Text>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !canContinue }}
            testID="struggles-continue-button"
          >
            <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]}>
              Continue
            </Text>
            {canContinue ? (
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
  counterRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    width: 18,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderInset,
  },
  segmentFilled: {
    backgroundColor: Colors.primary,
  },
  counterText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13.5,
    color: Colors.textMuted,
  },
  chips: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: ControlRadii.pill,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  chipSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingLeft: 11.5,
    paddingRight: 13.5,
  },
  chipPressed: {
    opacity: 0.85,
  },
  locked: {
    opacity: 0.4,
  },
  chipLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  chipLabelSelected: {
    color: Colors.primaryDeep,
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
