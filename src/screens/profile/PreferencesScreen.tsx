import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
import { AIService } from '@/services/ai';
import { BYOKSetupModal } from '@/components/modals/BYOKSetupModal';
import { GeminiIcon } from '@/components/common/GeminiIcon';
import { ConfirmationModal } from '@/components';

const SWITCH_TRACK_ACTIVE = `${Colors.primary}80`;
const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

interface PreferencesScreenProps {
  onBack: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const PreferencesScreen: React.FC<PreferencesScreenProps> = ({
  onBack,
  onSignIn,
  onSignOut,
}) => {
  const { currentUser, logout, deleteAccount, userGoals, updateGoals } = useHealth();
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

  useEffect(() => {
    setRiaTone(userGoals.riaTone || 'supportive');
    setWaterReminder(userGoals.waterReminder !== false);
    setMealReminder(userGoals.mealReminder !== false);
    setStepReminder(userGoals.stepReminder || false);
    refreshAIStatus();
  }, [userGoals]);

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
    onBack();
    if (onSignOut) onSignOut();
  };

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteAccount();
    setIsDeleting(false);
    if (res.success) {
      setConfirmAction(null);
      onBack();
      if (onSignOut) onSignOut();
    } else {
      setDeleteError(res.error || 'Failed to delete account.');
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* 1. Unified Top Navigation Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [styles.headerBackBtn, pressed ? styles.btnPressed : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Go back to profile"
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Preferences & Account
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              AI coach style, notifications & security
            </Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
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

        {/* 2. AI Intelligence Engine (BYOK) */}
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

        {/* 3. Notification Reminders */}
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

        {/* 4. Account & Security */}
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
                  onBack();
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

      {/* Sub-modals for BYOK & Account Actions */}
      <BYOKSetupModal
        visible={byokModalVisible}
        onClose={() => {
          setByokModalVisible(false);
          refreshAIStatus();
        }}
      />

      <ConfirmationModal
        visible={confirmAction === 'logout'}
        title="Sign Out of Calori?"
        message="Your offline meal logs and streak will remain safe on this device."
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmStyle="destructive"
        iconName="log-out-outline"
        onConfirm={handleExecuteLogout}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmationModal
        visible={confirmAction === 'delete'}
        title="Delete Account Permanently?"
        message={
          deleteError
            ? `Error: ${deleteError}\n\nPlease try again or contact support.`
            : 'This will irreversibly erase your entire nutrition profile, personal weight metrics, and streak history.'
        }
        confirmText="Delete Permanently"
        cancelText="Cancel"
        confirmStyle="destructive"
        iconName="trash-outline"
        isLoading={isDeleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => {
          setConfirmAction(null);
          setDeleteError(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    minHeight: 64,
    justifyContent: 'center',
    zIndex: 10,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    lineHeight: 28,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginTop: 1,
    includeFontPadding: false,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 16,
  },
  sectionHeader: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  personalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 12,
  },
  personalityCardActive: {
    backgroundColor: '#FFF8F6',
  },
  personalityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  personalityTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  personalityDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    marginTop: 1,
  },
  byokCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  byokHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  byokIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF1EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  byokTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  byokTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
  },
  byokDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillInactive: {
    backgroundColor: '#F1F5F9',
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
  },
  statusTextActive: {
    color: '#15803D',
    fontWeight: '600',
  },
  statusTextInactive: {
    color: '#64748B',
  },
  byokKeyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  byokKeyChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  byokKeyChipLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  byokKeyChipValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#0F172A',
  },
  byokSecureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  byokSecureText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#059669',
  },
  byokActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  byokActionBtnPressed: {
    opacity: 0.8,
  },
  byokActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  byokActionIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  byokActionBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12.5,
    color: '#EA580C',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  switchIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchIconWater: {
    backgroundColor: '#DBEAFE',
  },
  switchIconMeal: {
    backgroundColor: '#FFEDD5',
  },
  switchIconStep: {
    backgroundColor: '#DCFCE7',
  },
  switchIconAccount: {
    backgroundColor: '#F1F5F9',
  },
  switchIconBackup: {
    backgroundColor: '#D1FAE5',
  },
  switchTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  switchDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  accountLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#64748B',
  },
  accountValue: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
    color: '#0F172A',
  },
  statusTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusTagGuest: {
    backgroundColor: '#FEF3C7',
  },
  statusTagText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: '#15803D',
    fontWeight: '700',
  },
  statusTagTextGuest: {
    color: '#D97706',
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  authBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
    color: Colors.primary,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  signOutBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
    color: '#DC2626',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  deleteBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    marginVertical: 4,
  },
  pressedSubtle: {
    opacity: 0.8,
  },
  flex1: {
    flex: 1,
  },
});
