import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';
import { UserAvatar } from '@/components/common/UserAvatar';

interface ProfileHeaderCardProps {
  name: string;
  email: string;
  avatarUrl?: string;
  onEditAvatar: () => void;
  isGuest?: boolean;
  onBack?: () => void;
  onOpenSettings?: () => void;
  streakDays?: number;
  showNav?: boolean;
  isPro?: boolean;
  onPressPro?: () => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  name,
  email,
  avatarUrl,
  onEditAvatar,
  isGuest,
  onBack,
  onOpenSettings,
  streakDays = 7,
  showNav = false,
  isPro = false,
  onPressPro,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Optional Top Navigation Bar (Hidden when screen top app bar is active) */}
      {showNav ? (
        <View style={styles.navBar}>
          {onBack ? (
            <Pressable
              style={({ pressed }) => [styles.navCircleBtn, pressed ? styles.pressedSubtle : null]}
              onPress={onBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={20} color={Colors.iconNavy} />
            </Pressable>
          ) : (
            <View style={styles.navPlaceholder} />
          )}

          <Text style={styles.navTitle}>Profile</Text>

          {onOpenSettings ? (
            <Pressable
              style={({ pressed }) => [styles.navCircleBtn, pressed ? styles.pressedSubtle : null]}
              onPress={onOpenSettings}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={20} color={Colors.iconNavy} />
            </Pressable>
          ) : (
            <View style={styles.navPlaceholder} />
          )}
        </View>
      ) : null}

      {/* 2. User Identity Card */}
      <View style={styles.identityCard}>
        <Pressable
          style={({ pressed }) => [styles.avatarWrapper, pressed ? styles.avatarPressed : null]}
          onPress={onEditAvatar}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Change avatar"
        >
          <UserAvatar
            avatarUrl={avatarUrl || DEFAULT_AVATAR_URL}
            size={64}
            borderColor="#FFFFFF"
            borderWidth={2.5}
          />
          <View style={styles.cameraIconBadge}>
            <Ionicons name="camera" size={11} color="#FFFFFF" />
          </View>
        </Pressable>

        <View style={styles.identityInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {name || (isGuest ? 'Guest Explorer' : 'Calorify Member')}
          </Text>
          {email && email !== name ? (
            <Text style={styles.userEmail} numberOfLines={1}>
              {email}
            </Text>
          ) : null}

          <View style={styles.statusRow}>
            {isGuest ? (
              <View style={styles.guestBadge}>
                <Ionicons name="person-outline" size={11} color="#64748B" />
                <Text style={styles.guestBadgeText}>Guest Explorer</Text>
              </View>
            ) : isPro ? (
              <Pressable
                onPress={onPressPro}
                disabled={!onPressPro}
                style={styles.proBadge}
                accessibilityRole="button"
                accessibilityLabel="Calorify Pro Member"
              >
                <Ionicons name="ribbon" size={12} color="#A16207" />
                <Text style={styles.proBadgeText}>PRO Member</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={onPressPro}
                disabled={!onPressPro}
                style={styles.upgradeBadge}
                accessibilityRole="button"
                accessibilityLabel="Free tier, tap to upgrade to Pro"
              >
                <Ionicons name="sparkles" size={11} color="#EA580C" />
                <Text style={styles.upgradeBadgeText}>Get Pro</Text>
              </Pressable>
            )}

            <View style={styles.streakPill}>
              <Ionicons name="flame" size={11} color={Colors.primary} />
              <Text style={styles.streakPillText}>{streakDays}-Day Streak</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  navCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    elevation: 0,
    shadowOpacity: 0,
  },
  navPlaceholder: {
    width: 38,
  },
  navTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  pressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0F172A',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  identityInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    includeFontPadding: false,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.carbsLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 4,
  },
  proBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: '#A16207',
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    gap: 4,
  },
  upgradeBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: '#EA580C',
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 4,
  },
  guestBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: '#64748B',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: Colors.fatLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  streakPillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.primaryDark,
    includeFontPadding: false,
  },
});
