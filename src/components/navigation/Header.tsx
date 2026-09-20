import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

import { DEFAULT_AVATAR_URL } from '@/data/avatars';
import { UserAvatar } from '@/components/common/UserAvatar';

interface HeaderProps {
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
}

const HIT_SLOP_6 = { top: 6, bottom: 6, left: 6, right: 6 };
const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };

export const Header: React.FC<HeaderProps> = ({
  onSearchPress,
  onNotificationsPress,
  onAvatarPress,
  onSignInPress,
  onSignOutPress,
}) => {
  const { userGoals, currentUser } = useHealth();
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.topBar}>
        {/* Left: Avatar + Welcome Text (Blended directly into screen) */}
        <View style={styles.userSection}>
          {/* Avatar with subtle white glow / border */}
          <Pressable
            style={({ pressed }) => [
              styles.avatarContainer,
              pressed ? styles.avatarPressed : null,
            ]}
            onPress={onAvatarPress}
            hitSlop={HIT_SLOP_6}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <UserAvatar
              avatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
              size={51}
            />
          </Pressable>

          {/* Welcome & Name Stack */}
          <View style={styles.nameStack}>
            <View style={styles.welcomeRow}>
              <Text style={styles.welcomeText}>Welcome</Text>
              {currentUser?.isGuest ? (
                <View style={styles.guestTag}>
                  <Text style={styles.guestTagText}>Guest</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.userNameText} numberOfLines={1}>
              {currentUser?.isGuest ? 'Guest Explorer' : (currentUser?.name || userGoals.name || 'User')}
            </Text>
          </View>
        </View>

        {/* Right: Floating Action Buttons (Search, Notifications) */}
        <View style={styles.actionButtonsRow}>
          {/* Search Button */}
          <Pressable
            style={({ pressed }) => [
              styles.circleButton,
              pressed ? styles.circleButtonPressed : null,
            ]}
            onPress={onSearchPress}
            hitSlop={HIT_SLOP_8}
            accessibilityRole="button"
            accessibilityLabel="Search foods and diary"
          >
            <Ionicons name="search-outline" size={18} color="#0F172A" />
          </Pressable>

          {/* Notification Bell Button */}
          <Pressable
            style={({ pressed }) => [
              styles.circleButton,
              pressed ? styles.circleButtonPressed : null,
            ]}
            onPress={() => {
              setHasUnreadNotification(false);
              if (onNotificationsPress) {
                onNotificationsPress();
              }
            }}
            hitSlop={HIT_SLOP_8}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={18} color="#0F172A" />
            {hasUnreadNotification ? <View style={styles.notificationDot} /> : null}
          </Pressable>
        </View>
      </View>

      {/* Guest Banner if exploring without registered account */}
      {currentUser?.isGuest && onSignInPress ? (
        <Pressable
          style={({ pressed }) => [
            styles.guestBanner,
            pressed ? styles.guestBannerPressed : null,
          ]}
          onPress={onSignInPress}
          accessibilityRole="button"
          accessibilityLabel="Guest Mode, tap to sign in or create account"
        >
          <View style={styles.guestBannerLeft}>
            <Ionicons name="sparkles" size={14} color="#D97706" />
            <Text style={styles.guestBannerText}>
              Guest Mode • <Text style={styles.guestBannerBold}>Sign In / Create Account</Text>
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={14} color="#D97706" />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  nameStack: {
    marginLeft: 12,
    justifyContent: 'center',
    flex: 1,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  welcomeText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13.5,
    lineHeight: 18,
    color: '#64748B',
    letterSpacing: -0.1,
  },
  guestTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  guestTagText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#D97706',
  },
  userNameText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 21,
    lineHeight: 27,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  circleButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F97316',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  guestBannerPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  guestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestBannerText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#92400E',
  },
  guestBannerBold: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#B45309',
    textDecorationLine: 'underline',
  },
});
