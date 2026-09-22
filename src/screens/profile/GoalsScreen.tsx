import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

interface GoalsScreenProps {
  onBack: () => void;
}

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export const GoalsScreen: React.FC<GoalsScreenProps> = ({ onBack }) => {
  const { userGoals, updateGoals } = useHealth();

  const [calorieBudget, setCalorieBudget] = useState(String(userGoals.dailyCalorieBudget || 1950));
  const [targetProtein, setTargetProtein] = useState(String(userGoals.targetProtein || 90));
  const [targetCarbs, setTargetCarbs] = useState(String(userGoals.targetCarbs || 160));
  const [targetFat, setTargetFat] = useState(String(userGoals.targetFat || 50));
  const [targetFiber, setTargetFiber] = useState(String(userGoals.targetFiber || 30));
  const [waterGoal, setWaterGoal] = useState(String(userGoals.waterGoalMl || 2500));
  const [stepGoal, setStepGoal] = useState(String(userGoals.stepGoal || 10000));
  const [currentWeight, setCurrentWeight] = useState(String(userGoals.currentWeightKg || 74.2));
  const [targetWeight, setTargetWeight] = useState(String(userGoals.targetWeightKg || 68.0));
  const [userHeightCm, setUserHeightCm] = useState(String(userGoals.heightCm || 175));
  const [activePreset, setActivePreset] = useState<'fat_loss' | 'muscle_gain' | 'maintenance'>('maintenance');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when userGoals changes
  useEffect(() => {
    setCalorieBudget(String(userGoals.dailyCalorieBudget || 1950));
    setTargetProtein(String(userGoals.targetProtein || 90));
    setTargetCarbs(String(userGoals.targetCarbs || 160));
    setTargetFat(String(userGoals.targetFat || 50));
    setTargetFiber(String(userGoals.targetFiber || 30));
    setWaterGoal(String(userGoals.waterGoalMl || 2500));
    setStepGoal(String(userGoals.stepGoal || 10000));
    setCurrentWeight(String(userGoals.currentWeightKg || 74.2));
    setTargetWeight(String(userGoals.targetWeightKg || 68.0));
    setUserHeightCm(String(userGoals.heightCm || 175));
  }, [userGoals]);

  // Live macro math
  const pGrams = parseInt(targetProtein, 10) || 0;
  const cGrams = parseInt(targetCarbs, 10) || 0;
  const fGrams = parseInt(targetFat, 10) || 0;
  const computedMacroCals = pGrams * 4 + cGrams * 4 + fGrams * 9;
  const currentBudget = parseInt(calorieBudget, 10) || 1950;
  const macroDiff = computedMacroCals - currentBudget;

  const proteinPct = Math.round(((pGrams * 4) / (computedMacroCals || 1)) * 100);
  const carbsPct = Math.round(((cGrams * 4) / (computedMacroCals || 1)) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  const applyPreset = (preset: 'fat_loss' | 'muscle_gain' | 'maintenance') => {
    setActivePreset(preset);
    if (preset === 'fat_loss') {
      setCalorieBudget('1650');
      setTargetProtein('90');
      setTargetCarbs('160');
      setTargetFat('40');
      setTargetFiber('30');
    } else if (preset === 'muscle_gain') {
      setCalorieBudget('2300');
      setTargetProtein('130');
      setTargetCarbs('260');
      setTargetFat('60');
      setTargetFiber('35');
    } else {
      setCalorieBudget('1950');
      setTargetProtein('75');
      setTargetCarbs('220');
      setTargetFat('50');
      setTargetFiber('30');
    }
  };

  const handleSave = () => {
    updateGoals({
      dailyCalorieBudget: parseInt(calorieBudget, 10) || userGoals.dailyCalorieBudget,
      targetProtein: parseInt(targetProtein, 10) || userGoals.targetProtein,
      targetCarbs: parseInt(targetCarbs, 10) || userGoals.targetCarbs,
      targetFat: parseInt(targetFat, 10) || userGoals.targetFat,
      targetFiber: parseInt(targetFiber, 10) || userGoals.targetFiber,
      waterGoalMl: parseInt(waterGoal, 10) || userGoals.waterGoalMl,
      stepGoal: parseInt(stepGoal, 10) || userGoals.stepGoal,
      currentWeightKg: parseFloat(currentWeight) || userGoals.currentWeightKg,
      targetWeightKg: parseFloat(targetWeight) || userGoals.targetWeightKg,
      heightCm: parseFloat(userHeightCm) || userGoals.heightCm,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onBack();
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 1. Unified Top Navigation Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [styles.headerBackBtn, pressed ? styles.btnPressed : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Go back to profile"
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Nutrition & Goals
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Calorie budget, macro splits & biometrics
            </Text>
          </View>

          {/* Quick Header Save Action */}
          <Pressable
            style={({ pressed }) => [
              styles.headerSaveBtn,
              savedSuccess ? styles.headerSaveBtnSuccess : null,
              pressed ? styles.btnPressed : null,
            ]}
            onPress={handleSave}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Save nutrition and activity goals"
          >
            <Ionicons
              name={savedSuccess ? 'checkmark' : 'save-outline'}
              size={15}
              color={savedSuccess ? '#16A34A' : Colors.primary}
            />
            <Text
              style={[
                styles.headerSaveBtnText,
                savedSuccess ? styles.headerSaveBtnTextSuccess : null,
              ]}
            >
              {savedSuccess ? 'Saved' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        {/* Goal Presets Row */}
        <Text style={styles.sectionHeader}>Goal Presets</Text>
        <View style={styles.presetsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.presetCard,
              activePreset === 'fat_loss' ? styles.presetCardActive : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => applyPreset('fat_loss')}
            accessibilityRole="button"
            accessibilityState={{ selected: activePreset === 'fat_loss' }}
            accessibilityLabel="Fat loss preset, 1650 kilocalories"
          >
            <View style={[styles.presetIconBox, styles.presetIconFatLoss]}>
              <Ionicons name="flame" size={16} color="#EA580C" />
            </View>
            <Text style={styles.presetName}>Fat Loss</Text>
            <Text style={styles.presetMeta}>1,650 kcal</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.presetCard,
              activePreset === 'muscle_gain' ? styles.presetCardActive : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => applyPreset('muscle_gain')}
            accessibilityRole="button"
            accessibilityState={{ selected: activePreset === 'muscle_gain' }}
            accessibilityLabel="Muscle gain preset, 2300 kilocalories"
          >
            <View style={[styles.presetIconBox, styles.presetIconMuscle]}>
              <Ionicons name="barbell" size={16} color="#16A34A" />
            </View>
            <Text style={styles.presetName}>Muscle Gain</Text>
            <Text style={styles.presetMeta}>2,300 kcal</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.presetCard,
              activePreset === 'maintenance' ? styles.presetCardActive : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => applyPreset('maintenance')}
            accessibilityRole="button"
            accessibilityState={{ selected: activePreset === 'maintenance' }}
            accessibilityLabel="Maintenance preset, 1950 kilocalories"
          >
            <View style={[styles.presetIconBox, styles.presetIconMaintain]}>
              <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
            </View>
            <Text style={styles.presetName}>Maintain</Text>
            <Text style={styles.presetMeta}>1,950 kcal</Text>
          </Pressable>
        </View>

        {/* Macro Energy Distribution Split Strip */}
        <View style={styles.macroSplitCard}>
          <View style={styles.macroSplitTop}>
            <Text style={styles.macroSplitTitle}>Macro Energy Distribution</Text>
            <Text style={styles.macroSplitSum}>{computedMacroCals} kcal</Text>
          </View>

          <View style={styles.macroBar}>
            <View style={[styles.macroBarSeg, styles.macroBarProtein, { flex: Math.max(1, proteinPct) }]} />
            <View style={[styles.macroBarSeg, styles.macroBarCarbs, { flex: Math.max(1, carbsPct) }]} />
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

          {Math.abs(macroDiff) > 50 ? (
            <View style={styles.diffWarning}>
              <Ionicons name="information-circle-outline" size={14} color="#D97706" />
              <Text style={styles.diffWarningText}>
                Macros sum to {computedMacroCals} kcal ({macroDiff > 0 ? `+${macroDiff}` : macroDiff} vs budget)
              </Text>
            </View>
          ) : null}
        </View>

        {/* Nutritional Targets Section */}
        <Text style={styles.sectionHeader}>Nutritional Targets</Text>
        <View style={styles.inputCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="flame-outline" size={18} color="#EA580C" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Daily Calorie Budget</Text>
              <Text style={styles.fieldSub}>Baseline daily target</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={calorieBudget}
              onChangeText={setCalorieBudget}
              placeholder="2000"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Daily calorie budget in kilocalories"
            />
            <Text style={styles.fieldUnit}>kcal</Text>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="fitness-outline" size={18} color="#10B981" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Protein</Text>
              <Text style={styles.fieldSub}>4 kcal / gram</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={targetProtein}
              onChangeText={setTargetProtein}
              placeholder="90"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target protein in grams"
            />
            <Text style={styles.fieldUnit}>g</Text>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="nutrition-outline" size={18} color="#F59E0B" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Carbohydrates</Text>
              <Text style={styles.fieldSub}>4 kcal / gram</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={targetCarbs}
              onChangeText={setTargetCarbs}
              placeholder="150"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target carbohydrates in grams"
            />
            <Text style={styles.fieldUnit}>g</Text>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="leaf-outline" size={18} color="#F47551" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Dietary Fat</Text>
              <Text style={styles.fieldSub}>9 kcal / gram</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={targetFat}
              onChangeText={setTargetFat}
              placeholder="50"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target dietary fat in grams"
            />
            <Text style={styles.fieldUnit}>g</Text>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="sparkles-outline" size={18} color="#16A34A" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Dietary Fiber</Text>
              <Text style={styles.fieldSub}>Gut health & fullness</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={targetFiber}
              onChangeText={setTargetFiber}
              placeholder="30"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target dietary fiber in grams"
            />
            <Text style={styles.fieldUnit}>g</Text>
          </View>
        </View>

        {/* Activity & Habits Section */}
        <Text style={styles.sectionHeader}>Activity & Habits</Text>
        <View style={styles.inputCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="water-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Water Intake</Text>
              <Text style={styles.fieldSub}>Daily hydration target</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={waterGoal}
              onChangeText={setWaterGoal}
              placeholder="2500"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target water intake in milliliters"
            />
            <Text style={styles.fieldUnit}>ml</Text>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="footsteps-outline" size={18} color="#059669" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Daily Steps</Text>
              <Text style={styles.fieldSub}>Movement milestone</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={stepGoal}
              onChangeText={setStepGoal}
              placeholder="10000"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Daily step target"
            />
            <Text style={styles.fieldUnit}>steps</Text>
          </View>
        </View>

        {/* Body Metrics Section */}
        <Text style={styles.sectionHeader}>Body Measurements</Text>
        <View style={styles.inputCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="scale-outline" size={18} color="#7C3AED" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Current Weight</Text>
              <Text style={styles.fieldSub}>Used for baseline BMR</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              value={currentWeight}
              onChangeText={setCurrentWeight}
              placeholder="74.2"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Current weight in kilograms"
            />
            <Text style={styles.fieldUnit}>kg</Text>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="flag-outline" size={18} color="#D97706" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Target Goal Weight</Text>
              <Text style={styles.fieldSub}>Trajectory destination</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder="68.0"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Target weight in kilograms"
            />
            <Text style={styles.fieldUnit}>kg</Text>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Ionicons name="body-outline" size={18} color="#475569" />
            </View>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Height</Text>
              <Text style={styles.fieldSub}>Clinical stature calculation</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              value={userHeightCm}
              onChangeText={setUserHeightCm}
              placeholder="175"
              autoComplete="off"
              importantForAutofill="no"
              underlineColorAndroid="transparent"
              accessibilityLabel="Height in centimeters"
            />
            <Text style={styles.fieldUnit}>cm</Text>
          </View>
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
            color="#FFFFFF"
          />
          <Text style={styles.saveBtnText}>
            {savedSuccess ? 'Goals Saved Successfully' : 'Save Goals'}
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
  headerContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    minHeight: 64,
    justifyContent: 'center',
    zIndex: 10,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFF1EE',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  headerSaveBtnSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  headerSaveBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerSaveBtnTextSuccess: {
    color: '#16A34A',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    lineHeight: 28,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginTop: 1,
    includeFontPadding: false,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 16,
  },
  sectionHeader: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  presetCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF9F8',
  },
  presetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  presetIconFatLoss: {
    backgroundColor: '#FFEDD5',
  },
  presetIconMuscle: {
    backgroundColor: '#DCFCE7',
  },
  presetIconMaintain: {
    backgroundColor: '#E0F2FE',
  },
  presetName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  presetMeta: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  macroSplitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  macroSplitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroSplitTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  macroSplitSum: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
  macroBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  macroBarSeg: {
    height: '100%',
  },
  macroBarProtein: {
    backgroundColor: '#10B981',
  },
  macroBarCarbs: {
    backgroundColor: '#F59E0B',
  },
  macroBarFat: {
    backgroundColor: '#F47551',
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
    backgroundColor: '#10B981',
  },
  legendDotCarbs: {
    backgroundColor: '#F59E0B',
  },
  legendDotFat: {
    backgroundColor: '#F47551',
  },
  legendText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#64748B',
  },
  diffWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
  },
  diffWarningText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#D97706',
    flex: 1,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  fieldIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fieldLabelContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  fieldSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  fieldInput: {
    width: 75,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
    width: 34,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    marginVertical: 6,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 8,
  },
  saveBtnSuccess: {
    backgroundColor: '#16A34A',
  },
  saveBtnText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressedSubtle: {
    opacity: 0.8,
  },
});
