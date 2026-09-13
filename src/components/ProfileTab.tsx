import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { useHealth } from '../context/HealthContext';
import { AvatarPickerModal } from './AvatarPickerModal';
import { DEFAULT_AVATAR_URL } from '../data/avatars';

type ProfileSubTab = 'goals' | 'body' | 'settings';

export const ProfileTab: React.FC = () => {
  const { userGoals, updateGoals } = useHealth();

  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('goals');
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

  // Core Goal Inputs
  const [name, setName] = useState(userGoals.name);
  const [calorieBudget, setCalorieBudget] = useState(String(userGoals.dailyCalorieBudget));
  const [targetProtein, setTargetProtein] = useState(String(userGoals.targetProtein));
  const [targetCarbs, setTargetCarbs] = useState(String(userGoals.targetCarbs));
  const [targetFat, setTargetFat] = useState(String(userGoals.targetFat));
  const [targetFiber, setTargetFiber] = useState(String(userGoals.targetFiber));
  const [waterGoal, setWaterGoal] = useState(String(userGoals.waterGoalMl));
  const [stepGoal, setStepGoal] = useState(String(userGoals.stepGoal));
  const [currentWeight, setCurrentWeight] = useState(String(userGoals.currentWeightKg));
  const [targetWeight, setTargetWeight] = useState(String(userGoals.targetWeightKg));
  const [userHeightCm, setUserHeightCm] = useState('178');

  // App & AI Preferences State
  const [riaTone, setRiaTone] = useState<'supportive' | 'focused' | 'scientific'>('supportive');
  const [waterReminder, setWaterReminder] = useState(true);
  const [mealReminder, setMealReminder] = useState(true);
  const [stepReminder, setStepReminder] = useState(false);
  const [activePreset, setActivePreset] = useState<'fat_loss' | 'muscle_gain' | 'maintenance'>('maintenance');

  const [savedMessage, setSavedMessage] = useState(false);

  // Live Calculations
  const pGrams = parseInt(targetProtein) || 0;
  const cGrams = parseInt(targetCarbs) || 0;
  const fGrams = parseInt(targetFat) || 0;
  const computedMacroCals = pGrams * 4 + cGrams * 4 + fGrams * 9;
  const currentBudget = parseInt(calorieBudget) || 1950;
  const macroDiff = computedMacroCals - currentBudget;

  const totalMacroGrams = pGrams + cGrams + fGrams || 1;
  const proteinPct = Math.round(((pGrams * 4) / (computedMacroCals || 1)) * 100);
  const carbsPct = Math.round(((cGrams * 4) / (computedMacroCals || 1)) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  // Body Composition Math
  const weightNum = parseFloat(currentWeight) || 74.2;
  const targetWeightNum = parseFloat(targetWeight) || 68.0;
  const heightNum = parseFloat(userHeightCm) || 178;
  const heightM = heightNum / 100;
  const bmi = (weightNum / (heightM * heightM)).toFixed(1);
  const bmiNum = parseFloat(bmi);

  const getBmiStatus = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (val < 25) return { label: 'Healthy Weight 🟢', color: '#10B981' };
    if (val < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
  };

  const bmiStatus = getBmiStatus(bmiNum);
  const bmrEst = Math.round(10 * weightNum + 6.25 * heightNum - 5 * 28 + 5); // Mifflin-St Jeor
  const tdeeEst = Math.round(bmrEst * 1.375); // Light activity
  const startWeight = 78.0;
  const totalToLose = Math.max(0.1, startWeight - targetWeightNum);
  const lostSoFar = Math.max(0, startWeight - weightNum);
  const weightProgressPct = Math.min(100, Math.round((lostSoFar / totalToLose) * 100));

  const handleSave = () => {
    updateGoals({
      name: name.trim() || 'Akshay Rajput',
      dailyCalorieBudget: parseInt(calorieBudget) || 1950,
      targetProtein: parseInt(targetProtein) || 75,
      targetCarbs: parseInt(targetCarbs) || 220,
      targetFat: parseInt(targetFat) || 50,
      targetFiber: parseInt(targetFiber) || 30,
      waterGoalMl: parseInt(waterGoal) || 2500,
      stepGoal: parseInt(stepGoal) || 10000,
      currentWeightKg: weightNum,
      targetWeightKg: targetWeightNum,
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO MEMBER PROFILE CARD */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setAvatarPickerVisible(true)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={{
                uri: userGoals.avatarUrl || DEFAULT_AVATAR_URL,
              }}
              style={styles.avatarImg}
            />
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{name || 'Akshay Rajput'}</Text>
            <Text style={styles.heroEmail}>akshay.rajput@calori.fit</Text>
            <View style={styles.badgesRow}>
              <View style={styles.proBadge}>
                <Ionicons name="sparkles" size={11} color="#B45309" />
                <Text style={styles.proBadgeText}>PRO VIP</Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>🔥 7-Day Streak</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Body Stats Grid Strip */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCol}>
            <Text style={styles.quickStatVal}>{weightNum} <Text style={styles.quickStatUnit}>kg</Text></Text>
            <Text style={styles.quickStatKey}>Current</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCol}>
            <Text style={styles.quickStatVal}>{targetWeightNum} <Text style={styles.quickStatUnit}>kg</Text></Text>
            <Text style={styles.quickStatKey}>Target</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCol}>
            <Text style={[styles.quickStatVal, { color: bmiStatus.color }]}>{bmi}</Text>
            <Text style={styles.quickStatKey}>BMI</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCol}>
            <Text style={[styles.quickStatVal, { color: Colors.primary }]}>{calorieBudget}</Text>
            <Text style={styles.quickStatKey}>kcal/day</Text>
          </View>
        </View>
      </View>

      {/* 2. SUB-TAB SEGMENT CONTROLLER */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSubTab === 'goals' && styles.segmentBtnActive]}
          onPress={() => setActiveSubTab('goals')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="flame"
            size={15}
            color={activeSubTab === 'goals' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeSubTab === 'goals' && styles.segmentBtnTextActive,
            ]}
          >
            Nutrition Goals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSubTab === 'body' && styles.segmentBtnActive]}
          onPress={() => setActiveSubTab('body')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="scale"
            size={15}
            color={activeSubTab === 'body' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeSubTab === 'body' && styles.segmentBtnTextActive,
            ]}
          >
            Body & BMI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSubTab === 'settings' && styles.segmentBtnActive]}
          onPress={() => setActiveSubTab('settings')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="options"
            size={15}
            color={activeSubTab === 'settings' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeSubTab === 'settings' && styles.segmentBtnTextActive,
            ]}
          >
            AI & Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* SUB-TAB 1: NUTRITION GOALS & BUDGETS                     */}
      {/* ========================================================= */}
      {activeSubTab === 'goals' && (
        <>
          {/* Quick Presets Section */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Goal Presets</Text>
                <Text style={styles.cardSubtitle}>Auto-tune calorie & macronutrient targets</Text>
              </View>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="sparkles-outline" size={18} color={Colors.primary} />
              </View>
            </View>

            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  activePreset === 'fat_loss' && styles.presetBtnSelected,
                ]}
                onPress={() => applyPreset('fat_loss')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetEmoji}>🔥</Text>
                <Text style={styles.presetLabel}>Fat Loss</Text>
                <Text style={styles.presetMeta}>1,650 kcal</Text>
                <Text style={styles.presetSplit}>40C • 30P • 30F</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  activePreset === 'muscle_gain' && styles.presetBtnSelected,
                ]}
                onPress={() => applyPreset('muscle_gain')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetEmoji}>💪</Text>
                <Text style={styles.presetLabel}>Muscle Build</Text>
                <Text style={styles.presetMeta}>2,300 kcal</Text>
                <Text style={styles.presetSplit}>45C • 30P • 25F</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  activePreset === 'maintenance' && styles.presetBtnSelected,
                ]}
                onPress={() => applyPreset('maintenance')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetEmoji}>⚖️</Text>
                <Text style={styles.presetLabel}>Balanced</Text>
                <Text style={styles.presetMeta}>1,950 kcal</Text>
                <Text style={styles.presetSplit}>50C • 20P • 30F</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Macro Ratio Split Bar Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Macronutrient Calorie Split</Text>
                <Text style={styles.cardSubtitle}>Energy proportion breakdown from target grams</Text>
              </View>
              <Text style={styles.totalMacroGramsText}>{totalMacroGrams}g total</Text>
            </View>

            {/* Segmented Color Bar */}
            <View style={styles.macroSplitBar}>
              <View style={[styles.macroSplitSeg, { width: `${carbsPct}%`, backgroundColor: Colors.carbs }]} />
              <View style={[styles.macroSplitSeg, { width: `${proteinPct}%`, backgroundColor: Colors.protein }]} />
              <View style={[styles.macroSplitSeg, { width: `${fatPct}%`, backgroundColor: Colors.fat }]} />
            </View>

            {/* Legend Pills */}
            <View style={styles.macroLegendRow}>
              <View style={styles.macroLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.carbs }]} />
                <Text style={styles.legendText}>Carbs: {carbsPct}% ({cGrams}g)</Text>
              </View>
              <View style={styles.macroLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.protein }]} />
                <Text style={styles.legendText}>Protein: {proteinPct}% ({pGrams}g)</Text>
              </View>
              <View style={styles.macroLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.fat }]} />
                <Text style={styles.legendText}>Fat: {fatPct}% ({fGrams}g)</Text>
              </View>
            </View>

            {/* Live Macro Energy Math Consistency Audit */}
            <View style={styles.macroAuditBox}>
              <View style={styles.macroAuditHeader}>
                <Text style={styles.macroAuditTitle}>Macro Energy Sum</Text>
                <Text style={styles.macroAuditVal}>{computedMacroCals} kcal</Text>
              </View>
              <Text style={styles.macroAuditSub}>
                Protein ({pGrams * 4} kcal) + Carbs ({cGrams * 4} kcal) + Fat ({fGrams * 9} kcal)
              </Text>
              <View
                style={[
                  styles.macroMatchBadge,
                  Math.abs(macroDiff) <= 50 ? styles.matchBadgeOk : styles.matchBadgeWarn,
                ]}
              >
                <Ionicons
                  name={Math.abs(macroDiff) <= 50 ? 'checkmark-circle' : 'alert-circle'}
                  size={14}
                  color={Math.abs(macroDiff) <= 50 ? '#059669' : '#D97706'}
                />
                <Text
                  style={[
                    styles.matchBadgeText,
                    { color: Math.abs(macroDiff) <= 50 ? '#059669' : '#D97706' },
                  ]}
                >
                  {Math.abs(macroDiff) <= 50
                    ? 'Macros align with your calorie budget 🎯'
                    : `${Math.abs(macroDiff)} kcal ${macroDiff > 0 ? 'over' : 'under'} daily budget`}
                </Text>
              </View>
            </View>
          </View>

          {/* Detailed Input Targets Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Custom Daily Targets</Text>
            <Text style={styles.cardSubtitle}>Configure exact targets tailored to your lifestyle</Text>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Display Name</Text>
              </View>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
            </View>

            {/* Calorie Budget */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Ionicons name="flame" size={14} color="#EA580C" style={{ marginRight: 4 }} />
                <Text style={styles.fieldLabel}>Daily Calorie Budget</Text>
                <Text style={styles.fieldUnit}>kcal / day</Text>
              </View>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={calorieBudget}
                onChangeText={setCalorieBudget}
              />
            </View>

            {/* Protein & Carbs Row */}
            <View style={styles.grid2}>
              <View style={styles.flex1}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="restaurant" size={14} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={styles.fieldLabel}>Protein</Text>
                  <Text style={styles.fieldUnit}>g</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={targetProtein}
                  onChangeText={setTargetProtein}
                />
              </View>

              <View style={styles.flex1}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="pizza" size={14} color="#EAB308" style={{ marginRight: 4 }} />
                  <Text style={styles.fieldLabel}>Carbs</Text>
                  <Text style={styles.fieldUnit}>g</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={targetCarbs}
                  onChangeText={setTargetCarbs}
                />
              </View>
            </View>

            {/* Fat & Fiber Row */}
            <View style={styles.grid2}>
              <View style={styles.flex1}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="water" size={14} color="#F47551" style={{ marginRight: 4 }} />
                  <Text style={styles.fieldLabel}>Fat</Text>
                  <Text style={styles.fieldUnit}>g</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={targetFat}
                  onChangeText={setTargetFat}
                />
              </View>

              <View style={styles.flex1}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="leaf" size={14} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.fieldLabel}>Dietary Fiber</Text>
                  <Text style={styles.fieldUnit}>g</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={targetFiber}
                  onChangeText={setTargetFiber}
                />
              </View>
            </View>

            {/* Water & Step Goal Row */}
            <View style={styles.grid2}>
              <View style={styles.flex1}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="water-outline" size={14} color="#2563EB" style={{ marginRight: 4 }} />
                  <Text style={styles.fieldLabel}>Water Target</Text>
                  <Text style={styles.fieldUnit}>ml</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={waterGoal}
                  onChangeText={setWaterGoal}
                />
              </View>

              <View style={styles.flex1}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="footsteps" size={14} color="#EA580C" style={{ marginRight: 4 }} />
                  <Text style={styles.fieldLabel}>Step Goal</Text>
                  <Text style={styles.fieldUnit}>steps</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={stepGoal}
                  onChangeText={setStepGoal}
                />
              </View>
            </View>
          </View>
        </>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: BODY METRICS, BMI & WEIGHT TIMELINE           */}
      {/* ========================================================= */}
      {activeSubTab === 'body' && (
        <>
          {/* Weight Progress Journey Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Weight Journey & Timeline</Text>
                <Text style={styles.cardSubtitle}>Progress from starting weight to target</Text>
              </View>
              <View style={styles.progressPctBadge}>
                <Text style={styles.progressPctBadgeText}>{weightProgressPct}% Done</Text>
              </View>
            </View>

            {/* Progress Track */}
            <View style={styles.weightTrackContainer}>
              <View style={styles.weightTrackBackground}>
                <View style={[styles.weightTrackFill, { width: `${weightProgressPct}%` }]} />
              </View>
              <View style={styles.weightTrackMilestones}>
                <Text style={styles.milestoneText}>Start: {startWeight} kg</Text>
                <Text style={styles.milestoneTextHighlight}>Current: {weightNum} kg</Text>
                <Text style={styles.milestoneText}>Goal: {targetWeightNum} kg</Text>
              </View>
            </View>

            <View style={styles.weightSummaryPill}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.weightSummaryText}>
                Lost <Text style={styles.boldText}>{lostSoFar.toFixed(1)} kg</Text> so far •{' '}
                <Text style={styles.boldText}>{(weightNum - targetWeightNum).toFixed(1)} kg remaining</Text>
              </Text>
            </View>

            {/* Weight Inputs */}
            <View style={styles.grid2}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Current Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                />
              </View>

              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Target Goal Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                />
              </View>
            </View>
          </View>

          {/* BMI Health Gauge Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Body Mass Index (BMI)</Text>
                <Text style={styles.cardSubtitle}>Clinical indicator of healthy body composition</Text>
              </View>
              <View style={[styles.bmiPill, { backgroundColor: bmiStatus.color + '20' }]}>
                <Text style={[styles.bmiPillText, { color: bmiStatus.color }]}>{bmiStatus.label}</Text>
              </View>
            </View>

            {/* Large BMI Number */}
            <View style={styles.bmiNumberRow}>
              <Text style={[styles.bmiBigNumber, { color: bmiStatus.color }]}>{bmi}</Text>
              <Text style={styles.bmiUnit}>kg/m²</Text>
            </View>

            {/* 4-Color Category Bar */}
            <View style={styles.bmiBarWrapper}>
              <View style={[styles.bmiBarSeg, { backgroundColor: '#3B82F6', flex: 18.5 }]} />
              <View style={[styles.bmiBarSeg, { backgroundColor: '#10B981', flex: 6.4 }]} />
              <View style={[styles.bmiBarSeg, { backgroundColor: '#F59E0B', flex: 5 }]} />
              <View style={[styles.bmiBarSeg, { backgroundColor: '#EF4444', flex: 10 }]} />
            </View>
            <View style={styles.bmiLabelsRow}>
              <Text style={styles.bmiRangeText}>&lt;18.5 Under</Text>
              <Text style={[styles.bmiRangeText, { color: '#10B981', fontWeight: '700' }]}>18.5–24.9 Normal</Text>
              <Text style={styles.bmiRangeText}>25–29.9 Over</Text>
              <Text style={styles.bmiRangeText}>30+ Obese</Text>
            </View>

            {/* Height Input */}
            <View style={[styles.fieldGroup, { marginTop: 14 }]}>
              <Text style={styles.fieldLabel}>Your Height (cm)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={userHeightCm}
                onChangeText={setUserHeightCm}
              />
            </View>
          </View>

          {/* Metabolic Engine (BMR & TDEE) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Metabolic Energy Engine</Text>
            <Text style={styles.cardSubtitle}>Scientific calculation of your daily calorie burn</Text>

            <View style={styles.metabolicRow}>
              <View style={styles.metabolicBox}>
                <Text style={styles.metabolicVal}>{bmrEst} <Text style={styles.metabolicUnit}>kcal</Text></Text>
                <Text style={styles.metabolicLabel}>Basal Metabolic Rate</Text>
                <Text style={styles.metabolicDesc}>Burned passively at complete rest</Text>
              </View>

              <View style={styles.metabolicBox}>
                <Text style={[styles.metabolicVal, { color: Colors.primary }]}>
                  {tdeeEst} <Text style={styles.metabolicUnit}>kcal</Text>
                </Text>
                <Text style={styles.metabolicLabel}>Total Daily Burn (TDEE)</Text>
                <Text style={styles.metabolicDesc}>With your normal daily movement</Text>
              </View>
            </View>

            <View style={styles.deficitBanner}>
              <Ionicons name="trending-down" size={16} color="#EA580C" />
              <Text style={styles.deficitBannerText}>
                Your <Text style={styles.boldText}>{calorieBudget} kcal</Text> budget produces a{' '}
                <Text style={[styles.boldText, { color: '#10B981' }]}>
                  {Math.max(0, tdeeEst - currentBudget)} kcal daily deficit
                </Text>{' '}
                (~0.5 kg fat loss/week).
              </Text>
            </View>
          </View>
        </>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: AI COACH & APP PREFERENCES                     */}
      {/* ========================================================= */}
      {activeSubTab === 'settings' && (
        <>
          {/* Ria AI Coach Personality */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Ria AI Coaching Style</Text>
                <Text style={styles.cardSubtitle}>Customize how Ria interacts and motivates you</Text>
              </View>
              <View style={[styles.iconBadge, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="chatbubbles" size={16} color="#2563EB" />
              </View>
            </View>

            <View style={styles.personalityCol}>
              <TouchableOpacity
                style={[
                  styles.personalityCard,
                  riaTone === 'supportive' && styles.personalityCardActive,
                ]}
                onPress={() => setRiaTone('supportive')}
                activeOpacity={0.8}
              >
                <Text style={styles.personalityEmoji}>🌟</Text>
                <View style={styles.flex1}>
                  <Text style={styles.personalityTitle}>Warm & Encouraging</Text>
                  <Text style={styles.personalityDesc}>
                    Celebrates streaks, offers gentle reminders, and focuses on positive reinforcement.
                  </Text>
                </View>
                {riaTone === 'supportive' && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.personalityCard,
                  riaTone === 'focused' && styles.personalityCardActive,
                ]}
                onPress={() => setRiaTone('focused')}
                activeOpacity={0.8}
              >
                <Text style={styles.personalityEmoji}>🎯</Text>
                <View style={styles.flex1}>
                  <Text style={styles.personalityTitle}>Disciplined & Direct</Text>
                  <Text style={styles.personalityDesc}>
                    Firm accountability, timely notifications, and zero sugarcoating of calorie overages.
                  </Text>
                </View>
                {riaTone === 'focused' && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.personalityCard,
                  riaTone === 'scientific' && styles.personalityCardActive,
                ]}
                onPress={() => setRiaTone('scientific')}
                activeOpacity={0.8}
              >
                <Text style={styles.personalityEmoji}>🔬</Text>
                <View style={styles.flex1}>
                  <Text style={styles.personalityTitle}>Nutritional Scientist</Text>
                  <Text style={styles.personalityDesc}>
                    Deep analytical insights on glycemic index, micronutrients, and metabolic recovery.
                  </Text>
                </View>
                {riaTone === 'scientific' && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Reminders & Notifications */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Smart Reminders</Text>
            <Text style={styles.cardSubtitle}>Timely prompts to keep your habits consistent</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="water-outline" size={20} color="#2563EB" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.settingTitle}>Hydration Prompts</Text>
                  <Text style={styles.settingSubtitle}>Every 2 hours during active daytime</Text>
                </View>
              </View>
              <Switch
                value={waterReminder}
                onValueChange={setWaterReminder}
                trackColor={{ false: '#E2E8F0', true: Colors.primaryLight }}
                thumbColor={waterReminder ? Colors.primary : '#FFFFFF'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="restaurant-outline" size={20} color="#10B981" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.settingTitle}>Meal Logging Check-in</Text>
                  <Text style={styles.settingSubtitle}>Reminders at 1:30 PM and 8:30 PM</Text>
                </View>
              </View>
              <Switch
                value={mealReminder}
                onValueChange={setMealReminder}
                trackColor={{ false: '#E2E8F0', true: Colors.primaryLight }}
                thumbColor={mealReminder ? Colors.primary : '#FFFFFF'}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="footsteps-outline" size={20} color="#EA580C" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.settingTitle}>Evening Step Target Check</Text>
                  <Text style={styles.settingSubtitle}>Summary notification at 8:00 PM</Text>
                </View>
              </View>
              <Switch
                value={stepReminder}
                onValueChange={setStepReminder}
                trackColor={{ false: '#E2E8F0', true: Colors.primaryLight }}
                thumbColor={stepReminder ? Colors.primary : '#FFFFFF'}
              />
            </View>
          </View>

          {/* Connected Services & Devices */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connected Services</Text>
            <Text style={styles.cardSubtitle}>Sync health data with external sensors</Text>

            <View style={styles.serviceRow}>
              <View style={styles.serviceLeft}>
                <Ionicons name="fitness" size={22} color="#EF4444" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.serviceName}>Apple Health / Health Connect</Text>
                  <Text style={styles.serviceStatus}>Steps & active calories syncing</Text>
                </View>
              </View>
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeText}>Connected 🟢</Text>
              </View>
            </View>

            <View style={[styles.serviceRow, { borderBottomWidth: 0 }]}>
              <View style={styles.serviceLeft}>
                <Ionicons name="cloud-download-outline" size={22} color="#6366F1" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.serviceName}>Export 30-Day Nutrition Log</Text>
                  <Text style={styles.serviceStatus}>Download CSV for doctor or dietitian</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
                <Text style={styles.exportBtnText}>Export</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Confirmation Toast Message */}
      {savedMessage && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={18} color="#059669" />
          <Text style={styles.successText}>Profile & goals saved successfully!</Text>
        </View>
      )}

      {/* Primary Sticky-Style Save CTA Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.saveBtnText}>Save Goals & Preferences</Text>
      </TouchableOpacity>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        visible={avatarPickerVisible}
        currentAvatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
        onClose={() => setAvatarPickerVisible(false)}
        onSelectAvatar={(newUrl) => updateGoals({ avatarUrl: newUrl })}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },

  // 1. Hero Member Profile Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontFamily: Fonts.kurale,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  heroEmail: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  proBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: '#B45309',
  },
  streakBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  streakBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#EA580C',
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  quickStatUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  quickStatKey: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  quickStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  // 2. Sub-tab Segment Controller
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    fontFamily: Fonts.poppins.semiBold,
    color: Colors.primary,
  },

  // Common Cards
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Presets
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  presetBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  presetEmoji: {
    fontSize: 22,
  },
  presetLabel: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  presetMeta: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
  },
  presetSplit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Macro Split Bar
  totalMacroGramsText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  macroSplitBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#E2E8F0',
  },
  macroSplitSeg: {
    height: '100%',
  },
  macroLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  macroLegendItem: {
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
    fontSize: 10,
    color: Colors.textSecondary,
  },

  // Macro Audit Box
  macroAuditBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  macroAuditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroAuditTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  macroAuditVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: Colors.primary,
  },
  macroAuditSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  macroMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  matchBadgeOk: {
    backgroundColor: '#ECFDF5',
  },
  matchBadgeWarn: {
    backgroundColor: '#FEF3C7',
  },
  matchBadgeText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
  },

  // Inputs & Fields
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fieldUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 4,
  },
  input: {
    fontFamily: Fonts.poppins.regular,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  flex1: {
    flex: 1,
  },

  // Body & Weight Tab Styles
  progressPctBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressPctBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    color: '#059669',
  },
  weightTrackContainer: {
    marginVertical: 12,
  },
  weightTrackBackground: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  weightTrackFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  weightTrackMilestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  milestoneText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  milestoneTextHighlight: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: Colors.primary,
  },
  weightSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
  },
  weightSummaryText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#065F46',
  },
  boldText: {
    fontFamily: Fonts.poppins.bold,
  },

  // BMI Styles
  bmiPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bmiPillText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
  },
  bmiNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 6,
  },
  bmiBigNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 32,
  },
  bmiUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  bmiBarWrapper: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  bmiBarSeg: {
    height: '100%',
  },
  bmiLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bmiRangeText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9,
    color: Colors.textSecondary,
  },

  // Metabolic Row
  metabolicRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  metabolicBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metabolicVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  metabolicUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  metabolicLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  metabolicDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deficitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  deficitBannerText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#C2410C',
    flex: 1,
  },

  // Settings & Ria Styles
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalityCol: {
    gap: 10,
    marginTop: 8,
  },
  personalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  personalityCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  personalityEmoji: {
    fontSize: 22,
  },
  personalityTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  personalityDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  serviceStatus: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  syncBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: '#059669',
  },
  exportBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#2563EB',
  },

  // Save Flow
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12,
    color: '#059669',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
    fontSize: 15,
  },
});
