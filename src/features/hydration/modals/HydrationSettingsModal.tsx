import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const { userGoals, updateGoals } = useGoals();
  const [reminderInterval, setReminderInterval] = useState('2h');

  // Load persisted reminder interval preference
  useEffect(() => {
    AsyncStorage.getItem(REMINDER_INTERVAL_KEY)
      .then(saved => {
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
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
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
                  <Ionicons name="flag-outline" size={18} color={Colors.water} />
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
                <View style={[styles.cardIconBox, { backgroundColor: Colors.proteinLight }]}>
                  <Ionicons name="notifications-outline" size={18} color={Colors.success} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>Drink Reminders</Text>
                  <Text style={styles.cardDesc}>Gentle alerts to stay hydrated</Text>
                </View>
                <Switch
                  value={isReminderOn}
                  onValueChange={handleToggleReminder}
                  trackColor={{ false: Colors.borderInset, true: Colors.waterBorder }}
                  thumbColor={isReminderOn ? Colors.water : Colors.textMuted}
                />
              </View>

              {isReminderOn && (
                <View style={styles.reminderIntervalSection}>
                  <Text style={styles.subSectionTitle}>Reminder Interval</Text>
                  <View style={styles.intervalPillRow}>
                    {INTERVAL_OPTIONS.map(opt => {
                      const isSelected = reminderInterval === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          style={[styles.intervalPill, isSelected && styles.intervalPillActive]}
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
                <Ionicons name="information-circle-outline" size={18} color={Colors.water} />
                <Text style={styles.infoCardTitle}>Hydration Insights</Text>
              </View>
              <Text style={styles.infoCardText}>
                Pure water counts for 100% hydration. Other drinks such as herbal tea (~95%) and
                juices (~85%) provide hydration alongside essential electrolytes, while caffeine has
                a slight diuretic effect.
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
    backgroundColor: Colors.overlayScrim,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: Colors.card,
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
    shadowColor: Colors.shadowColor,
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
    borderBottomColor: Colors.surfaceInset,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.waterTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceInset,
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
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.waterTrack,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  cardValue: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.water,
    marginTop: 1,
  },
  cardDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  editGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  editGoalBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.water,
  },
  reminderIntervalSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderInset,
  },
  subSectionTitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
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
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.borderInset,
    alignItems: 'center',
  },
  intervalPillActive: {
    borderColor: Colors.water,
    backgroundColor: Colors.waterLight,
  },
  intervalPillText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSlate600,
  },
  intervalPillTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.water,
  },
  infoCard: {
    backgroundColor: Colors.waterLight,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.waterBorder,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoCardTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.waterDark,
  },
  infoCardText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.waterDark,
  },
  footerContainer: {
    paddingTop: 12,
  },
  doneBtn: {
    backgroundColor: Colors.water,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  doneBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.onPrimary,
  },
  btnPressed: {
    opacity: 0.8,
  },
});
