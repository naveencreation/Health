import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

const GOAL_PRESETS = [1500, 2000, 2500, 3000, 3500];

export interface DailyWaterGoalModalProps {
  visible: boolean;
  initialGoal?: number;
  onClose: () => void;
  onSave?: (newGoal: number) => void;
}

export const DailyWaterGoalModal: React.FC<DailyWaterGoalModalProps> = ({
  visible,
  initialGoal,
  onClose,
  onSave,
}) => {
  const { userGoals, updateGoals } = useGoals();
  const currentGoal = initialGoal ?? userGoals.waterGoalMl ?? 2500;

  const [editingGoal, setEditingGoal] = useState(currentGoal);

  useEffect(() => {
    if (visible) {
      setEditingGoal(initialGoal ?? userGoals.waterGoalMl ?? 2500);
    }
  }, [visible, initialGoal, userGoals.waterGoalMl]);

  const handleStepGoal = (delta: number) => {
    setEditingGoal((prev) => Math.min(6000, Math.max(500, prev + delta)));
  };

  const handleSave = () => {
    updateGoals({ waterGoalMl: editingGoal });
    onSave?.(editingGoal);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Daily Water Goal</Text>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close goal editor"
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <Text style={styles.modalSubtitle}>
            Set your target daily hydration intake for healthy energy and metabolic balance.
          </Text>

          {/* Stepper Display */}
          <View style={styles.stepperContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.stepperBtn,
                pressed && styles.btnPressed,
                editingGoal <= 500 && styles.stepperBtnDisabled,
              ]}
              onPress={() => handleStepGoal(-100)}
              disabled={editingGoal <= 500}
              accessibilityRole="button"
              accessibilityLabel="Decrease water goal by 100 mL"
            >
              <Ionicons
                name="remove"
                size={22}
                color={editingGoal <= 500 ? '#CBD5E1' : Colors.water}
              />
            </Pressable>

            <View style={styles.stepperValueBox}>
              <Text style={styles.stepperValueText}>{editingGoal}</Text>
              <Text style={styles.stepperUnitText}>mL</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.stepperBtn,
                pressed && styles.btnPressed,
                editingGoal >= 6000 && styles.stepperBtnDisabled,
              ]}
              onPress={() => handleStepGoal(100)}
              disabled={editingGoal >= 6000}
              accessibilityRole="button"
              accessibilityLabel="Increase water goal by 100 mL"
            >
              <Ionicons
                name="add"
                size={22}
                color={editingGoal >= 6000 ? '#CBD5E1' : Colors.water}
              />
            </Pressable>
          </View>

          {/* Quick Preset Pills */}
          <Text style={styles.presetsLabel}>Quick Presets</Text>
          <View style={styles.presetsRow}>
            {GOAL_PRESETS.map((preset) => {
              const isSelected = editingGoal === preset;
              return (
                <Pressable
                  key={preset}
                  style={[
                    styles.presetChip,
                    isSelected && styles.presetChipActive,
                  ]}
                  onPress={() => setEditingGoal(preset)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set goal to ${preset} mL`}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      isSelected && styles.presetChipTextActive,
                    ]}
                  >
                    {preset} mL
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Save Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveGoalBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save daily water goal"
          >
            <Text style={styles.saveGoalBtnText}>Save Daily Goal</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 20,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 0,
    shadowOpacity: 0,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
    backgroundColor: '#F1F5F9',
  },
  stepperValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  stepperValueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    color: '#0F172A',
  },
  stepperUnitText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: '#64748B',
  },
  presetsLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  presetChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: Colors.waterLight,
    borderColor: Colors.waterBorder,
  },
  presetChipText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#475569',
  },
  presetChipTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.waterDark,
  },
  saveGoalBtn: {
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.water,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  saveGoalBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
