import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

const SWITCH_TRACK_ACTIVE = `${Colors.primary}80`;

interface PreferencesModalSheetProps {
  visible: boolean;
  onClose: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const PreferencesModalSheet: React.FC<PreferencesModalSheetProps> = ({
  visible,
  onClose,
  onSignIn,
  onSignOut,
}) => {
  const { currentUser, logout, userGoals, updateGoals } = useHealth();

  const [riaTone, setRiaTone] = useState<'supportive' | 'focused' | 'scientific'>(userGoals.riaTone || 'supportive');
  const [waterReminder, setWaterReminder] = useState(userGoals.waterReminder !== false);
  const [mealReminder, setMealReminder] = useState(userGoals.mealReminder !== false);
  const [stepReminder, setStepReminder] = useState(userGoals.stepReminder || false);

  React.useEffect(() => {
    if (visible) {
      setRiaTone(userGoals.riaTone || 'supportive');
      setWaterReminder(userGoals.waterReminder !== false);
      setMealReminder(userGoals.mealReminder !== false);
      setStepReminder(userGoals.stepReminder || false);
    }
  }, [visible, userGoals]);

  const handleSelectTone = (tone: 'supportive' | 'focused' | 'scientific') => {
    setRiaTone(tone);
    updateGoals({ riaTone: tone });
  };

  const handleToggleWater = (val: boolean) => {
    setWaterReminder(val);
    updateGoals({ waterReminder: val });
  };

  const handleToggleMeal = (val: boolean) => {
    setMealReminder(val);
    updateGoals({ mealReminder: val });
  };

  const handleToggleStep = (val: boolean) => {
    setStepReminder(val);
    updateGoals({ stepReminder: val });
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out of Calori?');
      if (confirmed) {
        await logout();
        onClose();
        if (onSignOut) onSignOut();
      }
      return;
    }
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Calori?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            onClose();
            if (onSignOut) onSignOut();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close preferences"
        />

        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragPill} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleStack}>
                <Text style={styles.sheetTitle}>Preferences & Account</Text>
                <Text style={styles.sheetSubtitle}>Ria AI coach tone, notifications, and security</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedSubtle : null]}
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close preferences"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Ria AI Coaching Tone */}
            <Text style={styles.sectionHeader}>Ria AI Coaching Style</Text>
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [
                  styles.personalityCard,
                  riaTone === 'supportive' ? styles.personalityCardActive : null,
                  pressed ? styles.pressedSubtle : null,
                ]}
                onPress={() => handleSelectTone('supportive')}
                accessibilityRole="button"
                accessibilityState={{ selected: riaTone === 'supportive' }}
                accessibilityLabel="Warm and encouraging tone: Celebrates streaks, offers gentle reminders, positive reinforcement"
              >
                <View style={[styles.personalityIconBox, styles.personalityIconSupportive]}>
                  <Ionicons name="sparkles" size={16} color="#B45309" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.personalityTitle}>Warm & Encouraging</Text>
                  <Text style={styles.personalityDesc}>
                    Celebrates streaks, offers gentle reminders, positive reinforcement.
                  </Text>
                </View>
                {riaTone === 'supportive' ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                ) : null}
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [
                  styles.personalityCard,
                  riaTone === 'focused' ? styles.personalityCardActive : null,
                  pressed ? styles.pressedSubtle : null,
                ]}
                onPress={() => handleSelectTone('focused')}
                accessibilityRole="button"
                accessibilityState={{ selected: riaTone === 'focused' }}
                accessibilityLabel="Disciplined and direct tone: Firm accountability, timely notifications, straightforward calorie targets"
              >
                <View style={[styles.personalityIconBox, styles.personalityIconFocused]}>
                  <Ionicons name="flame" size={16} color="#DC2626" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.personalityTitle}>Disciplined & Direct</Text>
                  <Text style={styles.personalityDesc}>
                    Firm accountability, timely notifications, straightforward calorie targets.
                  </Text>
                </View>
                {riaTone === 'focused' ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                ) : null}
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [
                  styles.personalityCard,
                  riaTone === 'scientific' ? styles.personalityCardActive : null,
                  pressed ? styles.pressedSubtle : null,
                ]}
                onPress={() => handleSelectTone('scientific')}
                accessibilityRole="button"
                accessibilityState={{ selected: riaTone === 'scientific' }}
                accessibilityLabel="Nutritional scientist tone: Deep analytical focus on glycemic response, micronutrients, recovery"
              >
                <View style={[styles.personalityIconBox, styles.personalityIconScientific]}>
                  <Ionicons name="flask" size={16} color="#4338CA" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.personalityTitle}>Nutritional Scientist</Text>
                  <Text style={styles.personalityDesc}>
                    Deep analytical focus on glycemic response, micronutrients, recovery.
                  </Text>
                </View>
                {riaTone === 'scientific' ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                ) : null}
              </Pressable>
            </View>

            {/* 2. Notification Reminders */}
            <Text style={styles.sectionHeader}>Reminders & Alerts</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={[styles.switchIconBox, styles.switchIconWater]}>
                  <Ionicons name="water-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.switchTitle}>Water Reminders</Text>
                  <Text style={styles.switchDesc}>Prompt to log hydration throughout the day</Text>
                </View>
                <Switch
                  value={waterReminder}
                  onValueChange={handleToggleWater}
                  trackColor={{ false: '#CBD5E1', true: SWITCH_TRACK_ACTIVE }}
                  thumbColor={waterReminder ? Colors.primary : '#F8FAFC'}
                  accessibilityLabel="Toggle water reminders"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={[styles.switchIconBox, styles.switchIconMeal]}>
                  <Ionicons name="restaurant-outline" size={18} color="#EA580C" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.switchTitle}>Meal Logging Reminders</Text>
                  <Text style={styles.switchDesc}>Breakfast, lunch, and dinner nudges</Text>
                </View>
                <Switch
                  value={mealReminder}
                  onValueChange={handleToggleMeal}
                  trackColor={{ false: '#CBD5E1', true: SWITCH_TRACK_ACTIVE }}
                  thumbColor={mealReminder ? Colors.primary : '#F8FAFC'}
                  accessibilityLabel="Toggle meal logging reminders"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={[styles.switchIconBox, styles.switchIconStep]}>
                  <Ionicons name="footsteps-outline" size={18} color="#16A34A" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.switchTitle}>Step Milestone Alerts</Text>
                  <Text style={styles.switchDesc}>Celebrate 5k and 10k daily step marks</Text>
                </View>
                <Switch
                  value={stepReminder}
                  onValueChange={handleToggleStep}
                  trackColor={{ false: '#CBD5E1', true: SWITCH_TRACK_ACTIVE }}
                  thumbColor={stepReminder ? Colors.primary : '#F8FAFC'}
                  accessibilityLabel="Toggle step milestone alerts"
                />
              </View>
            </View>

            {/* 3. Account & Security */}
            <Text style={styles.sectionHeader}>Account & Security</Text>
            <View style={styles.card}>
              <View style={styles.accountRow}>
                <View style={[styles.switchIconBox, styles.switchIconAccount]}>
                  <Ionicons name="mail-outline" size={18} color="#475569" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.accountLabel}>Signed In As</Text>
                  <Text style={styles.accountValue} numberOfLines={1}>
                    {currentUser?.email || (currentUser?.isGuest ? 'Guest Explorer' : 'user@calori.fit')}
                  </Text>
                </View>
                <View style={[styles.statusTag, currentUser?.isGuest ? styles.statusTagGuest : null]}>
                  <Text style={[styles.statusTagText, currentUser?.isGuest ? styles.statusTagTextGuest : null]}>
                    {currentUser?.isGuest ? 'GUEST' : 'ACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.accountRow}>
                <View style={[styles.switchIconBox, styles.switchIconBackup]}>
                  <Ionicons name="cloud-done-outline" size={18} color="#059669" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.accountLabel}>Cloud Backup</Text>
                  <Text style={styles.accountValue}>Auto-synced with Calori Cloud</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
              </View>

              <View style={styles.divider} />

              {/* Sign In or Sign Out Button */}
              {currentUser?.isGuest ? (
                onSignIn ? (
                  <Pressable
                    style={({ pressed }) => [styles.authBtn, pressed ? styles.pressedSubtle : null]}
                    onPress={() => {
                      onClose();
                      onSignIn();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in or create account"
                  >
                    <Ionicons name="log-in-outline" size={18} color={Colors.primary} />
                    <Text style={styles.authBtnText}>Sign In / Create Account</Text>
                  </Pressable>
                ) : null
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.signOutBtn, pressed ? styles.pressedSubtle : null]}
                  onPress={handleLogout}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out of Calori"
                >
                  <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                  <Text style={styles.signOutBtnText}>Sign Out of Calori</Text>
                </Pressable>
              )}
            </View>
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
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  personalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  personalityCardActive: {
    opacity: 1,
  },
  personalityIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
  personalityTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  personalityDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  switchIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#0F172A',
  },
  switchDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  accountLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  accountValue: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#0F172A',
    marginTop: 1,
  },
  statusTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusTagText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#16A34A',
  },
  statusTagGuest: {
    backgroundColor: '#F1F5F9',
  },
  statusTagTextGuest: {
    color: '#64748B',
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  authBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#DC2626',
  },
  personalityIconSupportive: {
    backgroundColor: '#FEF3C7',
  },
  personalityIconFocused: {
    backgroundColor: '#FEE2E2',
  },
  personalityIconScientific: {
    backgroundColor: '#E0E7FF',
  },
  switchIconWater: {
    backgroundColor: '#EFF6FF',
  },
  switchIconMeal: {
    backgroundColor: '#FFF7ED',
  },
  switchIconStep: {
    backgroundColor: '#F0FDF4',
  },
  switchIconAccount: {
    backgroundColor: '#F1F5F9',
  },
  switchIconBackup: {
    backgroundColor: '#ECFDF5',
  },
});
