import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

import { DEFAULT_AVATAR_URL } from '@/data/avatars';

interface HeaderProps {
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
}

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
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={onAvatarPress}
            activeOpacity={onAvatarPress ? 0.75 : 1}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Image
              source={{
                uri: userGoals.avatarUrl || DEFAULT_AVATAR_URL,
              }}
              style={styles.avatarImage}
            />
          </TouchableOpacity>

          {/* Welcome & Name Stack */}
          <View style={styles.nameStack}>
            <View style={styles.welcomeRow}>
              <Text style={styles.welcomeText}>Welcome</Text>
              {currentUser?.isGuest && (
                <View style={styles.guestTag}>
                  <Text style={styles.guestTagText}>Guest</Text>
                </View>
              )}
            </View>
            <Text style={styles.userNameText} numberOfLines={1}>
              {currentUser?.isGuest ? 'Guest Explorer' : (currentUser?.name || userGoals.name || 'User')}
            </Text>
          </View>
        </View>

        {/* Right: Floating Action Buttons (Streak, Auth, Search, Notifications) */}
        <View style={styles.actionButtonsRow}>
          {/* Streak pill if available */}
          {userGoals.streakDays ? (
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakCount}>{userGoals.streakDays}</Text>
            </View>
          ) : null}

          {/* Auth Button */}
          {(onSignInPress || onSignOutPress) && (
            <TouchableOpacity
              style={[styles.circleButton, currentUser?.isGuest && styles.authButtonHighlight]}
              onPress={currentUser?.isGuest ? onSignInPress : onSignOutPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={currentUser?.isGuest ? "Sign In" : "Sign Out"}
            >
              <Ionicons
                name={currentUser?.isGuest ? "log-in-outline" : "log-out-outline"}
                size={18}
                color={currentUser?.isGuest ? Colors.primary : "#EF4444"}
              />
            </TouchableOpacity>
          )}

          {/* Search Button */}
          <TouchableOpacity
            style={styles.circleButton}
            onPress={onSearchPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search-outline" size={18} color="#0F172A" />
          </TouchableOpacity>

          {/* Notification Bell Button */}
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => {
              setHasUnreadNotification(false);
              onNotificationsPress && onNotificationsPress();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-outline" size={18} color="#0F172A" />
            {hasUnreadNotification && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Guest Banner if exploring without registered account */}
      {currentUser?.isGuest && onSignInPress && (
        <TouchableOpacity
          style={styles.guestBanner}
          onPress={onSignInPress}
          activeOpacity={0.85}
        >
          <View style={styles.guestBannerLeft}>
            <Ionicons name="sparkles" size={14} color="#D97706" />
            <Text style={styles.guestBannerText}>
              Guest Mode • <Text style={styles.guestBannerBold}>Sign In / Create Account</Text>
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={14} color="#D97706" />
        </TouchableOpacity>
      )}
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
    paddingTop: 12,
    paddingBottom: 4,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  nameStack: {
    marginLeft: 10,
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
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },
  guestTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  guestTagText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#D97706',
  },
  userNameText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    lineHeight: 24,
    color: '#0F172A',
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  streakIcon: {
    fontSize: 13,
  },
  streakCount: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '700',
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
  authButtonHighlight: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
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
