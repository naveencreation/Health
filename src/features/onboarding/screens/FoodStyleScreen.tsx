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
import { FoodStyle } from '../services/onboardingDraft';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');

export interface FoodStyleData {
  foodStyle: FoodStyle;
  mealTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  skipsBreakfast: boolean;
  snacks: boolean;
}

interface FoodStyleScreenProps {
  onBack?: () => void;
  onContinue: (data: FoodStyleData) => void;
  onSkip?: () => void;
  initialFoodStyle?: FoodStyle;
  initialMealTimes?: { breakfast: string; lunch: string; dinner: string };
  initialSkipsBreakfast?: boolean;
  initialSnacks?: boolean;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

interface DietOption {
  id: FoodStyle;
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const DIET_OPTIONS: DietOption[] = [
  {
    id: 'vegetarian',
    title: 'Vegetarian',
    subtitle: 'No meat, fish or eggs',
    iconName: 'leaf-outline',
  },
  {
    id: 'eggetarian',
    title: 'Eggetarian',
    subtitle: 'Vegetarian + eggs',
    iconName: 'egg-outline',
  },
  {
    id: 'non_veg',
    title: 'Non-veg',
    subtitle: 'Meat, fish and eggs',
    iconName: 'restaurant-outline',
  },
  {
    id: 'vegan',
    title: 'Vegan',
    subtitle: 'No animal products',
    iconName: 'nutrition-outline',
  },
  {
    id: 'no_preference',
    title: 'No preference',
    subtitle: 'A bit of everything',
    iconName: 'sparkles-outline',
  },
];

const BREAKFAST_OPTIONS = [
  { skips: false, label: 'Yes, most days', testID: 'breakfast-option-yes' },
  { skips: true, label: 'Usually skip', testID: 'breakfast-option-skip' },
];

const REPLY_LEAD: Record<FoodStyle, string> = {
  vegetarian: 'Dal, paneer, curd and chana will carry most of your protein.',
  eggetarian: 'Eggs make protein easy: two give you about 12\u00A0g.',
  non_veg: 'Chicken, fish and eggs give you plenty of easy protein.',
  vegan: 'Dal, tofu, soy and peanuts will carry your protein.',
  no_preference: 'Got it, you’ll see a mix of everything.',
};

export const foodStyleReply = (style: FoodStyle, skipsBreakfast: boolean | null): string =>
  skipsBreakfast === true ? `${REPLY_LEAD[style]} No breakfast reminder, then.` : REPLY_LEAD[style];

export const FoodStyleScreen: React.FC<FoodStyleScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialFoodStyle,
  initialMealTimes = { breakfast: '08:30', lunch: '13:00', dinner: '20:00' },
  initialSkipsBreakfast,
  initialSnacks = true,
  sectionIndex = 2,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<FoodStyle | null>(initialFoodStyle ?? null);
  const [skipsBreakfast, setSkipsBreakfast] = useState<boolean | null>(
    initialSkipsBreakfast ?? null
  );
  const reduceMotion = useReducedMotion();
  const reply = useSharedValue(initialFoodStyle ? 1 : 0);

  const replyStyle = useAnimatedStyle(() => ({
    opacity: reply.value,
    transform: [{ translateY: (1 - reply.value) * 8 }],
  }));

  const ready = selectedStyle !== null && skipsBreakfast !== null;

