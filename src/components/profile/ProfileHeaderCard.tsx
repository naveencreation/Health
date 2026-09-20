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
  onOpenSettings: () => void;
  streakDays?: number;
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
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Top Navigation Bar (< Profile ⚙️) */}
      <View style={styles.navBar}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.navCircleBtn, pressed ? styles.pressedSubtle : null]}
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
        ) : (
          <View style={styles.navPlaceholder} />
        )}

        <Text style={styles.navTitle}>Profile</Text>

        <Pressable
          style={({ pressed }) => [styles.navCircleBtn, pressed ? styles.pressedSubtle : null]}
          onPress={onOpenSettings}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={19} color="#0F172A" />
        </Pressable>
      </View>

      {/* 2. User Identity Row */}
      <View style={styles.identityCard}>
        <Pressable
          style={({ pressed }) => [styles.avatarWrapper, pressed ? styles.avatarPressed : null]}
          onPress={onEditAvatar}
          hitSlop={6}
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
            {email || name || (isGuest ? 'Guest Explorer' : 'Calori User')}
          </Text>

          <View style={styles.statusRow}>
            {isGuest ? (
              <View style={styles.guestBadge}>
                <Ionicons name="person-outline" size={11} color="#64748B" />
                <Text style={styles.guestBadgeText}>Guest Explorer</Text>
              </View>
            ) : (
              <View style={styles.proBadge}>
                <Ionicons name="ribbon" size={12} color="#D97706" />
                <Text style={styles.proBadgeText}>PRO Member</Text>
              </View>
            )}

            <View style={styles.streakPill}>
              <Text style={styles.streakPillText}>🔥 {streakDays}-Day Streak</Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  navPlaceholder: {
    width: 40,
  },
  navTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  pressedSubtle: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.3,
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
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  proBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#B45309',
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  guestBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#64748B',
  },
  streakPill: {
    backgroundColor: '#FFE4D6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  streakPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#F47551',
  },
});
