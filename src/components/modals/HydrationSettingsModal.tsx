import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

export interface HydrationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenGoalModal?: () => void;
}

const INTERVAL_OPTIONS = [
  { id: '1h', label: '1 hour' },
  { id: '2h', label: '2 hours' },
  { id: '3h', label: '3 hours' },
];

const REMINDER_INTERVAL_KEY = '@calori_water_reminder_interval';

export const HydrationSettingsModal: React.FC<HydrationSettingsModalProps> = ({
  visible,
  onClose,
  onOpenGoalModal,
}) => {
  const { userGoals, updateGoals } = useGoals();
  const [reminderInterval, setReminderInterval] = useState('2h');

  // Load persisted reminder interval preference
  useEffect(() => {
    AsyncStorage.getItem(REMINDER_INTERVAL_KEY)
      .then((saved) => {
        if (saved) setReminderInterval(saved);
      })
      .catch(() => {});
  }, []);

  const handleSelectInterval = (val: string) => {
    setReminderInterval(val);
    AsyncStorage.setItem(REMINDER_INTERVAL_KEY, val).catch(() => {});
  };

  const isReminderOn = userGoals.waterReminder ?? true;

  const handleToggleReminder = (val: boolean) => {
    updateGoals({ waterReminder: val });
  };

  const handleAdjustGoal = () => {
    onClose();
    setTimeout(() => {
      onOpenGoalModal?.();
    }, 200);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name="water-outline" size={20} color={Colors.water} />
              </View>
              <Text style={styles.modalTitle}>Hydration Settings</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close settings"
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Daily Goal Summary Card */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="flag-outline" size={18} color="#0284C7" />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>Daily Target Goal</Text>
                  <Text style={styles.cardValue}>{userGoals.waterGoalMl || 2500} mL / day</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.editGoalBtn, pressed && styles.btnPressed]}
                  onPress={handleAdjustGoal}
                  accessibilityRole="button"
                  accessibilityLabel="Edit daily water goal"
                >
                  <Text style={styles.editGoalBtnText}>Change</Text>
                  <Ionicons name="pencil-outline" size={13} color={Colors.water} />
                </Pressable>
              </View>
            </View>

            {/* 2. Hydration Reminders */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#16A34A" />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>Drink Reminders</Text>
                  <Text style={styles.cardDesc}>Gentle alerts to stay hydrated</Text>
                </View>
                <Switch
                  value={isReminderOn}
                  onValueChange={handleToggleReminder}
                  trackColor={{ false: '#E2E8F0', true: '#BAE6FD' }}
                  thumbColor={isReminderOn ? Colors.water : '#94A3B8'}
                />
              </View>

              {isReminderOn && (
                <View style={styles.reminderIntervalSection}>
                  <Text style={styles.subSectionTitle}>Reminder Interval</Text>
                  <View style={styles.intervalPillRow}>
                    {INTERVAL_OPTIONS.map((opt) => {
                      const isSelected = reminderInterval === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          style={[
                            styles.intervalPill,
                            isSelected && styles.intervalPillActive,
                          ]}
                          onPress={() => handleSelectInterval(opt.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remind every ${opt.label}`}
                        >
                          <Text
                            style={[
                              styles.intervalPillText,
                              isSelected && styles.intervalPillTextActive,
                            ]}
                          >
                            Every {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* 3. Beverage Hydration Science Guide */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeaderRow}>
                <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
                <Text style={styles.infoCardTitle}>Hydration Insights</Text>
              </View>
              <Text style={styles.infoCardText}>
                Pure water counts for 100% hydration. Other drinks such as herbal tea (~95%) and juices (~85%) provide hydration alongside essential electrolytes, while caffeine has a slight diuretic effect.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Done Button */}
          <View style={styles.footerContainer}>
            <Pressable
              style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Save hydration settings"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '85%',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    marginTop: 12,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 12,
  },
  settingCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  cardValue: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: Colors.water,
    marginTop: 1,
  },
  cardDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  editGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editGoalBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.water,
  },
  reminderIntervalSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  subSectionTitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  intervalPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intervalPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  intervalPillActive: {
    borderColor: Colors.water,
    backgroundColor: '#F0F9FF',
  },
  intervalPillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#475569',
  },
  intervalPillTextActive: {
    fontFamily: Fonts.poppins.semiBold,
    color: Colors.water,
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoCardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0369A1',
  },
  infoCardText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 18,
    color: '#0C4A6E',
  },
  footerContainer: {
    paddingTop: 12,
  },
  doneBtn: {
    backgroundColor: Colors.water,
    height: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.8,
  },
});
