import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
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
  scrollY?: Animated.Value;
  isScrolled?: boolean;
}

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const HIT_SLOP_6 = { top: 6, bottom: 6, left: 6, right: 6 };
const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };

const HeaderComponent: React.FC<HeaderProps> = ({
  onSearchPress,
  onNotificationsPress,
  onAvatarPress,
  onSignInPress,
  onSignOutPress,
  scrollY,
  isScrolled,
}) => {
  const { userGoals, currentUser, selectedDate, remainingCalories } = useHealth();
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  const todayStr = useMemo(() => toDateString(new Date()), []);
  const isViewingToday = selectedDate === todayStr;

  const formattedDate = useMemo(() => {
    if (!selectedDate) return 'Today';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayName = SHORT_DAY_NAMES[d.getDay()];
      const monthName = SHORT_MONTHS[d.getMonth()];
      const dayNum = d.getDate();
      return isViewingToday ? `Today • ${dayNum} ${monthName}` : `${dayName}, ${dayNum} ${monthName}`;
    }
    return selectedDate;
  }, [selectedDate, isViewingToday]);

  const calLeft = remainingCalories ?? 0;
  const isOverBudget = calLeft < 0;

  // 60fps Native driver interpolations for continuous morphing
  const avatarScale = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 45],
        outputRange: [1, 0.72],
        extrapolate: 'clamp',
      })
    : 1;

  const welcomeOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 25],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : 1;

  const welcomeTranslateY = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 25],
        outputRange: [0, -6],
        extrapolate: 'clamp',
      })
    : 0;

  const collapsedOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [20, 45],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 0;

  const collapsedTranslateY = scrollY
    ? scrollY.interpolate({
        inputRange: [20, 45],
        outputRange: [6, 0],
        extrapolate: 'clamp',
      })
    : 0;

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.topBar}>
        {/* Left: Avatar + Morphing Text (Welcome Naveen -> Today & Calorie HUD) */}
        <View style={styles.userSection}>
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
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
          </Animated.View>

          {/* Morphing Center Zone */}
          <View style={styles.textMorphZone}>
            {/* 1. Welcome Stack (Visible at rest, fades out on scroll) */}
            <Animated.View
              style={[
                styles.welcomeStack,
                {
                  opacity: welcomeOpacity,
                  transform: [{ translateY: welcomeTranslateY }],
                  pointerEvents: isScrolled ? 'none' : 'auto',
                },
              ]}
            >
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
            </Animated.View>

            {/* 2. Collapsed HUD (Fades in on scroll in the exact same spot) */}
            {scrollY ? (
              <Animated.View
                style={[
                  styles.collapsedHudStack,
                  {
                    opacity: collapsedOpacity,
                    transform: [{ translateY: collapsedTranslateY }],
                    pointerEvents: isScrolled ? 'auto' : 'none',
                  },
                ]}
              >
                <Text style={styles.collapsedDateText} numberOfLines={1}>
                  {formattedDate}
                </Text>
                <View
                  style={[
                    styles.caloriePill,
                    isOverBudget ? styles.caloriePillOver : styles.caloriePillOk,
                  ]}
                >
                  <View
                    style={[
                      styles.calorieDot,
                      isOverBudget ? styles.calorieDotOver : styles.calorieDotOk,
                    ]}
                  />
                  <Text
                    style={[
                      styles.calorieText,
                      isOverBudget ? styles.calorieTextOver : styles.calorieTextOk,
                    ]}
                    numberOfLines={1}
                  >
                    {calLeft >= 0
                      ? `${calLeft.toLocaleString()} cal left`
                      : `${Math.abs(calLeft).toLocaleString()} cal over`}
                  </Text>
                </View>
              </Animated.View>
            ) : null}
          </View>
        </View>

        {/* Right: Search and Notification Buttons (Rock solid, zero movement!) */}
        <View style={styles.actionButtonsRow}>
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
    backgroundColor: '#FAF9F6',
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 60,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  textMorphZone: {
    marginLeft: 10,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  welcomeStack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  welcomeText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    lineHeight: 17,
    color: '#64748B',
    letterSpacing: -0.1,
  },
  guestTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  guestTagText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 9.5,
    color: '#D97706',
  },
  userNameText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    lineHeight: 25,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  collapsedHudStack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedDateText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '700',
    flexShrink: 1,
  },
  caloriePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7.5,
    paddingVertical: 3,
    borderRadius: 9,
    gap: 4.5,
  },
  caloriePillOk: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  caloriePillOver: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  calorieDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  calorieDotOk: {
    backgroundColor: '#F97316',
  },
  calorieDotOver: {
    backgroundColor: '#EF4444',
  },
  calorieText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10.5,
  },
  calorieTextOk: {
    color: '#C2410C',
  },
  calorieTextOver: {
    color: '#DC2626',
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

export const Header = React.memo(HeaderComponent);