  const handleSelectDiet = (id: FoodStyle) => {
    haptics.selection();
    if (id === selectedStyle) return;
    setSelectedStyle(id);
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

  const handleSelectBreakfast = (skips: boolean) => {
    haptics.selection();
    setSkipsBreakfast(skips);
  };

  const handleContinue = () => {
    if (selectedStyle === null || skipsBreakfast === null) return;
    haptics.selection();
    onContinue({
      foodStyle: selectedStyle,
      mealTimes: initialMealTimes,
      skipsBreakfast,
      snacks: initialSnacks,
    });
  };

  const renderTile = (option: DietOption, wide: boolean) => {
    const selected = selectedStyle === option.id;
    return (
      <Pressable
        key={option.id}
        onPress={() => handleSelectDiet(option.id)}
        style={({ pressed }) => [
          styles.tile,
          wide ? styles.tileWide : styles.tileHalf,
          selected && (wide ? styles.tileWideSelected : styles.tileSelected),
          pressed && styles.tilePressed,
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected, checked: selected }}
        accessibilityLabel={`${option.title}, ${option.subtitle}`}
        testID={`diet-tile-${option.id}`}
      >
        <View style={[styles.iconTile, selected && styles.iconTileSelected]}>
          <Ionicons
            name={option.iconName}
            size={17}
            color={selected ? Colors.primaryDeep : Colors.textPrimary}
          />
        </View>
        <View style={wide ? styles.tileTextWide : undefined}>
          <Text style={styles.tileTitle} maxFontSizeMultiplier={1.3} numberOfLines={1}>
            {option.title}
          </Text>
          <Text style={styles.tileSubtitle} maxFontSizeMultiplier={1.3} numberOfLines={1}>
            {option.subtitle}
          </Text>
        </View>
        {selected ? (
          <View style={wide ? styles.checkWide : styles.check}>
            <Ionicons name="checkmark" size={11} color={Colors.textInverse} />
          </View>
        ) : null}
      </Pressable>
    );
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
            What’s on your plate?
          </Text>
          <Text style={styles.subtitle}>I’ll use it to suggest your first meal.</Text>

          <View style={styles.grid} accessibilityRole="radiogroup">
            {DIET_OPTIONS.map(option => renderTile(option, option.id === 'no_preference'))}
          </View>

          <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
            Do you eat breakfast?
          </Text>
          <View style={styles.segmentTrack} accessibilityRole="radiogroup">
            {BREAKFAST_OPTIONS.map(opt => {
              const checked = skipsBreakfast === opt.skips;
              return (
                <Pressable
                  key={opt.testID}
                  onPress={() => handleSelectBreakfast(opt.skips)}
                  hitSlop={{ top: 2, bottom: 2 }}
                  style={[styles.segment, checked && styles.segmentSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked, selected: checked }}
                  accessibilityLabel={opt.label}
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

          {selectedStyle ? (
            <Animated.View style={[styles.replyRow, replyStyle]}>
              <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
              <View
                style={styles.bubble}
                accessibilityLiveRegion="polite"
                testID="food-style-ria-reply"
              >
                <Text style={styles.bubbleText}>
                  {foodStyleReply(selectedStyle, skipsBreakfast)}
                </Text>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={!ready}
            style={({ pressed }) => [
              styles.continueButton,
              !ready && styles.continueButtonDisabled,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !ready }}
            testID="food-style-continue-button"
          >
            <Text style={[styles.continueText, !ready && styles.continueTextDisabled]}>
              Continue
            </Text>
            {ready ? <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} /> : null}
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
  grid: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    minHeight: 70,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    borderCurve: 'continuous',
    elevation: 0,
  },
  tileHalf: {
    flexGrow: 1,
    flexBasis: '47%',
    justifyContent: 'space-between',
    gap: 8,
  },
  tileWide: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tileSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10.5,
    paddingHorizontal: 11.5,
  },
  tileWideSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10.5,
    paddingHorizontal: 11.5,
  },
  tilePressed: {
    opacity: 0.95,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.borderLight,
  },
  iconTileSelected: {
    backgroundColor: Colors.primaryLight,
  },
  tileTextWide: {
    flex: 1,
  },
  tileTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 15.5,
    color: Colors.textPrimary,
  },
  tileSubtitle: {
    marginTop: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  checkWide: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 16.5,
    color: Colors.textPrimary,
  },
  segmentTrack: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceInset,
  },
  segment: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'transparent',
    elevation: 0,
  },
  segmentSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  segmentText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textMuted,
  },
  segmentTextSelected: {
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
