import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  BackHandler,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useGoals, useDailyLog } from '@/context/HealthContext';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { SubScreenHeader } from '@/components/profile/ProfileUI';
import {
  toGoalsForm,
  validateGoalsForm,
  planFor,
  toGoalType,
  balancedCarbs,
  parseDecimal,
  isTeenAge,
  type GoalsField,
  type GoalsFormValues,
} from '@/features/onboarding/services/goalsForm';
import type { GoalType } from '@/features/onboarding/services/onboardingCalculator';

interface GoalsScreenProps {
  onBack: () => void;
}

export const GoalsScreen: React.FC<GoalsScreenProps> = ({ onBack }) => {
  const { userGoals, updateGoals } = useGoals();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  const { logWeight, todayStr } = useDailyLog();
  const unit = userGoals.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const [form, setForm] = useState<GoalsFormValues>(() => toGoalsForm(userGoals, unit));
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [activePreset, setActivePreset] = useState<GoalType>(() => toGoalType(userGoals.goal));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const isTeen = isTeenAge(userGoals.age);
  const [teenNotice, setTeenNotice] = useState<string | null>(null);

  // Pick up outside changes (sync, weigh-ins) only while there are no unsaved edits
  useEffect(() => {
    if (!dirty) setForm(toGoalsForm(userGoals, unit));
  }, [userGoals, unit, dirty]);

  const edit = (key: GoalsField) => (text: string) => {
    setForm(f => ({ ...f, [key]: text }));
    setDirty(true);
  };

  // Presets come from the user's own biometrics, so their macros add up to their budget
  const presets = useMemo(
    () => ({
      lose_weight: planFor(userGoals, 'lose_weight'),
      maintain: planFor(userGoals, 'maintain'),
      gain_muscle: planFor(userGoals, 'gain_muscle'),
    }),
    [userGoals]
  );

  const { errors, goals: validGoals } = validateGoalsForm(form, {
    unit,
    gender: userGoals.gender,
    age: userGoals.age,
  });

  // Live macro math
  const pGrams = parseDecimal(form.protein) || 0;
  const cGrams = parseDecimal(form.carbs) || 0;
  const fGrams = parseDecimal(form.fat) || 0;
  const computedMacroCals = Math.round(pGrams * 4 + cGrams * 4 + fGrams * 9);
  const proteinPct = computedMacroCals ? Math.round(((pGrams * 4) / computedMacroCals) * 100) : 0;
  const carbsPct = computedMacroCals ? Math.round(((cGrams * 4) / computedMacroCals) * 100) : 0;
  const fatPct = computedMacroCals ? Math.max(0, 100 - proteinPct - carbsPct) : 0;

  const applyPreset = (preset: GoalType) => {
    if (isTeen && preset === 'lose_weight') {
      setTeenNotice('Caloric deficits are disabled for ages 13-17 to support healthy development.');
      return;
    }
    setTeenNotice(null);
    setActivePreset(preset);
    const plan = presets[preset];
    setForm(f => ({
      ...f,
      budget: String(plan.dailyCalorieBudget),
      protein: String(plan.targetProteinG),
      carbs: String(plan.targetCarbsG),
      fat: String(plan.targetFatG),
      fiber: String(plan.targetFiberG),
    }));
    setDirty(true);
  };

  const balanceCarbs = () => {
    setForm(f => ({
      ...f,
      carbs: String(
        balancedCarbs(
          parseDecimal(f.budget) || 0,
          parseDecimal(f.protein) || 0,
          parseDecimal(f.fat) || 0
        )
      ),
    }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!validGoals) {
      setShowErrors(true);
      AccessibilityInfo.announceForAccessibility('Some goals need fixing before saving');
      return;
    }
    const { currentWeightKg, ...rest } = validGoals;
    updateGoals({ ...rest, goal: activePreset });
    // Weight goes through the weight log so it gets an entry like any other weigh-in
    if (Math.abs(currentWeightKg - userGoals.currentWeightKg) >= 0.05) {
      logWeight(currentWeightKg, todayStr);
    }
    setDirty(false);
    setShowErrors(false);
    setSavedSuccess(true);
    AccessibilityInfo.announceForAccessibility('Goals saved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSavedSuccess(false);
      onBack();
    }, 800);
  };

  const handleBack = () => (dirty ? setConfirmDiscard(true) : onBack());

  // Android back asks before discarding edits; registered after the parent's handler, so it runs first
  useEffect(() => {
    if (!dirty) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setConfirmDiscard(true);
      return true;
    });
    return () => sub.remove();
  }, [dirty]);

  const fieldError = (key: GoalsField) =>
    showErrors && errors[key] ? <Text style={styles.fieldError}>{errors[key]}</Text> : null;

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ConfirmationModal
        visible={confirmDiscard}
        title="Discard changes?"
        message="Your edits to these goals haven't been saved."
        confirmText="Discard"
        cancelText="Keep Editing"
        confirmStyle="destructive"
        iconName="alert-circle-outline"
        onConfirm={() => {
          setConfirmDiscard(false);
          setDirty(false);
          onBack();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
      <SubScreenHeader
        title="My goals"
        subtitle={dirty ? 'Unsaved changes' : 'Calories, macros, activity, body'}
        onBack={handleBack}
        right={
          <Pressable
            style={({ pressed }) => [
              styles.headerSaveBtn,
              savedSuccess ? styles.headerSaveBtnSuccess : null,
              pressed ? styles.btnPressed : null,
            ]}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save nutrition and activity goals"
          >
            {savedSuccess ? <Ionicons name="checkmark" size={16} color={Colors.textInverse} /> : null}
            <Text style={styles.headerSaveBtnText}>{savedSuccess ? 'Saved' : 'Save'}</Text>
          </Pressable>
        }
      />

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        {/* Goal Presets Row */}
        <Text style={styles.sectionHeader}>Goal</Text>
        {teenNotice && (
          <View style={styles.teenNoticeContainer}>
            <Ionicons name="information-circle" size={16} color={Colors.water} />
            <Text style={styles.teenNoticeText}>{teenNotice}</Text>
          </View>
        )}
        <View style={styles.presetsRow} accessibilityRole="radiogroup">
          <Pressable
            style={({ pressed }) => [
              styles.presetCard,
              activePreset === 'lose_weight' ? styles.presetCardActive : null,
              isTeen ? styles.presetCardDisabled : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => applyPreset('lose_weight')}
            accessibilityRole="radio"
            accessibilityState={{ checked: activePreset === 'lose_weight', disabled: isTeen }}
            accessibilityLabel={
              isTeen
                ? 'Fat loss preset disabled for teen users'
                : `Fat loss preset, ${presets.lose_weight.dailyCalorieBudget} kilocalories`
            }
          >
            <View style={[styles.presetIconBox, styles.presetIconFatLoss]}>
              <Ionicons
                name={isTeen ? 'lock-closed' : 'flame'}
                size={16}
                color={isTeen ? Colors.textDisabled : Colors.primary}
              />
            </View>
            <Text style={[styles.presetName, isTeen ? styles.presetTextDisabled : null]}>
              Lose weight
            </Text>
            <Text style={styles.presetMeta}>
              {isTeen ? 'Locked' : `${presets.lose_weight.dailyCalorieBudget.toLocaleString()} kcal`}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.presetCard,
              activePreset === 'gain_muscle' ? styles.presetCardActive : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => applyPreset('gain_muscle')}
            accessibilityRole="radio"
            accessibilityState={{ checked: activePreset === 'gain_muscle' }}
            accessibilityLabel={`Muscle gain preset, ${presets.gain_muscle.dailyCalorieBudget} kilocalories`}
          >
            <View style={[styles.presetIconBox, styles.presetIconMuscle]}>
              <Ionicons name="barbell" size={16} color={Colors.protein} />
            </View>
            <Text style={styles.presetName}>Build muscle</Text>
            <Text style={styles.presetMeta}>
              {`${presets.gain_muscle.dailyCalorieBudget.toLocaleString()} kcal`}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.presetCard,
              activePreset === 'maintain' ? styles.presetCardActive : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => applyPreset('maintain')}
            accessibilityRole="radio"
            accessibilityState={{ checked: activePreset === 'maintain' }}
            accessibilityLabel={`Maintenance preset, ${presets.maintain.dailyCalorieBudget} kilocalories`}
          >
            <View style={[styles.presetIconBox, styles.presetIconMaintain]}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.water} />
            </View>
            <Text style={styles.presetName}>Maintain</Text>
            <Text style={styles.presetMeta}>
              {`${presets.maintain.dailyCalorieBudget.toLocaleString()} kcal`}
            </Text>
          </Pressable>
        </View>

        {/* Macro Energy Distribution Split Strip */}
        <View style={styles.macroSplitCard}>
          <View style={styles.macroSplitTop}>
            <Text style={styles.macroSplitTitle}>Macro Energy Distribution</Text>
            <Text style={styles.macroSplitSum}>{computedMacroCals} kcal</Text>
          </View>

          <View style={styles.macroBar}>
            <View
              style={[
                styles.macroBarSeg,
                styles.macroBarProtein,
                { flex: Math.max(1, proteinPct) },
              ]}
            />
            <View
              style={[styles.macroBarSeg, styles.macroBarCarbs, { flex: Math.max(1, carbsPct) }]}
            />
            <View style={[styles.macroBarSeg, styles.macroBarFat, { flex: Math.max(1, fatPct) }]} />
          </View>

          <View style={styles.macroLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotProtein]} />
              <Text style={styles.legendText}>Protein ({proteinPct}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotCarbs]} />
              <Text style={styles.legendText}>Carbs ({carbsPct}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotFat]} />
              <Text style={styles.legendText}>Fat ({fatPct}%)</Text>
            </View>
          </View>

          {errors.macros ? (
            <View style={styles.diffWarning}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.warningDark} />
              <Text style={styles.diffWarningText}>{errors.macros}</Text>
              <Pressable
                onPress={balanceCarbs}
                style={styles.balanceBtn}
                accessibilityRole="button"
                accessibilityLabel="Adjust carbs to match the calorie budget"
              >
                <Text style={styles.balanceBtnText}>Fit carbs</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Nutritional Targets Section */}
        <Text style={styles.sectionHeader}>Daily nutrition</Text>
        <View style={styles.inputCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="flame-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Daily Calorie Budget</Text>
              <Text style={styles.fieldSub}>Baseline daily target</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={form.budget}
              onChangeText={edit('budget')}
              editable={!savedSuccess}
              placeholder="2000"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Daily calorie budget in kilocalories"
            />
            <Text style={styles.fieldUnit}>kcal</Text>
          </View>
          {fieldError('budget')}

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="fitness-outline" size={18} color={Colors.protein} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Protein</Text>
              <Text style={styles.fieldSub}>4 kcal / gram</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={form.protein}
              onChangeText={edit('protein')}
              editable={!savedSuccess}
              placeholder="90"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target protein in grams"
            />
            <Text style={styles.fieldUnit}>g</Text>
          </View>
          {fieldError('protein')}

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="nutrition-outline" size={18} color={Colors.carbsDark} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Carbohydrates</Text>
              <Text style={styles.fieldSub}>4 kcal / gram</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={form.carbs}
              onChangeText={edit('carbs')}
              editable={!savedSuccess}
              placeholder="150"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target carbohydrates in grams"
            />
            <Text style={styles.fieldUnit}>g</Text>
          </View>
          {fieldError('carbs')}

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="leaf-outline" size={18} color={Colors.fat} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Dietary Fat</Text>
              <Text style={styles.fieldSub}>9 kcal / gram</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={form.fat}
              onChangeText={edit('fat')}
              editable={!savedSuccess}
              placeholder="50"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target dietary fat in grams"
            />
            <Text style={styles.fieldUnit}>g</Text>
          </View>
          {fieldError('fat')}

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="sparkles-outline" size={18} color={Colors.fiber} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Dietary Fiber</Text>
              <Text style={styles.fieldSub}>Gut health & fullness</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={form.fiber}
              onChangeText={edit('fiber')}
              editable={!savedSuccess}
              placeholder="30"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target dietary fiber in grams"
            />
            <Text style={styles.fieldUnit}>g</Text>
          </View>
          {fieldError('fiber')}
        </View>

        {/* Activity & Habits Section */}
        <Text style={styles.sectionHeader}>Activity</Text>
        <View style={styles.inputCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="water-outline" size={18} color={Colors.water} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Water Intake</Text>
              <Text style={styles.fieldSub}>Daily hydration target</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={form.water}
              onChangeText={edit('water')}
              editable={!savedSuccess}
              placeholder="2500"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target water intake in milliliters"
            />
            <Text style={styles.fieldUnit}>ml</Text>
          </View>
          {fieldError('water')}

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="footsteps-outline" size={18} color={Colors.steps} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Daily Steps</Text>
              <Text style={styles.fieldSub}>Movement milestone</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={form.steps}
              onChangeText={edit('steps')}
              editable={!savedSuccess}
              placeholder="10000"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Daily step target"
            />
            <Text style={styles.fieldUnit}>steps</Text>
          </View>
          {fieldError('steps')}
        </View>

        {/* Body Metrics Section */}
        <Text style={styles.sectionHeader}>Body</Text>
        <View style={styles.inputCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="scale-outline" size={18} color={Colors.weight} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Current Weight</Text>
              <Text style={styles.fieldSub}>Used for baseline BMR</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              value={form.weight}
              onChangeText={edit('weight')}
              editable={!savedSuccess}
              placeholder="74.2"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel={`Current weight in ${unit === 'lbs' ? 'pounds' : 'kilograms'}`}
            />
            <Text style={styles.fieldUnit}>{unit}</Text>
          </View>
          {fieldError('weight')}

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="flag-outline" size={18} color={Colors.warningDark} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Target Goal Weight</Text>
              <Text style={styles.fieldSub}>Trajectory destination</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              value={form.target}
              onChangeText={edit('target')}
              editable={!savedSuccess}
              placeholder="68.0"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel={`Target weight in ${unit === 'lbs' ? 'pounds' : 'kilograms'}`}
            />
            <Text style={styles.fieldUnit}>{unit}</Text>
          </View>
          {fieldError('target')}

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="body-outline" size={18} color={Colors.textSlate600} />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Height</Text>
              <Text style={styles.fieldSub}>Clinical stature calculation</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={form.height}
              onChangeText={edit('height')}
              editable={!savedSuccess}
              placeholder="175"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Height in centimeters"
            />
            <Text style={styles.fieldUnit}>cm</Text>
          </View>
          {fieldError('height')}
        </View>

        {/* Primary Save Button at Bottom */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            savedSuccess ? styles.saveBtnSuccess : null,
            pressed ? styles.btnPressed : null,
          ]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save nutrition and activity goals"
        >
          <Ionicons
            name={savedSuccess ? 'checkmark-circle' : 'checkmark'}
            size={18}
            color={Colors.onPrimary}
          />
          <Text style={styles.saveBtnText}>
            {savedSuccess ? 'Goals saved' : 'Save goals'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: Colors.primary,
  },
  headerSaveBtnSuccess: {
    backgroundColor: Colors.primaryDark,
  },
  headerSaveBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textInverse,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 16,
  },
  sectionHeader: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 4,
    marginBottom: -8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    shadowOpacity: 0,
    elevation: 0,
  },
  presetCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  presetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  presetIconFatLoss: {
    backgroundColor: Colors.fatLight,
  },
  presetIconMuscle: {
    backgroundColor: Colors.proteinLight,
  },
  presetIconMaintain: {
    backgroundColor: Colors.waterLight,
  },
  presetName: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  presetMeta: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  macroSplitCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    shadowOpacity: 0,
    elevation: 0,
    gap: 12,
  },
  macroSplitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroSplitTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  macroSplitSum: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.primary,
  },
  macroBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceInset,
  },
  macroBarSeg: {
    height: '100%',
  },
  macroBarProtein: {
    backgroundColor: Colors.protein,
  },
  macroBarCarbs: {
    backgroundColor: Colors.carbs,
  },
  macroBarFat: {
    backgroundColor: Colors.fat,
  },
  macroLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotProtein: {
    backgroundColor: Colors.protein,
  },
  legendDotCarbs: {
    backgroundColor: Colors.carbs,
  },
  legendDotFat: {
    backgroundColor: Colors.fat,
  },
  legendText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  diffWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.carbsLight,
    padding: 8,
    borderRadius: 8,
  },
  diffWarningText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.carbsDark,
    flex: 1,
  },
  balanceBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 4 },
  balanceBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.carbsDark,
    textDecorationLine: 'underline',
  },
  fieldError: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.dangerDark,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 48,
  },
  inputCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    shadowOpacity: 0,
    elevation: 0,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  fieldIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fieldLabelContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  fieldSub: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fieldInput: {
    width: 84,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    includeFontPadding: false,
  },
  fieldUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 8,
    width: 34,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.borderWhisper,
    marginVertical: 6,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textPrimary,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 8,
    shadowOpacity: 0,
    elevation: 0,
    marginTop: 8,
  },
  saveBtnSuccess: {
    backgroundColor: Colors.primaryDark,
  },
  saveBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.onPrimary,
  },
  pressedSubtle: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  presetCardDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.surfaceContainer,
  },
  presetTextDisabled: {
    color: Colors.textDisabled,
  },
  teenNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.waterLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  teenNoticeText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.waterDark,
    flex: 1,
  },
});
