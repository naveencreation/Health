import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

const QUICK_WORKOUTS = [
  { name: 'Brisk Walk', mins: 30, cals: 130, icon: 'walk-outline' },
  { name: 'Gym / Weightlifting', mins: 45, cals: 220, icon: 'barbell-outline' },
  { name: 'Running / Jogging', mins: 25, cals: 240, icon: 'speedometer-outline' },
  { name: 'Yoga & Stretching', mins: 35, cals: 110, icon: 'body-outline' },
  { name: 'Cycling', mins: 30, cals: 190, icon: 'bicycle-outline' },
];

export const DailyHabitsCard: React.FC = () => {
  const {
    currentLog,
    userGoals,
    totalBurned,
    addWater,
    resetWater,
    addSteps,
    addWorkout,
    removeWorkout,
  } = useHealth();

  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDuration, setCustomDuration] = useState('30');
  const [customCalories, setCustomCalories] = useState('150');

  // Hydration calculations
  const currentMl = currentLog.waterMl || 0;
  const targetMl = userGoals.waterGoalMl || 2000;
  const waterRatio = Math.min(1, Math.max(0, currentMl / targetMl));
  const waterPercent = Math.min(100, Math.round((currentMl / targetMl) * 100));
  const glassesTarget = Math.max(1, Math.round(targetMl / 250));

  // Activity calculations
  const steps = currentLog.steps || 0;
  const stepGoal = userGoals.stepGoal || 10000;
  const stepRatio = Math.min(1, Math.max(0, steps / stepGoal));
  const stepPercent = Math.min(100, Math.round((steps / stepGoal) * 100));
  const stepBurnKcal = Math.round(steps * 0.04);
  const workoutBurnKcal = Array.isArray(currentLog?.activities)
    ? currentLog.activities.reduce((sum, act) => sum + (act.caloriesBurned || 0), 0)
    : 0;

  // Circular Gauge Specs (Optimized for side-by-side)
  const dialSize = 114;
  const strokeWidth = 9;
  const radius = (dialSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const waterOffset = circumference - circumference * waterRatio;
  const stepOffset = circumference - circumference * stepRatio;

  const handleAddCustomWorkout = () => {
    if (!customName.trim()) return;
    addWorkout(
      customName.trim(),
      parseInt(customDuration, 10) || 30,
      parseInt(customCalories, 10) || 150
    );
    setCustomName('');
    setWorkoutModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeading}>Daily Habits & Activity</Text>

        <Pressable
          style={({ pressed }) => [
            styles.logWorkoutHeaderBtn,
            pressed && styles.pressedBtnSubtle,
          ]}
          onPress={() => setWorkoutModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Log workout"
        >
          <Ionicons name="barbell-outline" size={14} color="#EA580C" />
          <Text style={styles.logWorkoutHeaderText}>Log Workout</Text>
        </Pressable>
      </View>

      {/* Side-by-Side Habit Pods */}
      <View style={styles.podsRow}>
        {/* LEFT POD: Water Tracker 💧 */}
        <View style={styles.waterPod}>
          <View style={styles.waterPodBadge}>
            <Text style={styles.waterPodBadgeText}>💧 Hydration</Text>
          </View>

          <View style={styles.gaugeCanvas}>
            <View style={styles.gaugeRotate}>
              <Svg width={dialSize} height={dialSize}>
                <Circle
                  cx={dialSize / 2}
                  cy={dialSize / 2}
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={dialSize / 2}
                  cy={dialSize / 2}
                  r={radius}
                  stroke="#2563EB"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={waterOffset}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </View>

            {/* Inner Content */}
            <View style={styles.gaugeInner}>
              <Text style={styles.innerValueText}>{currentMl.toLocaleString()}</Text>
              <Text style={styles.innerSubText}>ml</Text>
            </View>
          </View>

          {/* Metric Below: Ratio */}
          <Text style={styles.metricRatioTextBlue}>
            {currentMl.toLocaleString()}{' '}
            <Text style={styles.metricRatioUnit}>/ {targetMl.toLocaleString()} ml</Text>
          </Text>
          {/* Subtitle: Progress context */}
          <Text style={styles.metricContextText}>
            {waterPercent}% • {Math.round(currentMl / 250)} of {glassesTarget} glasses
          </Text>

          {/* Quick Action Stepper */}
          <View style={styles.stepperActionRow}>
            {currentMl > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.waterMinusBtn, pressed && styles.stepperPressed]}
                onPress={() => addWater(-250)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Decrease water by 250 ml"
              >
                <Ionicons name="remove" size={16} color="#2563EB" />
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.waterAddBtn, pressed && styles.stepperPressed]}
              onPress={() => addWater(250)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Add 250 ml water"
            >
              <Ionicons name="add" size={15} color="#FFFFFF" />
              <Text style={styles.waterAddBtnText}>250 ml</Text>
            </Pressable>
          </View>
        </View>

        {/* RIGHT POD: Movement 👟 */}
        <View style={styles.stepPod}>
          <View style={styles.stepPodBadge}>
            <Text style={styles.stepPodBadgeText}>👟 Movement</Text>
          </View>

          <View style={styles.gaugeCanvas}>
            <View style={styles.gaugeRotate}>
              <Svg width={dialSize} height={dialSize}>
                <Circle
                  cx={dialSize / 2}
                  cy={dialSize / 2}
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={dialSize / 2}
                  cy={dialSize / 2}
                  r={radius}
                  stroke="#EA580C"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={stepOffset}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </View>

            {/* Inner Content */}
            <View style={styles.gaugeInner}>
              <Text style={styles.innerValueText}>{steps.toLocaleString()}</Text>
              <Text style={styles.innerSubText}>steps</Text>
            </View>
          </View>

          {/* Metric Below: Ratio */}
          <Text style={styles.metricRatioTextOrange}>
            {steps.toLocaleString()}{' '}
            <Text style={styles.metricRatioUnit}>/ {stepGoal.toLocaleString()}</Text>
          </Text>
          {/* Subtitle: Progress context */}
          <Text style={styles.metricContextText}>
            {stepPercent}% • ~{stepBurnKcal} kcal burn
          </Text>

          {/* Quick Action Stepper */}
          <View style={styles.stepperActionRow}>
            {steps > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.stepMinusBtn, pressed && styles.stepperPressed]}
                onPress={() => addSteps(-1000)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Decrease steps by 1,000"
              >
                <Ionicons name="remove" size={16} color="#EA580C" />
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.stepAddBtn, pressed && styles.stepperPressed]}
              onPress={() => addSteps(1000)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Add 1,000 steps"
            >
              <Ionicons name="add" size={15} color="#FFFFFF" />
              <Text style={styles.stepAddBtnText}>1k steps</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Logged Workouts Strip (if any logged) */}
      {Array.isArray(currentLog?.activities) && currentLog.activities.length > 0 ? (
        <View style={styles.activitiesStrip}>
          <View style={styles.activitiesHeaderRow}>
            <Text style={styles.activitiesStripTitle}>
              Today's Workouts ({currentLog.activities.length})
            </Text>
            <Text style={styles.activitiesTotalBurn}>
              +{workoutBurnKcal} kcal total
            </Text>
          </View>
          {currentLog.activities.map((act) => (
            <View key={act.id} style={styles.activityChip}>
              <Text style={styles.activityChipText}>
                🏃 {act.name} ({act.durationMinutes}m) • +{act.caloriesBurned} kcal
              </Text>
              <Pressable
                onPress={() => removeWorkout(act.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove workout ${act.name}`}
              >
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Workout Logging Modal */}
      <Modal visible={workoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Activity / Workout</Text>
              <Pressable
                onPress={() => setWorkoutModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close workout modal"
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
                  onPress={() => {
                    addWorkout(item.name, item.mins, item.cals);
                    setWorkoutModalVisible(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${item.name} workout`}
                >
                  <Ionicons name={item.icon as any} size={20} color="#EA580C" />
                  <Text style={styles.quickName}>{item.name}</Text>
                  <Text style={styles.quickMeta}>
                    {item.mins}m • {item.cals} kcal
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalSubtitleMt14}>Or custom workout:</Text>
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
                  onChangeText={setCustomDuration}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Calories Burned</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={customCalories}
                  onChangeText={setCustomCalories}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveWorkoutBtn, pressed && styles.saveBtnPressed]}
              onPress={handleAddCustomWorkout}
              accessibilityRole="button"
              accessibilityLabel="Save custom workout"
            >
              <Text style={styles.saveWorkoutBtnText}>Save Workout</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  logWorkoutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  logWorkoutHeaderText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#EA580C',
    fontWeight: '600',
  },
  pressedBtnSubtle: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  // Side-by-Side Habit Pods
  podsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  waterPod: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  stepPod: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  waterPodBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  waterPodBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    color: '#0284C7',
  },
  stepPodBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  stepPodBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    color: '#EA580C',
  },
  gaugeCanvas: {
    position: 'relative',
    width: 114,
    height: 114,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeRotate: {
    transform: [{ rotate: '-90deg' }],
  },
  gaugeInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerValueText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  innerSubText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricRatioTextBlue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13.5,
    color: '#0284C7',
    marginTop: 8,
    textAlign: 'center',
  },
  metricRatioTextOrange: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13.5,
    color: '#EA580C',
    marginTop: 8,
    textAlign: 'center',
  },
  metricRatioUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  metricContextText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  // Quick Action Stepper Controls
  stepperActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  waterMinusBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 9,
    gap: 3,
  },
  waterAddBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  stepMinusBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 9,
    gap: 3,
  },
  stepAddBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  // Logged Activities Strip
  activitiesStrip: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    width: '100%',
  },
  activitiesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activitiesStripTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#475569',
  },
  activitiesTotalBurn: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11.5,
    color: '#EA580C',
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  activityChipText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#1E293B',
  },
  // Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  modalSubtitleMt14: {
    fontFamily: Fonts.poppins.medium,
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
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickCardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  quickName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  quickMeta: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#64748B',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: Fonts.poppins.regular,
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  saveWorkoutBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  saveWorkoutBtnText: {
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
