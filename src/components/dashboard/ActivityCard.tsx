import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
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

export const ActivityCard: React.FC = () => {
  const { currentLog, userGoals, totalBurned, addSteps, addWorkout, removeWorkout } = useHealth();
  const [modalVisible, setModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDuration, setCustomDuration] = useState('30');
  const [customCalories, setCustomCalories] = useState('150');

  const steps = currentLog.steps || 0;
  const stepGoal = userGoals.stepGoal || 10000;
  const progressRatio = Math.min(1, Math.max(0, steps / stepGoal));
  const stepPercent = Math.min(100, Math.round((steps / stepGoal) * 100));

  // Circular Gauge Dimensions (Matching HydrationTracker)
  const size = 190;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - circumference * progressRatio;

  const handleAddCustomWorkout = () => {
    if (!customName.trim()) return;
    addWorkout(
      customName.trim(),
      parseInt(customDuration, 10) || 30,
      parseInt(customCalories, 10) || 150
    );
    setCustomName('');
    setModalVisible(false);
  };

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeading}>Today's Activity</Text>
      </View>

      {/* Center Circular Progress Ring */}
      <View style={styles.gaugeWrapper}>
        <Svg width={size} height={size}>
          {/* Background Neutral Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Active Flame Orange Arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#EA580C"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            origin={`${size / 2}, ${size / 2}`}
            rotation="-90"
          />
        </Svg>

        {/* Centered Content: Flame + Steps Count + Goal */}
        <View style={styles.centerContent}>
          <View style={styles.iconWrapper}>
            <Ionicons name="flame" size={28} color="#EA580C" />
          </View>

          <Text style={styles.mainCountText}>
            {steps.toLocaleString()}
          </Text>
          <Text style={styles.stepsLabel}>steps</Text>

          <Text style={styles.subText}>
            of {stepGoal.toLocaleString()} goal
          </Text>
        </View>
      </View>

      {/* Bottom Burn Display */}
      <View style={styles.burnSection}>
        <Text style={styles.burnText}>{totalBurned} kcal</Text>
        <Text style={styles.burnLabel}>Active Burn • {stepPercent}% of Daily Goal</Text>
      </View>

      {/* Ergonomic Quick Actions */}
      <View style={styles.quickActionRow}>
        <TouchableOpacity
          style={styles.quickStepBtn}
          onPress={() => addSteps(1000)}
          activeOpacity={0.8}
        >
          <Ionicons name="footsteps" size={16} color="#C2410C" />
          <Text style={styles.quickStepText}>+1,000 Steps</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickWorkoutBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.quickWorkoutText}>Log Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Logged Workouts List (Clean UXPeak Flat Rows) */}
      {Array.isArray(currentLog?.activities) && currentLog.activities.length > 0 && (
        <View style={styles.workoutList}>
          {currentLog.activities.map((act, index) => {
            const isLast = index === currentLog.activities.length - 1;
            return (
              <View
                key={act.id}
                style={[styles.workoutRow, !isLast && styles.workoutRowBorder]}
              >
                <View style={styles.workoutInfo}>
                  <View style={styles.workoutIconCircle}>
                    <Ionicons name="fitness" size={15} color="#EA580C" />
                  </View>
                  <View>
                    <Text style={styles.workoutName}>{act.name}</Text>
                    <Text style={styles.workoutMeta}>{act.durationMinutes} mins</Text>
                  </View>
                </View>

                <View style={styles.workoutRight}>
                  <Text style={styles.workoutCals}>+{act.caloriesBurned} kcal</Text>
                  <TouchableOpacity
                    onPress={() => removeWorkout(act.id)}
                    style={styles.delBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={15} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Workout Logging Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Activity / Workout</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
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
                    setModalVisible(false);
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
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  // Circular Gauge Canvas (190x190)
  gaugeWrapper: {
    position: 'relative',
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: 2,
  },
  mainCountText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  stepsLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
  // Burn metrics section
  burnSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 18,
  },
  burnText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 34,
    fontWeight: '700',
    color: '#EA580C',
    lineHeight: 38,
  },
  burnLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  // Quick Action Buttons
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  quickStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 5,
  },
  quickStepText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#C2410C',
  },
  quickWorkoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 5,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  quickWorkoutText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Logged Workout List
  workoutList: {
    width: '100%',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 8,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  workoutRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workoutIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  workoutMeta: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutCals: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  delBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
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
