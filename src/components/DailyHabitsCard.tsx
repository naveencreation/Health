import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { useHealth } from '../context/HealthContext';

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

  // Activity calculations
  const steps = currentLog.steps || 0;
  const stepGoal = userGoals.stepGoal || 10000;
  const stepRatio = Math.min(1, Math.max(0, steps / stepGoal));
  const stepPercent = Math.min(100, Math.round((steps / stepGoal) * 100));

  // Circular Gauge Specs (Optimized for side-by-side)
  const dialSize = 118;
  const strokeWidth = 10;
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
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionHeading}>Daily Habits & Activity</Text>
          <Text style={styles.sectionSubtitle}>Hydration & Movement</Text>
        </View>

        <TouchableOpacity
          style={styles.logWorkoutHeaderBtn}
          onPress={() => setWorkoutModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="barbell-outline" size={14} color="#EA580C" />
          <Text style={styles.logWorkoutHeaderText}>Log Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Side-by-Side Dual Gauges Row */}
      <View style={styles.gaugesContainer}>
        {/* LEFT COLUMN: Water Tracker 💧 */}
        <View style={styles.habitColumn}>
          <View style={styles.gaugeCanvas}>
            <View style={{ transform: [{ rotate: '-90deg' }] }}>
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
              <Ionicons name="water" size={18} color="#2563EB" />
              <Text style={styles.innerValueText}>{currentMl.toLocaleString()}</Text>
              <Text style={styles.innerSubText}>ml</Text>
            </View>
          </View>

          {/* Metric Below */}
          <Text style={styles.metricBigTextBlue}>{waterPercent}%</Text>
          <Text style={styles.metricLabelText}>of {targetMl.toLocaleString()} ml</Text>

          {/* Quick Action Button */}
          <View style={styles.quickBtnGroup}>
            <TouchableOpacity
              style={styles.waterQuickBtn}
              onPress={() => addWater(250)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color="#1D4ED8" />
              <Text style={styles.waterQuickBtnText}>+250 ml</Text>
            </TouchableOpacity>

            {currentMl > 0 && (
              <TouchableOpacity
                style={styles.waterMinusBtn}
                onPress={() => addWater(-250)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="remove" size={13} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Vertical Hairline Divider */}
        <View style={styles.verticalDivider} />

        {/* RIGHT COLUMN: Activity & Burn 🔥 */}
        <View style={styles.habitColumn}>
          <View style={styles.gaugeCanvas}>
            <View style={{ transform: [{ rotate: '-90deg' }] }}>
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
              <Ionicons name="flame" size={18} color="#EA580C" />
              <Text style={styles.innerValueText}>{steps.toLocaleString()}</Text>
              <Text style={styles.innerSubText}>steps</Text>
            </View>
          </View>

          {/* Metric Below */}
          <Text style={styles.metricBigTextOrange}>{totalBurned} kcal</Text>
          <Text style={styles.metricLabelText}>{stepPercent}% of 10k goal</Text>

          {/* Quick Action Button */}
          <TouchableOpacity
            style={styles.stepQuickBtn}
            onPress={() => addSteps(1000)}
            activeOpacity={0.8}
          >
            <Ionicons name="footsteps" size={13} color="#C2410C" />
            <Text style={styles.stepQuickBtnText}>+1,000 Steps</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logged Workouts Strip (if any logged) */}
      {currentLog.activities.length > 0 && (
        <View style={styles.activitiesStrip}>
          <Text style={styles.activitiesStripTitle}>Today's Workouts:</Text>
          {currentLog.activities.map((act) => (
            <View key={act.id} style={styles.activityChip}>
              <Text style={styles.activityChipText}>
                🏃 {act.name} ({act.durationMinutes}m) • +{act.caloriesBurned} kcal
              </Text>
              <TouchableOpacity
                onPress={() => removeWorkout(act.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Workout Logging Modal */}
      <Modal visible={workoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Activity / Workout</Text>
              <TouchableOpacity
                onPress={() => setWorkoutModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Quick select an exercise:</Text>
            <View style={styles.quickGrid}>
              {QUICK_WORKOUTS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickCard}
                  onPress={() => {
                    addWorkout(item.name, item.mins, item.cals);
                    setWorkoutModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={20} color="#EA580C" />
                  <Text style={styles.quickName}>{item.name}</Text>
                  <Text style={styles.quickMeta}>
                    {item.mins}m • {item.cals} kcal
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSubtitle, { marginTop: 14 }]}>Or custom workout:</Text>
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

            <TouchableOpacity
              style={styles.saveWorkoutBtn}
              onPress={handleAddCustomWorkout}
              activeOpacity={0.8}
            >
              <Text style={styles.saveWorkoutBtnText}>Save Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  logWorkoutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  logWorkoutHeaderText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '600',
  },
  // Side-by-Side Dual Gauges
  gaugesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 170,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginHorizontal: 8,
  },
  gaugeCanvas: {
    position: 'relative',
    width: 118,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerValueText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 18,
  },
  innerSubText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9.5,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  // Bottom Big Metric
  metricBigTextBlue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 8,
    lineHeight: 24,
  },
  metricBigTextOrange: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#EA580C',
    marginTop: 8,
    lineHeight: 24,
  },
  metricLabelText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    marginBottom: 10,
  },
  // Quick Action Buttons
  quickBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waterQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 3,
  },
  waterQuickBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  waterMinusBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 3,
  },
  stepQuickBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#C2410C',
    fontWeight: '600',
  },
  // Logged Activities Strip
  activitiesStrip: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 10,
    width: '100%',
  },
  activitiesStripTitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
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
  saveWorkoutBtnText: {
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
