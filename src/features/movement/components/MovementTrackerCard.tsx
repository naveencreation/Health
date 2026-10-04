import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useMovement } from '../hooks/useMovement';
import { WorkoutActivity } from '@/types';

// Curated quick workout presets with calorie-burn-per-minute (cpm)
const QUICK_WORKOUTS = [
  { name: 'Brisk Walk', mins: 30, cals: 130, cpm: 4.33, icon: 'walk-outline' as const },
  { name: 'Gym / Weights', mins: 45, cals: 220, cpm: 4.88, icon: 'barbell-outline' as const },
  { name: 'Running', mins: 25, cals: 240, cpm: 9.6, icon: 'speedometer-outline' as const },
  { name: 'Yoga & Stretch', mins: 35, cals: 110, cpm: 3.14, icon: 'body-outline' as const },
  { name: 'Cycling', mins: 30, cals: 190, cpm: 6.33, icon: 'bicycle-outline' as const },
  { name: 'Swimming', mins: 30, cals: 240, cpm: 8.0, icon: 'water-outline' as const },
  { name: 'HIIT & Cardio', mins: 20, cals: 180, cpm: 9.0, icon: 'flash-outline' as const },
  { name: 'Badminton', mins: 40, cals: 220, cpm: 5.5, icon: 'tennisball-outline' as const },
];

const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };

// Contextual workout emoji generator
const getWorkoutIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('walk')) return '🚶';
  if (lower.includes('gym') || lower.includes('weight') || lower.includes('lift') || lower.includes('strength')) return '🏋️';
  if (lower.includes('run') || lower.includes('jog') || lower.includes('sprint')) return '🏃';
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('pilates')) return '🧘';
  if (lower.includes('cycl') || lower.includes('bike') || lower.includes('spin')) return '🚴';
  if (lower.includes('swim')) return '🏊';
  if (lower.includes('hiit') || lower.includes('crossfit') || lower.includes('cardio')) return '⚡';
  if (lower.includes('badminton') || lower.includes('tennis')) return '🏸';
  return '🔥';
};

// Friendly format for activity timestamp
const formatActivityTime = (loggedAt?: string): string => {
  if (!loggedAt) return '';
  try {
    const d = new Date(loggedAt);
    if (isNaN(d.getTime())) return '';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
    return `${hours}:${minutesStr} ${ampm}`;
  } catch {
    return '';
  }
};

const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    Haptics.impactAsync(style).catch(() => {});
  } catch {
    // Non-fatal fallback for environments where haptics are unavailable
  }
};

export interface MovementTrackerCardProps {
  onPressHeader?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const MovementTrackerCardComponent: React.FC<MovementTrackerCardProps> = ({
  onPressHeader,
  style,
  testID = 'daily-habits-card',
}) => {
  const {
    steps,
    stepGoal,
    barPercent,
    actualStepPercent,
    isGoalReached,
    distanceKm,
    stepBurnKcal,
    workoutBurnKcal,
    activities,
    addSteps,
    addWorkout,
    removeWorkout,
  } = useMovement();

  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDuration, setCustomDuration] = useState('30');
  const [customCalories, setCustomCalories] = useState('150');
  const [activePresetCpm, setActivePresetCpm] = useState<number>(5.0);

  // Smooth Reanimated fill for progress bar
  const progressSV = useSharedValue(0);

