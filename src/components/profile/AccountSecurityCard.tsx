import React from 'react';
import { StyleSheet, View, Text, Pressable, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

interface AccountSecurityCardProps {
  onSignOut?: () => void;
  onSignIn?: () => void;
}

export const AccountSecurityCard: React.FC<AccountSecurityCardProps> = ({ onSignOut, onSignIn }) => {
  const { currentUser, logout } = useHealth();

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out of Calori?');
      if (confirmed) {
        await logout();
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
            if (onSignOut) onSignOut();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.cardTitle}>Account & Security</Text>
          <Text style={styles.cardSubtitle}>Manage your credentials and login session</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#059669" />
        </View>
      </View>

      {/* Account Info Details */}
      <View style={styles.infoRow}>
        <View style={styles.infoIconCircle}>
          <Ionicons name="mail" size={18} color={Colors.primary} />
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.infoLabel}>Signed In As</Text>
          <Text style={styles.infoValue}>
            {currentUser?.email || (currentUser?.isGuest ? 'Guest Explorer' : 'Not Provided')}
          </Text>
        </View>
        <View style={[styles.statusPill, currentUser?.isGuest ? styles.statusPillGuest : null]}>
          <Text style={[styles.statusPillText, currentUser?.isGuest ? styles.statusPillTextGuest : null]}>
            {currentUser?.isGuest ? 'GUEST' : 'ACTIVE'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Security Actions */}
      <View style={styles.actionList}>
        <View style={styles.actionItem}>
          <View style={styles.actionLeft}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.actionIcon} />
            <Text style={styles.actionText}>Password & Authentication</Text>
          </View>
          <Text style={styles.actionMeta}>Secured</Text>
        </View>

        <View style={styles.actionItem}>
          <View style={styles.actionLeft}>
            <Ionicons name="cloud-done-outline" size={20} color="#059669" style={styles.actionIcon} />
            <Text style={styles.actionText}>Cloud Backup</Text>
          </View>
          <Text style={styles.actionMetaGreen}>Auto-Synced</Text>
        </View>
      </View>

      {/* Auth Action Button */}
      {currentUser?.isGuest ? (
        <View style={styles.buttonStack}>
          {onSignIn ? (
            <Pressable
              style={({ pressed }) => [styles.signInButton, pressed ? styles.signInButtonPressed : null]}
              onPress={onSignIn}
              accessibilityRole="button"
              accessibilityLabel="Sign in or create account"
              testID="btn-profile-signin"
            >
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
              <Text style={styles.signInButtonText}>Sign In / Create Account</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed ? styles.logoutButtonPressed : null]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Exit guest session"
            testID="btn-profile-reset-guest"
          >
            <Ionicons name="refresh-outline" size={18} color="#DC2626" />
            <Text style={styles.logoutButtonText}>Exit Guest Session</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed ? styles.logoutButtonPressed : null]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sign out of Calori"
          testID="btn-profile-signout"
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Sign Out of Calori</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 16,
    color: '#0F172A',
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  infoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  infoValue: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
    marginTop: 1,
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#059669',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  actionList: {
    gap: 12,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 10,
  },
  actionText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#334155',
  },
  actionMeta: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
  },
  actionMetaGreen: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#059669',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    height: 48,
    gap: 8,
    marginTop: 4,
  },
  logoutButtonPressed: {
    backgroundColor: '#FEE2E2',
    transform: [{ scale: 0.985 }],
  },
  logoutButtonText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#DC2626',
  },
  statusPillGuest: {
    backgroundColor: '#FEF3C7',
  },
  statusPillTextGuest: {
    color: '#D97706',
  },
  buttonStack: {
    gap: 8,
    marginTop: 4,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 48,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  signInButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  signInButtonText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
