import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput } from 'react-native';
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
import { INITIAL_FOOD_DATABASE } from '@/data/foodDatabase';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { FirstMealDemo } from '../components/FirstMealDemo';
import { FoodStyle, PendingMeal } from '../services/onboardingDraft';
import { getStarterFoods, guessMealSlotFromTime, StarterFoodItem } from '../data/starterFoods';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');
const NBSP = '\u00A0';

export interface FirstMealWinScreenProps {
  name?: string;
  foodStyle?: FoodStyle;
  dailyCalorieBudget: number;
  onBack: () => void;
  onContinue: (meal: PendingMeal) => void;
  onSkip: () => void;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

type MealSlot = PendingMeal['mealSlot'];
type ScreenViewMode = 'select' | 'review' | 'logged';

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];
const PORTIONS = [0.5, 1, 1.5, 2];
const PORTION_GLYPH: Record<number, string> = { 0.5: '½', 1: '1', 1.5: '1½', 2: '2' };

// 'katori (150g)' -> ['katori', ' (150g)']: only the unit word changes for plurals and chip captions
const splitUnit = (unit: string): [string, string] => {
  const i = unit.indexOf(' (');
  return i < 0 ? [unit, ''] : [unit.slice(0, i), unit.slice(i)];
};
const pluralWord = (w: string) =>
  /^(tbsp|tsp|g|ml)$/.test(w) ? w : /(s|sh|ch|x)$/.test(w) ? `${w}es` : `${w}s`;
const plural = (unit: string) => {
  const [head, rest] = splitUnit(unit);
  return `${pluralWord(head)}${rest}`;
};

export function portionWords(multiplier: number, unit: string): string {
  if (multiplier === 0.5) return `half a ${unit}`;
  return `${PORTION_GLYPH[multiplier] ?? multiplier} ${multiplier === 1 ? unit : plural(unit)}`;
}

/** Short caption under a portion chip: half, plate, plates. */
export function portionCaption(multiplier: number, unit: string): string {
  if (multiplier === 0.5) return 'half';
  const [head] = splitUnit(unit);
  return multiplier === 1 ? head : pluralWord(head);
}

/** Scales a macro to a portion, to one decimal. */
export function scaleAmount(base: number, multiplier: number): number {
  return Math.round(base * multiplier * 10) / 10;
}

export function formatClock(now: Date): string {
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

export function slotRiaLine(now: Date, defaultSlot: MealSlot, slot: MealSlot): string {
  return slot !== defaultSlot
    ? `Got it, ${slot}.`
    : `It’s ${formatClock(now)}, so I’ve put this under ${slot}. Tap another meal if it wasn’t.`;
}

export function loggedSummary(kcal: number, budget: number) {
  const safeBudget = budget > 0 ? budget : 0;
  const pct = safeBudget ? Math.round((kcal / safeBudget) * 100) : 0;
  return {
    pct,
    barFraction: Math.min(1, Math.max(0, safeBudget ? kcal / safeBudget : 0)),
    left: Math.max(0, safeBudget - kcal),
    over: Math.max(0, kcal - safeBudget),
  };
}

const toStarter = (item: (typeof INITIAL_FOOD_DATABASE)[number]): StarterFoodItem => ({
  id: item.id,
  name: item.name,
  icon: item.icon || '🍽️',
  calories: item.calories,
  proteinG: item.protein,
  carbsG: item.carbs,
  fatG: item.fat,
  servingUnit: item.servingUnit || 'serving',
});

const fmt = (n: number) => n.toLocaleString('en-US');

const FoodRow: React.FC<{
  food: StarterFoodItem;
  selected?: boolean;
  radio?: boolean;
  onPress: () => void;
  testID: string;
}> = ({ food, selected = false, radio = true, onPress, testID }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}
    accessibilityRole={radio ? 'radio' : 'button'}
    accessibilityState={radio ? { selected, checked: selected } : undefined}
    accessibilityLabel={`${food.name}, ${food.calories} calories`}
    testID={testID}
  >
    <View style={styles.rowIcon}>
      <Text style={styles.rowEmoji}>{food.icon || '🍽️'}</Text>
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowName} numberOfLines={2} maxFontSizeMultiplier={1.3}>
        {food.name}
      </Text>
      <Text style={styles.rowSub} maxFontSizeMultiplier={1.3}>
        {`1 ${food.servingUnit}`}
      </Text>
    </View>
    <Text style={styles.rowKcal} maxFontSizeMultiplier={1.3}>
      {`${food.calories}${NBSP}kcal`}
    </Text>
  </Pressable>
);

