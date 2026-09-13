import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { useHealth } from '../context/HealthContext';

import { DEFAULT_AVATAR_URL } from '../data/avatars';

interface HeaderProps {
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchPress, onNotificationsPress, onAvatarPress }) => {
  const { userGoals } = useHealth();
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  return (
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
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.userNameText}>{userGoals.name || 'Akshay Rajput'}</Text>
        </View>
      </View>

      {/* Right: Action Buttons (Search & Notifications) */}
      <View style={styles.actionButtonsRow}>
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
  );
};

const styles = StyleSheet.create({
  // Frame 19: Top Bar (Clean, height 62px, background #FFFFFF)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Ellipse 3: 58px x 58px
  avatarContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nameStack: {
    marginLeft: 14,
    justifyContent: 'center',
  },
  welcomeText: {
    fontFamily: Fonts.kurale,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textMuted, // rgba(0, 0, 0, 0.5)
  },
  userNameText: {
    fontFamily: Fonts.kurale,
    fontSize: 19,
    lineHeight: 26,
    color: Colors.textPrimary, // #000000
    fontWeight: '400',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Ellipse 4 & 5: 38px x 38px with #C3D4FC border
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.buttonBorder, // #C3D4FC
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  // Ellipse 6: #FFB20B notification indicator dot
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.badgeOrange, // #FFB20B
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
