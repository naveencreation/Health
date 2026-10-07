import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface WeightGoalSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (updated: {
    startWeightKg: number;
    targetWeightKg: number;
    weightUnit: 'kg' | 'lbs';
  }) => void;
}

export const WeightGoalSettingsModal: React.FC<WeightGoalSettingsModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const insets = useSafeAreaInsets();
  const { userGoals, updateGoals } = useGoals();

  const [unit, setUnit] = useState<'kg' | 'lbs'>(userGoals.weightUnit || 'kg');
  const [startKg, setStartKg] = useState<number>(
    userGoals.startWeightKg ?? userGoals.currentWeightKg ?? 68.0
  );
  const [goalKg, setGoalKg] = useState<number>(userGoals.targetWeightKg ?? 65.0);

  useEffect(() => {
    if (visible) {
      setUnit(userGoals.weightUnit || 'kg');
      setStartKg(userGoals.startWeightKg ?? userGoals.currentWeightKg ?? 68.0);
      setGoalKg(userGoals.targetWeightKg ?? 65.0);
    }
  }, [
    visible,
    userGoals.weightUnit,
    userGoals.startWeightKg,
    userGoals.currentWeightKg,
    userGoals.targetWeightKg,
  ]);

  const toDisplay = (valKg: number) =>
    unit === 'kg' ? valKg : Math.round(valKg * 2.20462 * 10) / 10;

  const handleStepStart = (deltaCurrentUnit: number) => {
    if (unit === 'kg') {
      setStartKg(prev =>
        Math.max(30, Math.min(300, Math.round((prev + deltaCurrentUnit) * 10) / 10))
      );
    } else {
      const currentLbs = startKg * 2.20462;
      const nextLbs = Math.max(66, Math.min(660, currentLbs + deltaCurrentUnit));
      // 2-decimal kg precision ensures +/- 0.1 lbs changes register cleanly
      setStartKg(Math.round((nextLbs / 2.20462) * 100) / 100);
    }
  };

  const handleStepGoal = (deltaCurrentUnit: number) => {
    if (unit === 'kg') {
      setGoalKg(prev =>
        Math.max(30, Math.min(300, Math.round((prev + deltaCurrentUnit) * 10) / 10))
      );
    } else {
      const currentLbs = goalKg * 2.20462;
      const nextLbs = Math.max(66, Math.min(660, currentLbs + deltaCurrentUnit));
      // 2-decimal kg precision ensures +/- 0.1 lbs changes register cleanly
      setGoalKg(Math.round((nextLbs / 2.20462) * 100) / 100);
    }
  };

  const handleSave = () => {
    const payload = {
      startWeightKg:
        unit === 'lbs' ? Math.round(startKg * 100) / 100 : Math.round(startKg * 10) / 10,
      targetWeightKg:
        unit === 'lbs' ? Math.round(goalKg * 100) / 100 : Math.round(goalKg * 10) / 10,
      weightUnit: unit,
    };
    updateGoals(payload);
    onSave?.(payload);
    onClose();
  };

  const totalDeltaKg = Math.round((goalKg - startKg) * 10) / 10;
  const isLoss = totalDeltaKg < 0;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Weight Settings</Text>
              <Text style={styles.modalSubtitle}>Configure your baseline and target journey</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close weight settings"
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Preferred Unit Toggle */}
            <Text style={styles.fieldLabel}>Preferred Unit</Text>
            <View style={styles.unitPillContainer}>
              <Pressable
                style={[styles.unitTab, unit === 'kg' && styles.unitTabActive]}
                onPress={() => setUnit('kg')}
              >
                <Text style={[styles.unitTabText, unit === 'kg' && styles.unitTabTextActive]}>
                  Kilograms (kg)
                </Text>
              </Pressable>
              <Pressable
                style={[styles.unitTab, unit === 'lbs' && styles.unitTabActive]}
                onPress={() => setUnit('lbs')}
              >
                <Text style={[styles.unitTabText, unit === 'lbs' && styles.unitTabTextActive]}>
                  Pounds (lbs)
                </Text>
              </Pressable>
            </View>

            {/* Starting Weight Stepper Card */}
            <Text style={styles.fieldLabel}>Starting Weight</Text>
            <View style={styles.stepperCard}>
              <View style={styles.stepperRow}>
                <Pressable
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                  onPress={() => handleStepStart(-1.0)}
                >
                  <Text style={styles.stepperBtnText}>-1</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                  onPress={() => handleStepStart(-0.1)}
                >
                  <Text style={styles.stepperBtnText}>-0.1</Text>
                </Pressable>

                <View style={styles.valueDisplay}>
                  <Text style={styles.valueText}>{toDisplay(startKg).toFixed(1)}</Text>
                  <Text style={styles.unitText}>{unit}</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                  onPress={() => handleStepStart(0.1)}
                >
                  <Text style={styles.stepperBtnText}>+0.1</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                  onPress={() => handleStepStart(1.0)}
                >
                  <Text style={styles.stepperBtnText}>+1</Text>
                </Pressable>
              </View>
            </View>

            {/* Target Goal Weight Stepper Card */}
            <Text style={styles.fieldLabel}>Target Goal Weight</Text>
            <View style={styles.stepperCard}>
              <View style={styles.stepperRow}>
                <Pressable
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                  onPress={() => handleStepGoal(-1.0)}
                >
                  <Text style={styles.stepperBtnText}>-1</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                  onPress={() => handleStepGoal(-0.1)}
                >
                  <Text style={styles.stepperBtnText}>-0.1</Text>
                </Pressable>

                <View style={styles.valueDisplay}>
                  <Text style={styles.valueText}>{toDisplay(goalKg).toFixed(1)}</Text>
                  <Text style={styles.unitText}>{unit}</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                  onPress={() => handleStepGoal(0.1)}
                >
                  <Text style={styles.stepperBtnText}>+0.1</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                  onPress={() => handleStepGoal(1.0)}
                >
                  <Text style={styles.stepperBtnText}>+1</Text>
                </Pressable>
              </View>
            </View>

            {/* Journey Summary Chip */}
            <View style={styles.summaryBox}>
              <Ionicons
                name={isLoss ? 'trending-down-outline' : 'trending-up-outline'}
                size={18}
                color={isLoss ? '#10B981' : '#F43F5E'}
              />
              <Text style={styles.summaryText}>
                Plan: {isLoss ? 'Lose' : 'Gain'}{' '}
                <Text style={styles.summaryBold}>
                  {toDisplay(Math.abs(totalDeltaKg)).toFixed(1)} {unit}
                </Text>{' '}
                from baseline
              </Text>
            </View>

            {/* Save Button */}
            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Save goals"
            >
              <Text style={styles.saveBtnText}>Save Settings</Text>
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
  modalContent: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.7,
  },
  scrollBody: {
    paddingBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.urbanist.semiBold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  unitPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 3,
    marginBottom: 14,
  },
  unitTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    elevation: 0,
    shadowOpacity: 0,
  },
  unitTabText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
    color: '#64748B',
  },
  unitTabTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: '#0F172A',
  },
  stepperCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  stepperBtnText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.semiBold,
    color: '#334155',
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
  },
  valueText: {
    fontSize: 26,
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
  unitText: {
    fontSize: 14,
    fontFamily: Fonts.urbanist.medium,
    color: '#64748B',
    marginLeft: 4,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 8,
    marginTop: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  summaryText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
    color: '#166534',
  },
  summaryBold: {
    fontFamily: Fonts.urbanist.bold,
  },
  saveBtn: {
    backgroundColor: Colors.weight,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  saveBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: Fonts.urbanist.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