const RiaBubble: React.FC<{ text: string; testID?: string }> = ({ text, testID }) => (
  <View style={styles.replyRow}>
    <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
    <View style={styles.bubble} testID={testID}>
      <Text style={styles.bubbleText}>{text}</Text>
    </View>
  </View>
);

export const FirstMealWinScreen: React.FC<FirstMealWinScreenProps> = ({
  name,
  foodStyle,
  dailyCalorieBudget,
  onBack,
  onContinue,
  onSkip,
  sectionIndex = 3,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const reduceMotion = useReducedMotion();
  const displayName = name?.trim();
  const [viewMode, setViewMode] = useState<ScreenViewMode>('select');
  const [openedAt] = useState(() => new Date());
  const defaultSlot = useMemo(() => guessMealSlotFromTime(openedAt), [openedAt]);
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultSlot);
  const [selectedFood, setSelectedFood] = useState<StarterFoodItem | null>(null);
  const [portion, setPortion] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const starterFoods = useMemo(() => getStarterFoods(foodStyle), [foodStyle]);
  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query.length < 2) return [];
    return INITIAL_FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(query)).slice(0, 8);
  }, [searchQuery]);

  const meal = useMemo(() => {
    const f = selectedFood;
    return {
      kcal: Math.round((f?.calories ?? 0) * portion),
      protein: scaleAmount(f?.proteinG ?? 0, portion),
      carbs: scaleAmount(f?.carbsG ?? 0, portion),
      fat: scaleAmount(f?.fatG ?? 0, portion),
    };
  }, [selectedFood, portion]);
  const summary = loggedSummary(meal.kcal, dailyCalorieBudget);

  const barFill = useSharedValue(0);
  useEffect(() => {
    if (viewMode !== 'logged') return;
    barFill.set(
      reduceMotion
        ? summary.barFraction
        : withTiming(summary.barFraction, {
            duration: MotionDurations.sheet * 3,
            easing: MotionCurves.easeOut,
          })
    );
  }, [viewMode, summary.barFraction, reduceMotion, barFill]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barFill.get() * 100}%` }));

  const selectFood = (food: StarterFoodItem) => {
    haptics.selection();
    setSelectedFood(food);
    setSearchQuery('');
  };

  const goBack = () => {
    if (viewMode === 'logged') setViewMode('review');
    else if (viewMode === 'review') setViewMode('select');
    else onBack();
  };

  const handlePrimary = () => {
    if (viewMode === 'select') {
      if (!selectedFood) return;
      haptics.selection();
      setPortion(1);
      setViewMode('review');
    } else if (viewMode === 'review') {
      haptics.success();
      setViewMode('logged');
    } else if (selectedFood) {
      onContinue({
        foodName: selectedFood.name,
        calories: meal.kcal,
        proteinG: meal.protein,
        carbsG: meal.carbs,
        fatG: meal.fat,
        portionMultiplier: portion,
        mealSlot,
        loggedAt: Date.now(),
      });
    }
  };

  const slotLabel = SLOTS.find(s => s.id === mealSlot)?.label ?? 'Lunch';
  const unit = selectedFood?.servingUnit ?? 'serving';
  const primary =
    viewMode === 'select'
      ? { label: 'Continue', testID: 'btn-first-meal-continue', disabled: !selectedFood }
      : viewMode === 'review'
        ? { label: 'Log this meal', testID: 'btn-log-meal', disabled: false }
        : { label: 'Save my plan', testID: 'btn-save-plan', disabled: false };

  const macros = [
    { label: 'Protein', value: meal.protein, color: Colors.protein },
    { label: 'Carbs', value: meal.carbs, color: Colors.carbs },
    { label: 'Fat', value: meal.fat, color: Colors.fat },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        <OnboardingHeader
          onBack={goBack}
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          sectionProgress={sectionProgress}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {viewMode === 'select' && (
            <>
              <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                {displayName
                  ? `Here’s how logging works, ${displayName}`
                  : 'Here’s how logging works'}
              </Text>
              <FirstMealDemo />

              <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
                NOW LOG YOUR LAST MEAL
              </Text>
              <View style={styles.search}>
                <Ionicons name="search" size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search foods, like dal or idli"
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  accessibilityLabel="Search foods"
                  maxFontSizeMultiplier={1.3}
                  testID="search-food-input"
                />
              </View>

              {searchResults.map(item => {
                const food = toStarter(item);
                return (
                  <FoodRow
                    key={item.id}
                    radio={false}
                    food={food}
                    onPress={() => selectFood(food)}
                    testID={`search-result-${item.id}`}
                  />
                );
              })}

              <View accessibilityRole="radiogroup">
                {selectedFood && !starterFoods.some(f => f.id === selectedFood.id) ? (
                  <FoodRow
                    food={selectedFood}
                    selected
                    onPress={() => selectFood(selectedFood)}
                    testID={`starter-row-${selectedFood.id}`}
                  />
                ) : null}
                {starterFoods.map(food => (
                  <FoodRow
                    key={food.id}
                    food={food}
                    selected={selectedFood?.id === food.id}
                    onPress={() => selectFood(food)}
                    testID={`starter-row-${food.id}`}
                  />
                ))}
              </View>
            </>
          )}

          {viewMode === 'review' && selectedFood && (
            <>
              <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                How much did you have?
              </Text>

              <View style={styles.mealCard} testID="meal-card">
                <View style={styles.mealHead}>
                  <View style={styles.rowIcon}>
                    <Text style={styles.rowEmoji}>{selectedFood.icon || '🍽️'}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.mealName} maxFontSizeMultiplier={1.3}>
                      {selectedFood.name}
                    </Text>
                    <Text style={styles.rowSub} maxFontSizeMultiplier={1.3}>
                      {`${slotLabel} · ${selectedFood.calories} kcal a ${unit}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.kcalRow}>
                  <Text style={styles.kcalNumber} maxFontSizeMultiplier={1.2} testID="meal-kcal">
                    {meal.kcal}
                  </Text>
                  <Text style={styles.kcalUnit} maxFontSizeMultiplier={1.3}>
                    kcal
                  </Text>
                </View>
                <View style={styles.macroCols}>
                  {macros.map(m => (
                    <View key={m.label} style={styles.macroCol}>
                      <Text style={styles.macroValue} maxFontSizeMultiplier={1.3}>
                        {`${m.value}${NBSP}g`}
                      </Text>
                      <View style={styles.macroLabelRow}>
                        <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                        <Text style={styles.macroLabel} maxFontSizeMultiplier={1.3}>
                          {m.label}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
                PORTION
              </Text>
              <View style={styles.chipsRow} accessibilityRole="radiogroup">
                {PORTIONS.map(m => {
                  const selected = portion === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        haptics.selection();
                        setPortion(m);
                      }}
                      style={({ pressed }) => [
                        styles.portionChip,
                        selected && styles.chipSelected,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, checked: selected }}
                      accessibilityLabel={portionWords(m, unit)}
                      testID={`portion-${m}`}
                    >
                      <Text
                        style={[styles.portionGlyph, selected && styles.chipTextSelected]}
                        maxFontSizeMultiplier={1.3}
                      >
                        {PORTION_GLYPH[m]}
                      </Text>
                      <Text style={styles.portionCaption} maxFontSizeMultiplier={1.3}>
                        {portionCaption(m, unit)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
                MEAL
              </Text>
              <View style={styles.chipsRow} accessibilityRole="radiogroup">
                {SLOTS.map(s => {
                  const selected = mealSlot === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        haptics.selection();
                        setMealSlot(s.id);
                      }}
                      style={({ pressed }) => [
                        styles.slotChip,
                        selected && styles.chipSelected,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, checked: selected }}
                      accessibilityLabel={s.label}
                      testID={`slot-${s.id}`}
                    >
                      <Text
                        style={[styles.slotText, selected && styles.chipTextSelected]}
                        maxFontSizeMultiplier={1.3}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <RiaBubble
                text={slotRiaLine(openedAt, defaultSlot, mealSlot)}
                testID="ria-slot-line"
              />
            </>
          )}

          {viewMode === 'logged' && selectedFood && (
            <>
              <View style={styles.doneRow}>
                <View style={styles.tick}>
                  <Ionicons name="checkmark" size={18} color={Colors.textInverse} />
                </View>
                <Text
                  style={[styles.question, styles.doneTitle]}
                  accessibilityRole="header"
                  maxFontSizeMultiplier={1.3}
                >
                  {displayName ? `Logged, ${displayName}` : 'Logged'}
                </Text>
              </View>
              <Text style={styles.sub} maxFontSizeMultiplier={1.3} testID="logged-sub">
                {`${selectedFood.name}, ${portionWords(portion, unit)}, for ${mealSlot}.`}
              </Text>

              <View
                style={styles.dayCard}
                accessible
                accessibilityLabel={
                  summary.over > 0
                    ? `Today: ${fmt(meal.kcal)} of ${fmt(dailyCalorieBudget)} calories, ${fmt(summary.over)} over`
                    : `Today: ${fmt(meal.kcal)} of ${fmt(dailyCalorieBudget)} calories, ${fmt(summary.left)} left`
                }
                testID="logged-day-card"
              >
                <Text style={styles.sectionLabelInline} maxFontSizeMultiplier={1.3}>
                  TODAY
                </Text>
                <View style={styles.dayTrack}>
                  <Animated.View style={[styles.dayFill, barStyle]} />
                </View>
                <View style={styles.dayLine}>
                  <Text style={styles.dayText} maxFontSizeMultiplier={1.3}>
                    <Text style={styles.dayStrong}>{fmt(meal.kcal)}</Text>
                    {` of ${fmt(dailyCalorieBudget)} kcal`}
                  </Text>
                  <Text style={styles.dayText} maxFontSizeMultiplier={1.3}>
                    <Text style={styles.dayStrong}>
                      {fmt(summary.over > 0 ? summary.over : summary.left)}
                    </Text>
                    {summary.over > 0 ? ' over' : ' left'}
                  </Text>
                </View>
              </View>

              <View style={styles.streakPill}>
                <Ionicons name="flame" size={14} color={Colors.primaryDeep} />
                <Text style={styles.streakText} maxFontSizeMultiplier={1.3}>
                  Day 1 of your streak
                </Text>
              </View>

              <RiaBubble
                text={`That’s ${summary.pct}% of your day. Log the next meal on Today and I’ll keep the count.`}
                testID="ria-logged-line"
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handlePrimary}
            disabled={primary.disabled}
            style={({ pressed }) => [
              styles.primaryButton,
              primary.disabled && styles.primaryButtonDisabled,
              pressed && !primary.disabled && styles.primaryButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={primary.label}
            accessibilityState={{ disabled: primary.disabled }}
            testID={primary.testID}
          >
            <Text style={styles.primaryText}>{primary.label}</Text>
          </Pressable>
          {viewMode === 'select' && (
            <Pressable
              onPress={onSkip}
              style={styles.skipButton}
              accessibilityRole="button"
              accessibilityLabel="I’ll log later"
              testID="btn-skip-first-meal"
            >
              <Text style={styles.skipText}>I’ll log later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const cardBase = {
  backgroundColor: Colors.card,
  borderWidth: 1,
  borderColor: Colors.borderSubtle,
  borderRadius: 10,
  borderCurve: 'continuous',
  elevation: 0,
} as const;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 22, paddingBottom: 20 },
  question: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  sub: {
    marginTop: 6,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 6,
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.6,
    color: Colors.textSecondary,
  },
  sectionLabelInline: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 12.5,
    letterSpacing: 0.6,
    color: Colors.textSecondary,
  },
  search: {
    ...cardBase,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  row: {
    ...cardBase,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  rowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  pressed: { opacity: 0.9 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmoji: { fontSize: 18 },
  rowText: { flex: 1 },
  rowName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  rowKcal: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  mealCard: { ...cardBase, marginTop: 16, padding: 14 },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealName: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12 },
  kcalNumber: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    color: Colors.textPrimary,
  },
  kcalUnit: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  macroCols: { flexDirection: 'row', marginTop: 10 },
  macroCol: { flex: 1 },
  macroValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  macroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  chipsRow: { flexDirection: 'row', gap: 6 },
  portionChip: {
    ...cardBase,
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  slotChip: {
    ...cardBase,
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  portionGlyph: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  portionCaption: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  slotText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  chipTextSelected: { color: Colors.primaryDeep },
  replyRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
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
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doneTitle: { flex: 1 },
  tick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  dayCard: { ...cardBase, marginTop: 16, padding: 14 },
  dayTrack: {
    height: 10,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
  },
  dayFill: { height: '100%', borderRadius: 5, backgroundColor: Colors.primary },
  dayLine: { flexDirection: 'row', justifyContent: 'space-between' },
  dayText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dayStrong: { color: Colors.textPrimary },
  streakPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },
  streakText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13.5,
    color: Colors.primaryDeep,
  },
  footer: { paddingTop: 12, paddingBottom: 16 },
  primaryButton: {
    height: ControlHeights.button + 4,
    borderRadius: ControlRadii.button,
    borderCurve: 'continuous',
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  primaryText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textInverse,
  },
  skipButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  skipText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14.5,
    color: Colors.textSecondary,
  },
});
