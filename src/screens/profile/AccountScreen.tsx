import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput } from 'react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth } from '@/context/HealthContext';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { usePro, ProPaywallModal } from '@/features/subscription';
import { PLAN_NAMES } from '@/services/payments/paymentService';
import {
  SubScreenHeader,
  SettingsSection,
  SettingsRow,
  ProfileButton,
  SheetNotice,
  profileScreenStyles,
} from '@/components/profile/ProfileUI';

interface AccountScreenProps {
  onBack: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({ onBack, onSignIn, onSignOut }) => {
  const { currentUser, logout, deleteAccount } = useAuth();
  const { isPro, activePlanId } = usePro();
  const isGuest = !currentUser || Boolean(currentUser.isGuest);
  // Email accounts must re-enter their password before deletion
  const needsPassword = Boolean(currentUser?.email) && !isGuest;

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutUnsynced, setLogoutUnsynced] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const busy = isSigningOut || isDeleting;

  const handleExecuteLogout = async () => {
    setIsSigningOut(true);
    setLogoutError(null);
    let done = false;
    try {
      // Second tap after an unsynced warning signs out anyway
      done = await logout(logoutUnsynced);
    } catch {
      setLogoutError("Couldn't sign out. Check your connection and try again.");
      return;
    } finally {
      setIsSigningOut(false);
    }
    if (!done) {
      setLogoutUnsynced(true);
      return;
    }
    setLogoutUnsynced(false);
    setConfirmAction(null);
    onBack();
    onSignOut?.();
  };

  const handleExecuteDelete = async () => {
    if (needsPassword && !deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteAccount(needsPassword ? deletePassword : undefined);
    setIsDeleting(false);
    if (res.success) {
      setDeletePassword('');
      setConfirmAction(null);
      onBack();
      onSignOut?.();
    } else {
      setDeleteError(res.error || 'Failed to delete account.');
    }
  };

  const deleteMessage =
    'This permanently erases your account, logs, weight history, custom foods, Ria chats and streak, in the cloud and on this device.';

  return (
    <View style={profileScreenStyles.root}>
      <SubScreenHeader
        title="Account & security"
        subtitle="Sign-in, membership and your data"
        onBack={onBack}
      />
      <ScrollView
        style={profileScreenStyles.scroll}
        contentContainerStyle={profileScreenStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Account">
          <SettingsRow
            icon="person-circle-outline"
            title={isGuest ? 'Guest on this device' : 'Signed in as'}
            subtitle={
              isGuest
                ? 'Nothing is backed up yet'
                : currentUser?.email || currentUser?.name || 'Calorify member'
            }
          />
          {!isGuest ? (
            <SettingsRow
              icon="cloud-outline"
              iconColor={Colors.waterDark}
              iconBackground={Colors.waterTrack}
              title="Cloud backup"
              subtitle="Your logs sync to your account when you're online"
            />
          ) : null}
          <SettingsRow
            icon="star-outline"
            iconColor={Colors.warningDark}
            iconBackground={Colors.warningLight}
            title="Membership"
            subtitle={
              isPro
                ? `Calorify Pro · ${activePlanId ? PLAN_NAMES[activePlanId] : 'Active'}`
                : 'Free plan'
            }
            onPress={() => setPaywallVisible(true)}
            accessibilityLabel={isPro ? 'Manage Pro Subscription' : 'Upgrade to Calorify Pro'}
          />
        </SettingsSection>

        {isGuest ? (
          onSignIn ? (
            <SettingsSection footer="Create an account to back up your history and use it on another phone.">
              <View style={styles.pad}>
                <ProfileButton
                  label="Sign in or create account"
                  variant="primary"
                  onPress={() => {
                    onBack();
                    onSignIn();
                  }}
                />
              </View>
            </SettingsSection>
          ) : null
        ) : (
          <View style={styles.actions}>
            <ProfileButton
              label="Sign out"
              onPress={() => {
                setLogoutError(null);
                setConfirmAction('logout');
              }}
              disabled={busy}
              accessibilityLabel="Sign out of Calorify"
            />
            <ProfileButton
              label="Delete account"
              variant="danger"
              onPress={() => {
                setDeleteError(null);
                setDeletePassword('');
                setConfirmAction('delete');
              }}
              disabled={busy}
              accessibilityLabel="Delete Account Permanently"
            />
          </View>
        )}
      </ScrollView>

      <ProPaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />

      <ConfirmationModal
        visible={confirmAction === 'logout'}
        title="Sign out of Calorify?"
        message={
          logoutError ??
          (logoutUnsynced
            ? "Some recent changes haven't reached the cloud yet. Connect to the internet and try again, or sign out anyway and lose them."
            : 'Your logs are saved to your account and load again when you sign back in. They are removed from this device.')
        }
        confirmText={logoutUnsynced ? 'Sign out anyway' : 'Sign out'}
        cancelText="Cancel"
        confirmStyle="destructive"
        iconName="log-out-outline"
        isLoading={isSigningOut}
        onConfirm={handleExecuteLogout}
        onCancel={() => {
          setConfirmAction(null);
          setLogoutUnsynced(false);
          setLogoutError(null);
        }}
      />

      <ConfirmationModal
        visible={confirmAction === 'delete'}
        title="Delete account permanently?"
        message={deleteMessage}
        confirmText="Delete permanently"
        cancelText="Cancel"
        confirmStyle="destructive"
        iconName="trash-outline"
        isLoading={isDeleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => {
          setConfirmAction(null);
          setDeleteError(null);
          setDeletePassword('');
        }}
      >
        {needsPassword && <Text style={styles.label}>Password</Text>}
        {needsPassword && (
          <TextInput
            style={[styles.passwordInput, deleteError ? styles.passwordInputError : null]}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!isDeleting}
            accessibilityLabel="Password, required to delete your account"
          />
        )}
        {deleteError ? <SheetNotice kind="error" text={deleteError} /> : null}
      </ConfirmationModal>
    </View>
  );
};

const styles = StyleSheet.create({
  pad: { padding: 16 },
  label: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 4,
    marginBottom: 6,
  },
  actions: { gap: 10 },
  passwordInput: {
    height: 48,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  passwordInputError: { borderColor: Colors.dangerDark },
});
