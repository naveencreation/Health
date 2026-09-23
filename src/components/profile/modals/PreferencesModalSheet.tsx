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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useGoals } from '@/context/HealthContext';
import { AIService } from '@/services/ai';
import { BYOKSetupModal } from '@/components/modals/BYOKSetupModal';
import { GeminiIcon } from '@/components/common/GeminiIcon';

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
  const { currentUser, logout, deleteAccount } = useAuth();
  const { userGoals, updateGoals } = useGoals();
  const [isDeleting, setIsDeleting] = useState(false);

  const [riaTone, setRiaTone] = useState<'supportive' | 'focused' | 'scientific'>(userGoals.riaTone || 'supportive');
  const [waterReminder, setWaterReminder] = useState(userGoals.waterReminder !== false);
  const [mealReminder, setMealReminder] = useState(userGoals.mealReminder !== false);
  const [stepReminder, setStepReminder] = useState(userGoals.stepReminder || false);

  // AI BYOK Configuration States
  const [byokModalVisible, setByokModalVisible] = useState(false);
  const [aiConnected, setAiConnected] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState('');

  const refreshAIStatus = async () => {
    const configured = await AIService.isKeyConfigured();
    setAiConnected(configured);
    if (configured) {
      const masked = await AIService.getMaskedKey();
      setMaskedApiKey(masked);
    } else {
      setMaskedApiKey('');
    }
  };

  React.useEffect(() => {
    if (visible) {
      setRiaTone(userGoals.riaTone || 'supportive');
      setWaterReminder(userGoals.waterReminder !== false);
      setMealReminder(userGoals.mealReminder !== false);
      setStepReminder(userGoals.stepReminder || false);
      refreshAIStatus();
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

  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLogoutPress = () => {
    setConfirmAction('logout');
    setDeleteError(null);
  };

  const handleDeletePress = () => {
    setConfirmAction('delete');
    setDeleteError(null);
  };

  const handleExecuteLogout = async () => {
    await logout();
    setConfirmAction(null);
    onClose();
    if (onSignOut) onSignOut();
  };

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteAccount();
    setIsDeleting(false);
    if (res.success) {
      setConfirmAction(null);
      onClose();
      if (onSignOut) onSignOut();
    } else {
      setDeleteError(res.error || 'Failed to delete account.');
    }
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

            {/* AI Intelligence Engine (BYOK) */}
            <Text style={styles.sectionHeader}>Gemini AI Engine (BYOK)</Text>
            <View style={styles.byokCard}>
              <View style={styles.byokHeaderRow}>
                <View style={styles.byokIconBox}>
                  <GeminiIcon size={24} />
                </View>
                <View style={styles.flex1}>
                  <View style={styles.byokTitleRow}>
                    <Text style={styles.byokTitle}>Gemini AI</Text>
                    <View style={[styles.statusPill, aiConnected ? styles.statusPillActive : styles.statusPillInactive]}>
                      <View style={[styles.statusDot, aiConnected ? styles.statusDotActive : styles.statusDotInactive]} />
                      <Text style={[styles.statusPillText, aiConnected ? styles.statusTextActive : styles.statusTextInactive]}>
                        {aiConnected ? 'Active' : 'Not Connected'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.byokDesc}>
                    {aiConnected
                      ? 'Powers Ria 1-on-1 coaching & AI camera food vision.'
                      : 'Connect your personal Google Gemini API key to enable live coaching and food vision.'}
                  </Text>
                </View>
              </View>

              {aiConnected && maskedApiKey ? (
                <View style={styles.byokKeyChip}>
                  <View style={styles.byokKeyChipLeft}>
                    <Ionicons name="key-outline" size={13} color="#F47551" />
                    <Text style={styles.byokKeyChipLabel}>Key:</Text>
                    <Text style={styles.byokKeyChipValue}>{maskedApiKey}</Text>
                  </View>
                  <View style={styles.byokSecureTag}>
                    <Ionicons name="shield-checkmark" size={11} color="#059669" />
                    <Text style={styles.byokSecureText}>Encrypted</Text>
                  </View>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.byokActionBtn,
                  pressed ? styles.byokActionBtnPressed : null,
                ]}
                onPress={() => setByokModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Manage Gemini API key"
              >
                <View style={styles.byokActionLeft}>
                  <View style={styles.byokActionIconCircle}>
                    <Ionicons
                      name={aiConnected ? 'settings-outline' : 'key-outline'}
                      size={14}
                      color="#EA580C"
                    />
                  </View>
                  <Text style={styles.byokActionBtnText}>
                    {aiConnected ? 'Manage Key & Settings' : 'Connect Personal Gemini Key'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#EA580C" />
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
                <>
                  <Pressable
                    style={({ pressed }) => [styles.signOutBtn, pressed ? styles.pressedSubtle : null]}
                    onPress={handleLogoutPress}
                    disabled={isDeleting}
                    accessibilityRole="button"
                    accessibilityLabel="Sign out of Calori"
                  >
                    <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                    <Text style={styles.signOutBtnText}>Sign Out of Calori</Text>
                  </Pressable>

                  <View style={styles.divider} />

                  <Pressable
                    style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressedSubtle : null]}
                    onPress={handleDeletePress}
                    disabled={isDeleting}
                    accessibilityRole="button"
                    accessibilityLabel="Delete Account Permanently"
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        <Text style={styles.deleteBtnText}>Delete Account Permanently</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </View>

        {/* In-App Confirmation Dialog Overlay */}
        {confirmAction ? (
          <View style={styles.confirmOverlay}>
            <Pressable
              style={styles.confirmBackdrop}
              onPress={() => {
                if (!isDeleting) {
                  setConfirmAction(null);
                  setDeleteError(null);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss confirmation"
            />
            <View style={styles.confirmCard}>
              <View
                style={[
                  styles.confirmIconBadge,
                  confirmAction === 'delete' ? styles.confirmIconBadgeDelete : styles.confirmIconBadgeLogout,
                ]}
              >
                <Ionicons
                  name={confirmAction === 'delete' ? 'trash-outline' : 'log-out-outline'}
                  size={26}
                  color={confirmAction === 'delete' ? '#DC2626' : Colors.primary}
                />
              </View>

              <Text style={styles.confirmTitle}>
                {confirmAction === 'delete' ? 'Delete Account Permanently?' : 'Sign Out of Calori?'}
              </Text>

              <Text style={styles.confirmMessage}>
                {confirmAction === 'delete'
                  ? 'This will permanently wipe your profile, custom calorie targets, streak, and meal history. This action cannot be undone.'
                  : 'You will need to sign back in to access your daily meal logs, streaks, and personalized coaching.'}
              </Text>

              {deleteError ? (
                <View style={styles.confirmErrorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.confirmErrorText}>{deleteError}</Text>
                </View>
              ) : null}

              <View style={styles.confirmActionsCol}>
                <Pressable
                  style={({ pressed }) => [
                    styles.confirmPrimaryBtn,
                    confirmAction === 'delete' ? styles.confirmPrimaryBtnDelete : styles.confirmPrimaryBtnLogout,
                    pressed ? styles.pressedButton : null,
                    isDeleting ? styles.disabledButton : null,
                  ]}
                  onPress={confirmAction === 'delete' ? handleExecuteDelete : handleExecuteLogout}
                  disabled={isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel={confirmAction === 'delete' ? 'Delete Permanently' : 'Sign Out'}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmPrimaryBtnText}>
                      {confirmAction === 'delete' ? 'Delete Permanently' : 'Sign Out'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.confirmCancelBtn,
                    pressed ? styles.confirmCancelBtnPressed : null,
                  ]}
                  onPress={() => {
                    setConfirmAction(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* BYOK Key Setup Modal */}
        <BYOKSetupModal
          visible={byokModalVisible}
          onClose={() => setByokModalVisible(false)}
          onKeyConfigured={refreshAIStatus}
        />
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
    fontSize: 14,
    color: '#DC2626',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  deleteBtnText: {
    fontFamily: Fonts.poppins.medium,
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
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  confirmBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
        }
      : {}),
  },
  confirmIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmIconBadgeLogout: {
    backgroundColor: '#FFF7ED',
  },
  confirmIconBadgeDelete: {
    backgroundColor: '#FEF2F2',
  },
  confirmTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  confirmMessage: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  confirmErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  confirmErrorText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#B91C1C',
    flex: 1,
  },
  confirmActionsCol: {
    width: '100%',
    gap: 10,
  },
  confirmPrimaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrimaryBtnLogout: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmPrimaryBtnDelete: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmPrimaryBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  confirmCancelBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  confirmCancelBtnPressed: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    transform: [{ scale: 0.985 }],
  },
  confirmCancelBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 15,
    color: '#475569',
  },
  pressedButton: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  disabledButton: {
    opacity: 0.65,
  },
  byokCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  byokHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  byokIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  byokTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  byokTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14.5,
    color: '#0F172A',
  },
  byokDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16.5,
    marginTop: 2,
  },
  byokKeyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
  },
  byokKeyChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  byokKeyChipLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  byokKeyChipValue: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  byokSecureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderCurve: 'continuous',
    gap: 3,
  },
  byokSecureText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9.5,
    color: '#059669',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 4,
  },
  statusPillActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  statusPillInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#16A34A',
  },
  statusDotInactive: {
    backgroundColor: '#94A3B8',
  },
  statusPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
  },
  statusTextActive: {
    color: '#16A34A',
  },
  statusTextInactive: {
    color: '#64748B',
  },
  byokActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginTop: 12,
  },
  byokActionBtnPressed: {
    backgroundColor: '#FFEDD5',
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  byokActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  byokActionIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  byokActionBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#EA580C',
  },
});
