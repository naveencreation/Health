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
        {/* Left: Avatar + Welcome Text */}
        <View style={styles.userSection}>
          {/* Ellipse 3: 62px x 62px Avatar */}
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
              {currentUser?.isGuest ? 'Guest Explorer' : (userGoals.name || 'Akshay Rajput')}
            </Text>
          </View>
        </View>

        {/* Right: Action Buttons (Auth, Search & Notifications) */}
        <View style={styles.actionButtonsRow}>
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
                size={20}
                color={currentUser?.isGuest ? Colors.primary : "#EF4444"}
              />
            </TouchableOpacity>
          )}

          {/* Ellipse 4: Search Button (38px x 38px) */}
          <TouchableOpacity
            style={styles.circleButton}
            onPress={onSearchPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search-outline" size={20} color={Colors.iconNavy} />
          </TouchableOpacity>

          {/* Ellipse 5: Notification Bell Button (38px x 38px) */}
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => {
              setHasUnreadNotification(false);
              onNotificationsPress && onNotificationsPress();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-outline" size={21} color={Colors.iconNavyAlt} />
            {/* Ellipse 6: Notification Dot (#FFB20B) */}
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  // Frame 19: Top Bar (Clean, height 62px, background #FFFFFF)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  // Ellipse 3: 58px x 58px
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    fontFamily: Fonts.kurale,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textMuted,
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
    fontFamily: Fonts.kurale,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textPrimary,
    fontWeight: '400',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  authButtonHighlight: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.badgeOrange,
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
