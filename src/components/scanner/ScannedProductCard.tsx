import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { NormalizedFoodItem, normalizedFoodToFoodItem, servingGrams } from '@/types/barcode';
import { MealType } from '@/types';
import { haptics } from '@/utils/haptics';
import { HeaderIconButton, ProfileButton, SubScreenHeader } from '@/components/profile/ProfileUI';
import { getMealTarget } from '@/features/nutrition/services/nutritionAnalytics';
import {
  LabeledInput,
  MacroSummary,
  MealImpact,
  MealSwitcher,
  PortionStepper,
  SectionLabel,
  foodUiStyles as ui,
  formatQty,
  mealLabel,
} from '@/features/nutrition/components/FoodLogUI';

export interface ScannedProductCardProps {
  product?: NormalizedFoodItem | null;
  error?: string | null;
  scannedCode?: string | null;
  initialMealType?: MealType;
  onAddMeal: (mealType: MealType, product: NormalizedFoodItem, multiplier: number) => void;
  onScanAgain: () => void;
  onEnterManually?: (code: string) => void;
  onClose?: () => void;
  /** Calories already logged per meal today; with `allowance`, shows the meal impact bar. */
  mealCalories?: Record<MealType, number>;
  /** The day's calorie allowance (budget + burned). */
  allowance?: number;
}

const PRESETS = [0.5, 1, 1.5, 2];
const NOT_FOUND = /not found|unavailable/i;

function getDefaultMealType(preferredMeal?: MealType): MealType {
  if (preferredMeal) return preferredMeal;
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11.5) return 'breakfast';
  if (hour >= 11.5 && hour < 15.5) return 'lunch';
  if (hour >= 15.5 && hour < 18.5) return 'snacks';
  return 'dinner';
}

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

