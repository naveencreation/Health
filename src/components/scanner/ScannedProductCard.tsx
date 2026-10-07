import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { IconSizes, ActionIcons } from '@/theme/icons';
import { Fonts } from '@/theme/typography';
import { NormalizedFoodItem } from '@/types/barcode';
import { MealType } from '@/types';
import { haptics } from '@/utils/haptics';

export interface ScannedProductCardProps {
  product?: NormalizedFoodItem | null;
  error?: string | null;
  scannedCode?: string | null;
  initialMealType?: MealType;
  onAddMeal: (mealType: MealType, product: NormalizedFoodItem, multiplier: number) => void;
  onScanAgain: () => void;
  onEnterManually?: (code: string) => void;
  onClose?: () => void;
}

const MULTIPLIER_PRESETS = [0.5, 1, 1.5, 2];

const MEAL_OPTIONS: Array<{
  id: MealType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'breakfast', label: 'Breakfast', icon: 'partly-sunny-outline' },
  { id: 'lunch', label: 'Lunch', icon: 'sunny-outline' },
  { id: 'snacks', label: 'Snacks', icon: 'cafe-outline' },
  { id: 'dinner', label: 'Dinner', icon: 'moon-outline' },
];

/**
 * Smart meal selector based on time of day
 */
function getDefaultMealType(preferredMeal?: MealType): MealType {
  if (preferredMeal) return preferredMeal;
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11.5) return 'breakfast';
  if (hour >= 11.5 && hour < 15.5) return 'lunch';
  if (hour >= 15.5 && hour < 18.5) return 'snacks';
  return 'dinner';
}

function formatCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `Today • ${displayHours}:${displayMinutes} ${ampm}`;
}