  useEffect(() => {
    progressSV.value = withTiming(barPercent, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [barPercent, progressSV]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progressSV.value}%`,
  }));

  // Step steppers with haptic feedback
  const handleMinusSteps = useCallback(() => {
    if (steps > 0) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      const deduct = Math.min(1000, steps);
      addSteps(-deduct);
    }
  }, [addSteps, steps]);

  const handlePlusSteps = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    addSteps(1000);
  }, [addSteps]);

  // Workout logging handlers
  const handleOpenAddWorkoutModal = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingActivityId(null);
    setCustomName('');
    setCustomDuration('30');
    setCustomCalories('150');
    setActivePresetCpm(5.0);
    setWorkoutModalVisible(true);
  }, []);

  const handleEditWorkout = useCallback((act: WorkoutActivity) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingActivityId(act.id);
    setCustomName(act.name);
    setCustomDuration(String(act.durationMinutes));
    setCustomCalories(String(act.caloriesBurned));
    const matchingPreset = QUICK_WORKOUTS.find(
      (p) => p.name.toLowerCase() === act.name.toLowerCase()
    );
    setActivePresetCpm(matchingPreset ? matchingPreset.cpm : 5.0);
    setWorkoutModalVisible(true);
  }, []);

  const handleSelectQuickWorkout = useCallback((item: typeof QUICK_WORKOUTS[number]) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    addWorkout(item.name, item.mins, item.cals);
    setWorkoutModalVisible(false);
  }, [addWorkout]);

  // Proportional calorie calculation when duration changes
  const handleDurationChange = useCallback((text: string) => {
    setCustomDuration(text);
    const parsedMins = parseInt(text, 10);
    if (!isNaN(parsedMins) && parsedMins > 0) {
      const autoCal = Math.round(parsedMins * activePresetCpm);
      setCustomCalories(String(autoCal));
    }
  }, [activePresetCpm]);

  const handleSaveWorkout = useCallback(() => {
    if (!customName.trim()) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const name = customName.trim();
    const duration = parseInt(customDuration, 10) || 30;
    const calories = parseInt(customCalories, 10) || 150;

    if (editingActivityId) {
      removeWorkout(editingActivityId);
    }
    addWorkout(name, duration, calories);

    setEditingActivityId(null);
    setCustomName('');
    setWorkoutModalVisible(false);
  }, [customName, customDuration, customCalories, editingActivityId, removeWorkout, addWorkout]);

  const handleRemoveWorkout = useCallback((id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    removeWorkout(id);
  }, [removeWorkout]);

  const hasActivities = activities.length > 0;

  return (
    <View style={[styles.card, style]} testID={testID}>
      {/* 1. Top Row: Title, Main Stat & + Workout Button */}
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [styles.leftColumn, pressed && styles.leftColumnPressed]}
          onPress={onPressHeader || handleOpenAddWorkoutModal}
          accessibilityRole="button"
          accessibilityLabel="Open Movement details"
          hitSlop={HIT_SLOP_8}
        >
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="footsteps-outline" size={14} color={Colors.steps} />
            </View>
            <Text style={styles.title}>Movement</Text>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" style={styles.titleChevron} />
          </View>

          <View style={styles.mainStatRow}>
            <Text style={styles.mainStatText}>{steps.toLocaleString()}</Text>
            <Text style={styles.unitText}>steps</Text>
          </View>
          <Text style={styles.subStatText}>
            / {stepGoal.toLocaleString()} steps • ~{distanceKm} km • ~{stepBurnKcal} kcal
          </Text>
        </Pressable>

        {/* Right Action: Soft-Tinted + Workout Pill Button */}
        <Pressable
          style={({ pressed }) => [
            styles.workoutButton,
            pressed && styles.workoutButtonPressed,
          ]}
          onPress={handleOpenAddWorkoutModal}
          accessibilityRole="button"
          accessibilityLabel="Log workout"
          hitSlop={HIT_SLOP_8}
        >
          <Ionicons name="barbell-outline" size={14} color={Colors.steps} />
          <Text style={styles.workoutButtonText}>+ Workout</Text>
        </Pressable>
      </View>

      {/* 2. Chunky Kinetic Flame Orange Capsule Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            isGoalReached ? styles.progressFillCelebration : null,
            animatedBarStyle,
          ]}
        />
      </View>

      {/* 3. Progress Footer: Goal Percentage (Left) & Quick Symmetrical Steppers (Right) */}
      <View style={styles.footerRow}>
        {isGoalReached ? (
          <View style={styles.goalReachedBadge}>
            <Ionicons name="sparkles" size={13} color="#D97706" />
            <Text style={styles.goalReachedText}>Goal Smashed! ({actualStepPercent}%)</Text>
          </View>
        ) : (
          <Text style={styles.percentText}>
            {actualStepPercent}% <Text style={styles.percentSubText}>of daily goal</Text>
          </Text>
        )}

        <View style={styles.stepperActionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.stepMinusBtn,
              pressed && styles.stepperPressed,
              steps <= 0 && styles.stepperDisabled,
            ]}
            onPress={handleMinusSteps}
            disabled={steps <= 0}
            accessibilityRole="button"
            accessibilityLabel="Decrease steps by 1,000"
            hitSlop={HIT_SLOP_8}
          >
            <Feather
              name="minus"
              size={15}
              color={steps <= 0 ? '#CBD5E1' : Colors.steps}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.stepAddBtn,
              pressed && styles.stepperPressed,
            ]}
            onPress={handlePlusSteps}
            accessibilityRole="button"
            accessibilityLabel="Add 1,000 steps"
            hitSlop={HIT_SLOP_8}
          >
            <Feather name="plus" size={14} color={Colors.steps} />
            <Text style={styles.stepAddBtnText}>1k steps</Text>
          </Pressable>
        </View>
      </View>

      {/* 4. Logged Activities / Workouts Section (if any logged) */}
      {hasActivities && (
        <View style={styles.activitiesSection}>
          <View style={styles.activitiesHeaderRow}>
            <Text style={styles.activitiesSectionTitle}>
              Today's Workouts ({activities.length})
            </Text>
            <Text style={styles.activitiesTotalBurn}>
              +{workoutBurnKcal} kcal total
            </Text>
          </View>

          {activities.map((act) => {
            const timeStr = formatActivityTime(act.loggedAt);
            return (
              <View key={act.id} style={styles.activityChip}>
                <Pressable
                  style={({ pressed }) => [
                    styles.activityChipLeft,
                    pressed && styles.activityChipPressed,
                  ]}
                  onPress={() => handleEditWorkout(act)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit workout ${act.name}`}
                >
                  <Text style={styles.activityEmoji}>{getWorkoutIcon(act.name)}</Text>
                  <Text style={styles.activityChipName} numberOfLines={1}>
                    {act.name}
                  </Text>
                  <Text style={styles.activityMetaText}>• {act.durationMinutes}m</Text>
                  <Text style={styles.activityBurnText}>+{act.caloriesBurned} kcal</Text>
                  {timeStr ? <Text style={styles.activityTimeText}>• {timeStr}</Text> : null}
                </Pressable>

                <Pressable
                  onPress={() => handleRemoveWorkout(act.id)}
                  hitSlop={HIT_SLOP_8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove workout ${act.name}`}
                  style={({ pressed }) => [
                    styles.activityRemoveBtn,
                    pressed && styles.activityRemovePressed,
                  ]}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* 5. Workout Logging Modal */}
      <Modal visible={workoutModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <Ionicons name="barbell-outline" size={20} color={Colors.steps} />
                <Text style={styles.modalTitle}>
                  {editingActivityId ? 'Edit Activity' : 'Log Activity / Workout'}
                </Text>
              </View>
              <Pressable
                onPress={() => setWorkoutModalVisible(false)}
                hitSlop={HIT_SLOP_8}
                accessibilityRole="button"
                accessibilityLabel="Close workout modal"
                style={({ pressed }) => [pressed && styles.stepperPressed]}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>Quick select an exercise:</Text>
            <View style={styles.quickGrid}>
              {QUICK_WORKOUTS.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
                  onPress={() => handleSelectQuickWorkout(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${item.name} workout`}
                >
                  <Ionicons name={item.icon} size={20} color={Colors.steps} />
                  <Text style={styles.quickName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.quickMeta}>
                    {item.mins}m • {item.cals} kcal
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalSubtitleMt14}>Or custom activity details:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Badminton, Swimming, HIIT"
              value={customName}
              onChangeText={setCustomName}
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.rowInputs}>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Duration (mins)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={customDuration}
                  onChangeText={handleDurationChange}
                  placeholder="30"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Calories Burned</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  placeholder="150"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveWorkoutBtn, pressed && styles.saveBtnPressed]}
              onPress={handleSaveWorkout}
              accessibilityRole="button"
              accessibilityLabel="Save custom workout"
            >
              <Text style={styles.saveWorkoutBtnText}>
                {editingActivityId ? 'Update Workout' : 'Save Workout'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  leftColumnPressed: {
    opacity: 0.75,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderCurve: 'continuous',
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  titleChevron: {
    marginLeft: 1,
  },
  mainStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainStatText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  unitText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 16,
    color: '#334155',
    marginLeft: 4,
    lineHeight: 22,
  },
  subStatText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  workoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.stepsLight,
    borderWidth: 1,
    borderColor: Colors.stepsBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 4,
  },
  workoutButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  workoutButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.steps,
    fontWeight: '600',
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.stepsTrack,
    overflow: 'hidden',
    marginTop: 14,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.steps,
    borderRadius: 6,
  },
  progressFillCelebration: {
    backgroundColor: Colors.steps,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  percentText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.steps,
  },
  percentSubText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#64748B',
  },
  goalReachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 4,
  },
  goalReachedText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#B45309',
  },
  stepperActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  stepperDisabled: {
    borderColor: '#E2E8F0',
    opacity: 0.45,
  },
  stepMinusBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.stepsBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.stepsLight,
    borderWidth: 1,
    borderColor: Colors.stepsBorder,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 3,
  },
  stepAddBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11.5,
    color: Colors.steps,
  },
  // Activities / Workouts Section
  activitiesSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
  },
  activitiesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activitiesSectionTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#475569',
  },
  activitiesTotalBurn: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.steps,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F6',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  activityChipPressed: {
    opacity: 0.8,
  },
  activityChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    flexWrap: 'wrap',
  },
  activityEmoji: {
    fontSize: 14,
  },
  activityChipName: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#1E293B',
    maxWidth: 120,
  },
  activityMetaText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#64748B',
  },
  activityBurnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11.5,
    color: Colors.steps,
  },
  activityTimeText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  activityRemoveBtn: {
    padding: 4,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityRemovePressed: {
    opacity: 0.6,
  },
  // Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  modalSubtitleMt14: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 14,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#FAF9F6',
    padding: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickCardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  quickName: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  quickMeta: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 10,
    color: '#64748B',
  },
  input: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#0F172A',
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  flex1: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
  },
  saveWorkoutBtn: {
    backgroundColor: Colors.steps,
    borderRadius: 10,
    borderCurve: 'continuous',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  saveWorkoutBtnText: {
    fontFamily: Fonts.urbanist.bold,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export const MovementTrackerCard = React.memo(MovementTrackerCardComponent);
export default MovementTrackerCard;