export function ScannedProductCard({
  product,
  error,
  scannedCode,
  initialMealType,
  onAddMeal,
  onScanAgain,
  onEnterManually,
  onClose,
  mealCalories,
  allowance,
}: ScannedProductCardProps) {
  const insets = useSafeAreaInsets();
  const [multiplier, setMultiplier] = useState<number>(1);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(() =>
    getDefaultMealType(initialMealType)
  );

  // Values the user typed from the package label (per 100 g)
  const [overrideProduct, setOverrideProduct] = useState<NormalizedFoodItem | null>(null);
  const [isEditingMacros, setIsEditingMacros] = useState(false);
  const [prevProductId, setPrevProductId] = useState<string | undefined>(product?.id);
  const [editCalories, setEditCalories] = useState(() => String(product?.caloriesPer100g ?? ''));
  const [editProtein, setEditProtein] = useState(() => String(product?.proteinGrams ?? ''));
  const [editCarbs, setEditCarbs] = useState(() => String(product?.carbsGrams ?? ''));
  const [editFat, setEditFat] = useState(() => String(product?.fatGrams ?? ''));

  // A new barcode resets the editor
  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setOverrideProduct(null);
    setIsEditingMacros(false);
    setMultiplier(1);
    setEditCalories(String(product.caloriesPer100g ?? ''));
    setEditProtein(String(product.proteinGrams ?? ''));
    setEditCarbs(String(product.carbsGrams ?? ''));
    setEditFat(String(product.fatGrams ?? ''));
  }

  const effectiveProduct = overrideProduct ?? product;
  const footerPad = { paddingBottom: Math.max(16, insets.bottom + 8) };

  const back = () => {
    haptics.selection().catch(() => {});
    onScanAgain();
  };

  const closeButton = onClose ? (
    <HeaderIconButton
      icon="close"
      label="Close"
      onPress={() => {
        haptics.selection().catch(() => {});
        onClose();
      }}
    />
  ) : undefined;

  // 3D · Not found or lookup failed
  if (error || !effectiveProduct) {
    const notFound = !error || NOT_FOUND.test(error);
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <SubScreenHeader
          title="Scanned item"
          onBack={back}
          backLabel="Back to barcode scanner"
          right={closeButton}
        />
        <ScrollView style={styles.flex1} contentContainerStyle={[styles.body, styles.notFoundBody]}>
          <View style={styles.alertIcon}>
            <Ionicons name="alert-circle-outline" size={30} color={Colors.warningDark} />
          </View>
          <Text style={styles.stateTitle} accessibilityRole="header">
            {notFound ? "We don't know this one yet" : "Couldn't look this up"}
          </Text>
          <Text style={[ui.body, styles.center]}>
            {notFound
              ? "This barcode isn't in Open Food Facts yet. Enter the numbers from the label instead."
              : error}
          </Text>
          {scannedCode ? (
            <View style={styles.codeChip} accessible accessibilityLabel={`Barcode ${scannedCode}`}>
              <Ionicons name="barcode-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.codeText}>{scannedCode}</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={[styles.footer, footerPad]}>
          {onEnterManually && scannedCode ? (
            <ProfileButton
              label="Enter from label"
              variant="primary"
              onPress={() => {
                haptics.selection().catch(() => {});
                onEnterManually(scannedCode);
              }}
              accessibilityLabel="Enter food details manually"
            />
          ) : null}
          <ProfileButton
            label="Scan another"
            onPress={back}
            accessibilityLabel="Scan another barcode"
          />
        </View>
      </View>
    );
  }

  // 3C · Product found. One serving is the label's gram weight (100 g when unknown).
  const perServing = normalizedFoodToFoodItem(effectiveProduct);
  const factor = servingGrams(effectiveProduct) / 100;
  const kcal = Math.round(perServing.calories * multiplier);
  const grams = Math.round(servingGrams(effectiveProduct) * multiplier);
  const meal = mealLabel(selectedMealType);

  const micros = [
    effectiveProduct.fiberGrams !== undefined
      ? { label: 'Fibre', value: `${oneDecimal(effectiveProduct.fiberGrams * factor * multiplier)} g` }
      : null,
    effectiveProduct.sugarGrams !== undefined
      ? { label: 'Sugar', value: `${oneDecimal(effectiveProduct.sugarGrams * factor * multiplier)} g` }
      : null,
    effectiveProduct.sodiumGrams !== undefined
      ? {
          label: 'Sodium',
          value: `${Math.round(effectiveProduct.sodiumGrams * 1000 * factor * multiplier)} mg`,
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const toggleMacroEditor = () => {
    haptics.selection().catch(() => {});
    if (!isEditingMacros) {
      setEditCalories(String(effectiveProduct.caloriesPer100g ?? ''));
      setEditProtein(String(effectiveProduct.proteinGrams ?? ''));
      setEditCarbs(String(effectiveProduct.carbsGrams ?? ''));
      setEditFat(String(effectiveProduct.fatGrams ?? ''));
    }
    setIsEditingMacros(prev => !prev);
  };

  const handleApplyCustomMacros = () => {
    const num = (s: string) => Math.max(0, parseFloat(s) || 0);
    setOverrideProduct({
      ...effectiveProduct,
      caloriesPer100g: Math.round(num(editCalories)),
      proteinGrams: oneDecimal(num(editProtein)),
      carbsGrams: oneDecimal(num(editCarbs)),
      fatGrams: oneDecimal(num(editFat)),
      isEstimated: false,
    });
    setIsEditingMacros(false);
    haptics.success().catch(() => {});
  };

  const handleConfirmAdd = () => {
    haptics.success().catch(() => {});
    onAddMeal(selectedMealType, effectiveProduct, multiplier);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <SubScreenHeader
        title="Scanned item"
        subtitle="From Open Food Facts"
        onBack={back}
        backLabel="Back to scanner"
        right={closeButton}
      />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.thumb}>
              {effectiveProduct.imageUrl ? (
                <Image
                  source={{ uri: effectiveProduct.imageUrl }}
                  style={styles.thumbImg}
                  contentFit="contain"
                  transition={200}
                />
              ) : (
                <Ionicons name="nutrition-outline" size={32} color={Colors.textSecondary} />
              )}
            </View>
            <View style={styles.flex1}>
              <Text style={ui.title} numberOfLines={2} accessibilityRole="header">
                {effectiveProduct.name}
              </Text>
              <View style={styles.metaRow}>
                {effectiveProduct.brand ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {effectiveProduct.brand}
                  </Text>
                ) : null}
                <Text style={styles.metaMuted} numberOfLines={1}>
                  {effectiveProduct.id}
                </Text>
              </View>
            </View>
          </View>

          {effectiveProduct.isEstimated ? (
            <View style={styles.estimate} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={18} color={Colors.warningDark} />
              <Text style={styles.estimateText}>
                {effectiveProduct.estimatedCategory
                  ? `Estimated from ${effectiveProduct.estimatedCategory}. `
                  : 'Estimated. '}
                Open Food Facts has no nutrition table for this barcode, so these are typical
                values. Check the label.
              </Text>
            </View>
          ) : null}

          <View style={styles.gap8}>
            <SectionLabel
              title={`Nutrition (for ${formatQty(multiplier)} ${multiplier === 1 ? 'serving' : 'servings'})`}
            />
            <MacroSummary
              calories={kcal}
              protein={perServing.protein * multiplier}
              carbs={perServing.carbs * multiplier}
              fat={perServing.fat * multiplier}
            />
            {micros.length > 0 ? (
              <View style={[ui.card, styles.microRow]}>
                {micros.map(m => (
                  <View key={m.label} style={styles.microCell}>
                    <Text style={styles.microValue}>{m.value}</Text>
                    <Text style={styles.microLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.editLink, pressed && ui.pressed]}
              onPress={toggleMacroEditor}
              accessibilityRole="button"
              accessibilityLabel={isEditingMacros ? 'Cancel editing nutrition' : 'Edit nutrition from label'}
            >
              <Text style={styles.editLinkText}>
                {isEditingMacros ? 'Cancel editing' : 'Numbers look off? Edit from label'}
              </Text>
            </Pressable>
          </View>

          {isEditingMacros ? (
            <View style={[ui.card, styles.editor]}>
              <Text style={ui.rowTitle}>Per 100 g, from the package</Text>
              <View style={styles.editorGrid}>
                {(
                  [
                    ['input-calories', 'Calories', 'kcal', editCalories, setEditCalories],
                    ['input-protein', 'Protein', 'g', editProtein, setEditProtein],
                    ['input-carbs', 'Carbs', 'g', editCarbs, setEditCarbs],
                    ['input-fat', 'Fat', 'g', editFat, setEditFat],
                  ] as const
                ).map(([testID, label, unit, value, setter]) => (
                  <View key={testID} style={styles.editorCell}>
                    <LabeledInput
                      testID={testID}
                      label={label}
                      unit={unit}
                      accessibilityLabel={`${label} per 100g`}
                      value={value}
                      onChangeText={setter}
                      keyboardType="numeric"
                      placeholder="0"
                      selectTextOnFocus
                    />
                  </View>
                ))}
              </View>
              <ProfileButton
                label="Use these values"
                variant="dark"
                onPress={handleApplyCustomMacros}
                accessibilityLabel="Save package values"
              />
            </View>
          ) : null}

          <View>
            <SectionLabel title="Portion" />
            <PortionStepper
              value={multiplier}
              unit={`${multiplier === 1 ? 'serving' : 'servings'} · ${grams} g`}
              onChange={v => {
                setMultiplier(v);
                haptics.selection().catch(() => {});
              }}
              presets={PRESETS}
              step={0.25}
              min={0.25}
              max={10}
            />
          </View>

          <View>
            <SectionLabel title="Meal" />
            <MealSwitcher
              value={selectedMealType}
              onChange={m => {
                setSelectedMealType(m);
                haptics.selection().catch(() => {});
              }}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, footerPad]}>
          {mealCalories && allowance !== undefined ? (
            <MealImpact
              logged={mealCalories[selectedMealType] || 0}
              adding={kcal}
              target={getMealTarget(allowance, selectedMealType)}
            />
          ) : null}
          <ProfileButton
            label={`Add to ${meal} · ${kcal} kcal`}
            variant="primary"
            onPress={handleConfirmAdd}
            accessibilityLabel={`Add to ${meal}, ${kcal} calories`}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  gap8: { gap: 8 },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 24 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    backgroundColor: Colors.background,
  },
  stateTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  notFoundBody: { alignItems: 'center', paddingTop: 40, gap: 8 },
  alertIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainer,
  },
  codeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  meta: { flexShrink: 1, fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSecondary },
  metaMuted: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },

  estimate: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.warningLight,
  },
  estimateText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.warningDark,
  },

  microRow: { flexDirection: 'row', paddingVertical: 10 },
  microCell: { flex: 1, alignItems: 'center' },
  microValue: { fontFamily: Fonts.urbanist.bold, fontSize: 15, color: Colors.textPrimary },
  microLabel: { fontFamily: Fonts.urbanist.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  editLink: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  editLinkText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.primaryDark },

  editor: { padding: 16, gap: 14 },
  editorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  editorCell: { flexBasis: '45%', flexGrow: 1 },
});