export function ScannedProductCard({
  product,
  error,
  scannedCode,
  initialMealType,
  onAddMeal,
  onScanAgain,
  onEnterManually,
  onClose,
}: ScannedProductCardProps) {
  const insets = useSafeAreaInsets();
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(() =>
    getDefaultMealType(initialMealType)
  );

  // Local override state for editing packaging values
  const [overrideProduct, setOverrideProduct] = useState<NormalizedFoodItem | null>(null);
  const [isEditingMacros, setIsEditingMacros] = useState<boolean>(false);
  const [prevProductId, setPrevProductId] = useState<string | undefined>(product?.id);

  // Inline form input state initialized from product
  const [editCalories, setEditCalories] = useState<string>(() =>
    product ? String(product.caloriesPer100g ?? '') : ''
  );
  const [editProtein, setEditProtein] = useState<string>(() =>
    product ? String(product.proteinGrams ?? '') : ''
  );
  const [editCarbs, setEditCarbs] = useState<string>(() =>
    product ? String(product.carbsGrams ?? '') : ''
  );
  const [editFat, setEditFat] = useState<string>(() =>
    product ? String(product.fatGrams ?? '') : ''
  );

  // Synchronize when a new barcode/product is scanned
  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setOverrideProduct(null);
    setIsEditingMacros(false);
    setEditCalories(String(product.caloriesPer100g ?? ''));
    setEditProtein(String(product.proteinGrams ?? ''));
    setEditCarbs(String(product.carbsGrams ?? ''));
    setEditFat(String(product.fatGrams ?? ''));
  }

  const effectiveProduct = overrideProduct ?? product;

  const toggleMacroEditor = () => {
    haptics.selection().catch(() => {});
    if (!isEditingMacros && effectiveProduct) {
      setEditCalories(String(effectiveProduct.caloriesPer100g ?? ''));
      setEditProtein(String(effectiveProduct.proteinGrams ?? ''));
      setEditCarbs(String(effectiveProduct.carbsGrams ?? ''));
      setEditFat(String(effectiveProduct.fatGrams ?? ''));
    }
    setIsEditingMacros(prev => !prev);
  };

  const handleMultiplierChange = (newVal: number) => {
    const clamped = Math.max(0.25, Math.min(10, Math.round(newVal * 100) / 100));
    setMultiplier(clamped);
    haptics.selection().catch(() => {});
  };

  const calculatedCalories = useMemo(() => {
    if (!effectiveProduct) return 0;
    return Math.round(effectiveProduct.caloriesPer100g * multiplier);
  }, [effectiveProduct, multiplier]);

  const calculatedProtein = useMemo(() => {
    if (!effectiveProduct) return 0;
    return Math.round(effectiveProduct.proteinGrams * multiplier * 10) / 10;
  }, [effectiveProduct, multiplier]);

  const calculatedCarbs = useMemo(() => {
    if (!effectiveProduct) return 0;
    return Math.round(effectiveProduct.carbsGrams * multiplier * 10) / 10;
  }, [effectiveProduct, multiplier]);

  const calculatedFat = useMemo(() => {
    if (!effectiveProduct) return 0;
    return Math.round(effectiveProduct.fatGrams * multiplier * 10) / 10;
  }, [effectiveProduct, multiplier]);

  const calculatedGrams = useMemo(() => {
    if (!effectiveProduct) return null;
    const baseGrams = effectiveProduct.servingSizeGrams || 100;
    return Math.round(baseGrams * multiplier);
  }, [effectiveProduct, multiplier]);

  const handleApplyCustomMacros = () => {
    if (!effectiveProduct) return;
    const cals = Math.max(0, parseFloat(editCalories) || 0);
    const prot = Math.max(0, parseFloat(editProtein) || 0);
    const carbs = Math.max(0, parseFloat(editCarbs) || 0);
    const fat = Math.max(0, parseFloat(editFat) || 0);

    setOverrideProduct({
      ...effectiveProduct,
      caloriesPer100g: Math.round(cals),
      proteinGrams: Math.round(prot * 10) / 10,
      carbsGrams: Math.round(carbs * 10) / 10,
      fatGrams: Math.round(fat * 10) / 10,
      isEstimated: false, // User manually entered packaging values
    });
    setIsEditingMacros(false);
    haptics.success().catch(() => {});
  };

  const handleConfirmAdd = () => {
    if (!effectiveProduct) return;
    haptics.success().catch(() => {});
    onAddMeal(selectedMealType, effectiveProduct, multiplier);
  };

  const activeMealLabel =
    MEAL_OPTIONS.find(m => m.id === selectedMealType)?.label || 'Meal';

  // ===============================================================
  // Error or Not Found State (Dedicated Full Screen)
  // ===============================================================
  if (error || !effectiveProduct) {
    return (
      <View style={[styles.screenContainer, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Top App Bar */}
        <View style={styles.topAppBar}>
          <Pressable
            style={({ pressed }) => [styles.iconCircleBtn, pressed && styles.btnPressedSubtle]}
            onPress={() => {
              haptics.selection().catch(() => {});
              onScanAgain();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Back to barcode scanner"
          >
            <Ionicons name={ActionIcons.arrowBack} size={IconSizes.standard} color={Colors.textPrimary} />
          </Pressable>

          <Text style={styles.appBarTitle}>Item Details</Text>

          {onClose ? (
            <Pressable
              style={({ pressed }) => [styles.iconCircleBtn, pressed && styles.btnPressedSubtle]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name={ActionIcons.close} size={IconSizes.standard} color={Colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <View style={styles.errorContentWrapper}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="barcode-outline" size={38} color={Colors.primary} />
          </View>

          <Text style={styles.errorTitle}>Packaged Item Not Found</Text>
          <Text style={styles.errorSubtitle}>
            {error || 'This barcode is not yet registered in the Open Food Facts catalog.'}
          </Text>

          {scannedCode ? (
            <View style={styles.barcodeChip}>
              <Ionicons name="pricetag-outline" size={14} color={Colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.barcodeChipLabel}>Barcode: </Text>
              <Text style={styles.barcodeChipValue}>{scannedCode}</Text>
            </View>
          ) : null}

          <View style={[styles.buttonStack, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {onEnterManually && scannedCode ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.btnPressedPrimary : null,
                ]}
                onPress={() => {
                  haptics.selection().catch(() => {});
                  onEnterManually(scannedCode);
                }}
                accessibilityRole="button"
                accessibilityLabel="Enter food details manually"
              >
                <Ionicons name="create-outline" size={20} color={Colors.onPrimary} style={styles.btnIcon} />
                <Text style={styles.primaryButtonText}>Enter Details Manually</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.btnPressedSubtle : null,
              ]}
              onPress={() => {
                haptics.selection().catch(() => {});
                onScanAgain();
              }}
              accessibilityRole="button"
              accessibilityLabel="Scan another barcode"
            >
              <Ionicons name="scan-outline" size={18} color={Colors.textPrimary} style={styles.btnIcon} />
              <Text style={styles.secondaryButtonText}>Scan Another Item</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ===============================================================
  // Dedicated Full Screen: Scanned Product Inspector & Logger
  // ===============================================================
  return (
    <View style={[styles.screenContainer, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* 1. Top Navigation Bar */}
      <View style={styles.topAppBar}>
        <Pressable
          style={({ pressed }) => [styles.iconCircleBtn, pressed && styles.btnPressedSubtle]}
          onPress={() => {
            haptics.selection().catch(() => {});
            onScanAgain();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back to scanner"
        >
          <Ionicons name={ActionIcons.arrowBack} size={IconSizes.standard} color={Colors.textPrimary} />
        </Pressable>

        <Text style={styles.appBarTitle}>Log Scanned Item</Text>

        {onClose ? (
          <Pressable
            style={({ pressed }) => [styles.iconCircleBtn, pressed && styles.btnPressedSubtle]}
            onPress={() => {
              haptics.selection().catch(() => {});
              onClose();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name={ActionIcons.close} size={IconSizes.standard} color={Colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        {/* A. Hero Product Identity Card */}
        <View style={styles.productHeroCard}>
          <View style={styles.thumbnailContainer}>
            {effectiveProduct.imageUrl ? (
              <Image
                source={{ uri: effectiveProduct.imageUrl }}
                style={styles.thumbnail}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <View style={styles.thumbnailFallback}>
                <Ionicons name="nutrition-outline" size={32} color={Colors.textSecondary} />
              </View>
            )}
          </View>

          <View style={styles.productMeta}>
            <View style={styles.badgeRow}>
              {effectiveProduct.brand ? (
                <View style={styles.brandPill}>
                  <Text style={styles.brandPillText} numberOfLines={1}>
                    {effectiveProduct.brand.toUpperCase()}
                  </Text>
                </View>
              ) : null}

              {effectiveProduct.id ? (
                <View style={styles.barcodePill}>
                  <Ionicons name="barcode-outline" size={IconSizes.compact} color={Colors.textSecondary} style={{ marginRight: 3 }} />
                  <Text style={styles.barcodePillText} numberOfLines={1}>
                    {effectiveProduct.id}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.productTitle} numberOfLines={2}>
              {effectiveProduct.name}
            </Text>

            <View style={styles.servingTagRow}>
              <Ionicons name={ActionIcons.calendar} size={IconSizes.compact} color={Colors.textSecondary} style={{ marginRight: 5 }} />
              <Text style={styles.servingTagText}>
                {effectiveProduct.servingSize || 'Standard 100g serving'}
              </Text>
            </View>
          </View>
        </View>

        {/* B. High-Visibility Meal Slot & Time Selector */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Assign to meal</Text>
            <View style={styles.timeTag}>
              <Ionicons name={ActionIcons.clock} size={IconSizes.compact} color={Colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.timeTagText}>{formatCurrentTime()}</Text>
            </View>
          </View>

          <View style={styles.mealGridContainer}>
            {MEAL_OPTIONS.map(slot => {
              const isActive = selectedMealType === slot.id;
              const iconColor = isActive ? Colors.primary : Colors.textSecondary;
              return (
                <Pressable
                  key={slot.id}
                  style={({ pressed }) => [
                    styles.mealCardItem,
                    isActive ? styles.mealCardItemActive : null,
                    pressed ? styles.btnPressedSubtle : null,
                  ]}
                  onPress={() => {
                    setSelectedMealType(slot.id);
                    haptics.selection().catch(() => {});
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${slot.label}`}
                >
                  <Ionicons
                    name={slot.icon as any}
                    size={IconSizes.standard}
                    color={iconColor}
                    style={styles.mealCardIcon}
                  />
                  <Text
                    style={[
                      styles.mealCardLabel,
                      isActive && styles.mealCardLabelActive,
                    ]}
                  >
                    {slot.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* C. Estimation Notice Banner */}
        {effectiveProduct.isEstimated ? (
          <View style={styles.estimateBanner}>
            <View style={styles.estimateBannerTop}>
              <View style={styles.estimateBadge}>
                <Ionicons name="alert-circle" size={18} color={Colors.carbsDark} />
                <Text style={styles.estimateBadgeText}>
                  Estimated {effectiveProduct.estimatedCategory ? `from ${effectiveProduct.estimatedCategory}` : ''}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.estimateEditBtn,
                  pressed ? styles.btnPressedSubtle : null,
                ]}
                onPress={toggleMacroEditor}
                accessibilityRole="button"
                accessibilityLabel={isEditingMacros ? 'Cancel editing macros' : 'Adjust macros from packaging'}
              >
                <Ionicons
                  name={isEditingMacros ? 'close' : 'options-outline'}
                  size={16}
                  color={Colors.primaryDeep}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.estimateEditBtnText}>
                  {isEditingMacros ? 'Cancel' : 'Adjust'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.estimateDescription}>
              Open Food Facts lacks nutrition table for this barcode. Macros are approximated from category standards. Tap Adjust to enter exact values from box.
            </Text>
          </View>
        ) : null}

        {/* D. Inline Packaging Value Editor */}
        {isEditingMacros ? (
          <View style={styles.macroEditorCard}>
            <View style={styles.editorHeadingRow}>
              <Text style={styles.macroEditorTitle}>Enter Nutrition per 100g (from package)</Text>
              <Ionicons name="nutrition" size={16} color={Colors.primary} />
            </View>
            <View style={styles.editorInputsGrid}>
              <View style={styles.editorInputCol}>
                <Text style={styles.editorInputLabel}>Calories (kcal)</Text>
                <TextInput
                  testID="input-calories"
                  accessibilityLabel="Calories per 100g"
                  style={styles.editorInput}
                  value={editCalories}
                  onChangeText={setEditCalories}
                  keyboardType="numeric"
                  placeholder="0"
                  selectTextOnFocus
                />
              </View>
              <View style={styles.editorInputCol}>
                <Text style={styles.editorInputLabel}>Protein (g)</Text>
                <TextInput
                  testID="input-protein"
                  accessibilityLabel="Protein per 100g"
                  style={styles.editorInput}
                  value={editProtein}
                  onChangeText={setEditProtein}
                  keyboardType="numeric"
                  placeholder="0"
                  selectTextOnFocus
                />
              </View>
              <View style={styles.editorInputCol}>
                <Text style={styles.editorInputLabel}>Carbs (g)</Text>
                <TextInput
                  testID="input-carbs"
                  accessibilityLabel="Carbs per 100g"
                  style={styles.editorInput}
                  value={editCarbs}
                  onChangeText={setEditCarbs}
                  keyboardType="numeric"
                  placeholder="0"
                  selectTextOnFocus
                />
              </View>
              <View style={styles.editorInputCol}>
                <Text style={styles.editorInputLabel}>Fat (g)</Text>
                <TextInput
                  testID="input-fat"
                  accessibilityLabel="Fat per 100g"
                  style={styles.editorInput}
                  value={editFat}
                  onChangeText={setEditFat}
                  keyboardType="numeric"
                  placeholder="0"
                  selectTextOnFocus
                />
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.editorApplyBtn,
                pressed ? styles.btnPressedPrimary : null,
              ]}
              onPress={handleApplyCustomMacros}
              accessibilityRole="button"
              accessibilityLabel="Save package values"
            >
              <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.editorApplyBtnText}>Save Package Values</Text>
            </Pressable>
          </View>
        ) : null}

        {/* E. Unified 4-Nutrient Telemetry Deck */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.nutritionTitleRow}>
              <Text style={styles.sectionTitle}>Nutrition Facts </Text>
              <Text style={styles.nutritionSubtitle}>(per 100g)</Text>
            </View>
          </View>

          <View style={styles.nutritionUnifiedCard}>
            {/* 1. Calories */}
            <View style={styles.nutritionColumn}>
              <Ionicons name="flame-outline" size={20} color={Colors.primary} style={styles.macroIcon} />
              <Text style={styles.macroColLabel}>Calories</Text>
              <View style={styles.macroColValueRow}>
                <Text style={styles.macroColNumber}>{calculatedCalories}</Text>
                <Text style={styles.macroColUnit}>kcal</Text>
              </View>
            </View>

            <View style={styles.nutritionDivider} />

            {/* 2. Protein */}
            <View style={styles.nutritionColumn}>
              <Ionicons name="barbell-outline" size={20} color={Colors.proteinDark} style={styles.macroIcon} />
              <Text style={styles.macroColLabel}>Protein</Text>
              <View style={styles.macroColValueRow}>
                <Text style={styles.macroColNumber}>{calculatedProtein}</Text>
                <Text style={styles.macroColUnit}>g</Text>
              </View>
            </View>

            <View style={styles.nutritionDivider} />

            {/* 3. Carbs */}
            <View style={styles.nutritionColumn}>
              <MaterialCommunityIcons name="barley" size={20} color={Colors.carbsDark} style={styles.macroIcon} />
              <Text style={styles.macroColLabel}>Carbs</Text>
              <View style={styles.macroColValueRow}>
                <Text style={styles.macroColNumber}>{calculatedCarbs}</Text>
                <Text style={styles.macroColUnit}>g</Text>
              </View>
            </View>

            <View style={styles.nutritionDivider} />

            {/* 4. Fat */}
            <View style={styles.nutritionColumn}>
              <Ionicons name="water-outline" size={20} color={Colors.fatDark} style={styles.macroIcon} />
              <Text style={styles.macroColLabel}>Fat</Text>
              <View style={styles.macroColValueRow}>
                <Text style={styles.macroColNumber}>{calculatedFat}</Text>
                <Text style={styles.macroColUnit}>g</Text>
              </View>
            </View>
          </View>
        </View>

        {/* F. Portion Size Controls */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Portion Size</Text>
            <Text style={styles.portionReadout}>
              {multiplier === 1 ? '1 serving' : `${multiplier} servings`} {calculatedGrams ? `(≈ ${calculatedGrams}g)` : ''}
            </Text>
          </View>

          <View style={styles.portionControlRow}>
            {/* Stepper Card */}
            <View style={styles.stepperContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.stepperBtn,
                  pressed ? styles.btnPressedSubtle : null,
                ]}
                onPress={() => handleMultiplierChange(multiplier - 0.25)}
                accessibilityRole="button"
                accessibilityLabel="Decrease portion"
              >
                <Ionicons name="remove" size={16} color={Colors.textPrimary} />
              </Pressable>

              <Text style={styles.stepperValueText}>
                {multiplier % 1 === 0 ? `${multiplier}x` : `${multiplier}x`}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.stepperBtn,
                  pressed ? styles.btnPressedSubtle : null,
                ]}
                onPress={() => handleMultiplierChange(multiplier + 0.25)}
                accessibilityRole="button"
                accessibilityLabel="Increase portion"
              >
                <Ionicons name="add" size={16} color={Colors.textPrimary} />
              </Pressable>
            </View>

            {/* Quick Multiplier Chips */}
            <View style={styles.presetChipsRow}>
              {MULTIPLIER_PRESETS.map(preset => {
                const isActive = multiplier === preset;
                const label = preset % 1 === 0 ? `${preset}x` : `${preset}x`;
                return (
                  <Pressable
                    key={preset}
                    style={({ pressed }) => [
                      styles.presetChip,
                      isActive ? styles.presetChipActive : null,
                      pressed ? styles.btnPressedSubtle : null,
                    ]}
                    onPress={() => handleMultiplierChange(preset)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set portion to ${preset} times`}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isActive ? styles.presetChipTextActive : null,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* G. Detailed Micronutrients (if available) */}
        {(effectiveProduct.fiberGrams !== undefined ||
          effectiveProduct.sugarGrams !== undefined ||
          effectiveProduct.sodiumGrams !== undefined) && (
          <View style={styles.microSection}>
            <Text style={styles.microSectionTitle}>MORE NUTRITION DETAILS</Text>
            <View style={styles.microPillsRow}>
              {effectiveProduct.fiberGrams !== undefined && (
                <View style={styles.microPill}>
                  <Text style={styles.microPillLabel}>Fiber</Text>
                  <Text style={styles.microPillValue}>
                    {Math.round(effectiveProduct.fiberGrams * multiplier * 10) / 10}g
                  </Text>
                </View>
              )}
              {effectiveProduct.sugarGrams !== undefined && (
                <View style={styles.microPill}>
                  <Text style={styles.microPillLabel}>Sugar</Text>
                  <Text style={styles.microPillValue}>
                    {Math.round(effectiveProduct.sugarGrams * multiplier * 10) / 10}g
                  </Text>
                </View>
              )}
              {effectiveProduct.sodiumGrams !== undefined && (
                <View style={styles.microPill}>
                  <Text style={styles.microPillLabel}>Sodium</Text>
                  <Text style={styles.microPillValue}>
                    {Math.round(effectiveProduct.sodiumGrams * multiplier * 100) / 100}g
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. Sticky Bottom Action Dock */}
      <View style={[styles.bottomActionDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.btnPressedPrimary : null,
          ]}
          onPress={handleConfirmAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add to ${activeMealLabel}, ${calculatedCalories} calories`}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.onPrimary} style={styles.btnIcon} />
          <Text style={styles.primaryButtonText}>
            Add to {activeMealLabel} • {calculatedCalories} kcal
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.btnPressedSubtle : null,
          ]}
          onPress={() => {
            haptics.selection().catch(() => {});
            onScanAgain();
          }}
          accessibilityRole="button"
          accessibilityLabel="Scan another item"
        >
          <Ionicons name="scan-outline" size={20} color={Colors.textPrimary} style={styles.btnIcon} />
          <Text style={styles.secondaryButtonText}>Scan Another Item</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background
  },

  // 1. Top App Bar
  topAppBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBarTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  topBarcodeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    maxWidth: 130,
  },
  topBarcodeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },

  // 2. Scroll Area
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // A. Hero Product Card
  productHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    padding: 14,
    marginBottom: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  thumbnailContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productMeta: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  brandPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  brandPillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  barcodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceInset,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  barcodePillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  productTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    lineHeight: 23,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  servingTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingTagText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // B. Meal Slot & Time Selector
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeTagText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  mealGridContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  mealCardItem: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCardItemActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  mealCardIcon: {
    marginBottom: 8,
  },
  mealCardLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  mealCardLabelActive: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.primary,
  },

  // C. Estimation Notice Banner
  estimateBanner: {
    backgroundColor: Colors.carbsLight,
    borderWidth: 1,
    borderColor: Colors.carbsBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  estimateBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  estimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  estimateBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.primaryDeep,
  },
  estimateEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  estimateEditBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.primaryDeep,
  },
  estimateDescription: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  // D. Inline Macro Editor
  macroEditorCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    marginBottom: 16,
  },
  editorHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroEditorTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  editorInputsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  editorInputCol: {
    flex: 1,
  },
  editorInputLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  editorInput: {
    height: 42,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: 4,
  },
  editorApplyBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorApplyBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.onPrimary,
  },

  // E. Unified 4-Nutrient Telemetry Deck
  nutritionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nutritionSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nutritionUnifiedCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  nutritionColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionDivider: {
    width: 1,
    height: 38,
    backgroundColor: Colors.borderWhisper,
  },
  macroIcon: {
    marginBottom: 6,
  },
  macroColLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  macroColValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroColNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  macroColUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 3,
  },

  // F. Portion Size Controls
  portionReadout: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  portionControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 4,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
  },
  presetChipsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  presetChipText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  presetChipTextActive: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.primary,
  },

  // G. Micronutrients Row
  microSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    padding: 12,
    marginTop: 4,
  },
  microSectionTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  microPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  microPill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  microPillLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  microPillValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.textPrimary,
  },

  // 3. Sticky Bottom Action Dock
  bottomActionDock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowColor,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.onPrimary,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  btnIcon: {
    marginRight: 8,
  },
  btnPressedPrimary: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  btnPressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },

  // Error State Styles
  errorContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.stepsLight,
    borderWidth: 1,
    borderColor: Colors.stepsBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  barcodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceInset,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 32,
  },
  barcodeChipLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  barcodeChipValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: 0.8,
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
});
