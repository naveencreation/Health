import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useGoals } from '@/context/HealthContext';

interface GoalsModalSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const GoalsModalSheet: React.FC<GoalsModalSheetProps> = ({ visible, onClose }) => {
  const { userGoals, updateGoals } = useGoals();

  const [calorieBudget, setCalorieBudget] = useState(String(userGoals.dailyCalorieBudget));
  const [targetProtein, setTargetProtein] = useState(String(userGoals.targetProtein));
  const [targetCarbs, setTargetCarbs] = useState(String(userGoals.targetCarbs));
  const [targetFat, setTargetFat] = useState(String(userGoals.targetFat));
  const [targetFiber, setTargetFiber] = useState(String(userGoals.targetFiber));
  const [waterGoal, setWaterGoal] = useState(String(userGoals.waterGoalMl));
  const [stepGoal, setStepGoal] = useState(String(userGoals.stepGoal || 10000));
  const [currentWeight, setCurrentWeight] = useState(String(userGoals.currentWeightKg || 74.2));
  const [targetWeight, setTargetWeight] = useState(String(userGoals.targetWeightKg || 68.0));
  const [userHeightCm, setUserHeightCm] = useState(String(userGoals.heightCm || 175));
  const [activePreset, setActivePreset] = useState<'fat_loss' | 'muscle_gain' | 'maintenance'>('maintenance');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToOffset = (yOffset: number) => {
    scrollViewRef.current?.scrollTo({ y: Math.max(0, yOffset - 30), animated: true });
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, yOffset - 30), animated: true });
    }, 100);
  };

  // Synchronize state from userGoals whenever the modal is opened
  React.useEffect(() => {
    if (visible) {
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
    }
  }, [visible, userGoals]);

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
      onClose();
    }, 900);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close nutrition goals"
        />
        
        <View
          style={[
            styles.sheetContainer,
            keyboardHeight > 0 ? styles.sheetContainerKeyboard : null,
          ]}
        >
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragPill} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleStack}>
                <Text style={styles.sheetTitle}>Nutrition & Activity Goals</Text>
                <Text style={styles.sheetSubtitle}>Tune daily calories, macro splits, and targets</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedSubtle : null]}
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close nutrition goals"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.sheetScroll}
            contentContainerStyle={[
              styles.sheetScrollContent,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 140 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            {/* Presets Row */}
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

            {/* Macro Ratio Split Strip */}
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

            {/* Inputs Grid */}
            <Text style={styles.sectionHeader}>Nutritional Targets</Text>
            
            <View
              style={styles.inputCard}
              onLayout={(e) => {
                cardOffsets.current['nutrition'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconContainer}>
                  <Ionicons name="flame-outline" size={18} color="#EA580C" />
                </View>
                <View style={styles.fieldLabelContainer}>
                  <Text style={styles.fieldLabel}>Daily Calorie Budget</Text>
                  <Text style={styles.fieldSub}>Baseline dietary target</Text>
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
                  onFocus={() => scrollToOffset(cardOffsets.current['nutrition'] || 250)}
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
                  onFocus={() => scrollToOffset((cardOffsets.current['nutrition'] || 250) + 50)}
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
                  onFocus={() => scrollToOffset((cardOffsets.current['nutrition'] || 250) + 110)}
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
                  onFocus={() => scrollToOffset((cardOffsets.current['nutrition'] || 250) + 170)}
                  accessibilityLabel="Target dietary fat in grams"
                />
                <Text style={styles.fieldUnit}>g</Text>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Activity & Habits</Text>
            
            <View
              style={styles.inputCard}
              onLayout={(e) => {
                cardOffsets.current['activity'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconContainer}>
                  <Ionicons name="water-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.fieldLabelContainer}>
                  <Text style={styles.fieldLabel}>Water Intake</Text>
                  <Text style={styles.fieldSub}>Hydration volume</Text>
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
                  onFocus={() => scrollToOffset(cardOffsets.current['activity'] || 480)}
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
                  <Text style={styles.fieldSub}>Movement goal</Text>
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
                  onFocus={() => scrollToOffset((cardOffsets.current['activity'] || 480) + 60)}
                  accessibilityLabel="Daily step target"
                />
                <Text style={styles.fieldUnit}>steps</Text>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Body Measurements</Text>
            
            <View
              style={styles.inputCard}
              onLayout={(e) => {
                cardOffsets.current['body'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconContainer}>
                  <Ionicons name="scale-outline" size={18} color="#0284C7" />
                </View>
                <View style={styles.fieldLabelContainer}>
                  <Text style={styles.fieldLabel}>Current Weight</Text>
                  <Text style={styles.fieldSub}>Latest weigh-in</Text>
                </View>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                  placeholder="74.2"
                  autoComplete="off"
                  importantForAutofill="no"
                  underlineColorAndroid="transparent"
                  onFocus={() => scrollToOffset(cardOffsets.current['body'] || 680)}
                  accessibilityLabel="Current weight in kilograms"
                />
                <Text style={styles.fieldUnit}>kg</Text>
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldRow}>
                <View style={styles.fieldIconContainer}>
                  <Ionicons name="body-outline" size={18} color="#F59E0B" />
                </View>
                <View style={styles.fieldLabelContainer}>
                  <Text style={styles.fieldLabel}>Height</Text>
                  <Text style={styles.fieldSub}>For clinical BMI & BMR</Text>
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
                  onFocus={() => scrollToOffset((cardOffsets.current['body'] || 680) + 60)}
                  accessibilityLabel="Height in centimeters"
                />
                <Text style={styles.fieldUnit}>cm</Text>
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldRow}>
                <View style={styles.fieldIconContainer}>
                  <Ionicons name="flag-outline" size={18} color="#8B5CF6" />
                </View>
                <View style={styles.fieldLabelContainer}>
                  <Text style={styles.fieldLabel}>Target Goal Weight</Text>
                  <Text style={styles.fieldSub}>Desired milestone</Text>
                </View>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  placeholder="68.0"
                  autoComplete="off"
                  importantForAutofill="no"
                  underlineColorAndroid="transparent"
                  onFocus={() => scrollToOffset((cardOffsets.current['body'] || 680) + 120)}
                  accessibilityLabel="Target goal weight in kilograms"
                />
                <Text style={styles.fieldUnit}>kg</Text>
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                savedSuccess ? styles.saveBtnSuccess : null,
                pressed ? styles.saveBtnPressed : null,
              ]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel={savedSuccess ? 'Goals saved' : 'Save goal changes'}
            >
              <Ionicons
                name={savedSuccess ? 'checkmark-circle' : 'checkmark-sharp'}
                size={18}
                color="#FFFFFF"
                style={styles.saveBtnIcon}
              />
              <Text style={styles.saveBtnText}>
                {savedSuccess ? 'Goals Saved!' : 'Save Goal Changes'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  sheetContainerKeyboard: {
    maxHeight: '98%',
    height: '98%',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitleStack: {
    flex: 1,
  },
  sheetTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedSubtle: {
    opacity: 0.75,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  sectionHeader: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  presetCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  presetCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  presetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  presetName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#0F172A',
  },
  presetMeta: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  macroSplitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  macroSplitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  macroSplitTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  macroSplitSum: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
  macroBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  macroBarSeg: {
    height: '100%',
  },
  macroLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  diffWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
  },
  diffWarningText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#B45309',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  fieldIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fieldLabelContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#0F172A',
  },
  fieldSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  fieldInput: {
    width: 80,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderCurve: 'continuous',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
    color: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  fieldUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
    width: 34,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 50,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  saveBtnSuccess: {
    backgroundColor: '#059669',
  },
  saveBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  saveBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
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
  macroBarProtein: {
    backgroundColor: '#10B981',
  },
  macroBarCarbs: {
    backgroundColor: '#F59E0B',
  },
  macroBarFat: {
    backgroundColor: '#F47551',
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
  saveBtnIcon: {
    marginRight: 6,
  },
});
