import React from 'react';
import { StyleSheet, View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';

interface ProfileHeaderCardProps {
  name: string;
  email: string;
  avatarUrl?: string;
  onEditAvatar: () => void;
  weightNum: number;
  targetWeightNum: number;
  bmi: string;
  bmiColor: string;
  calorieBudget: string;
  isGuest?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  name,
  email,
  avatarUrl,
  onEditAvatar,
  weightNum,
  targetWeightNum,
  bmi,
  bmiColor,
  calorieBudget,
  isGuest,
  onSignIn,
  onSignOut,
}) => {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTopRow}>
        <Pressable
          style={({ pressed }) => [styles.avatarWrapper, pressed && styles.avatarPressed]}
          onPress={onEditAvatar}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Change avatar"
          testID="btn-profile-edit-avatar"
        >
          <Image
            source={{
              uri: avatarUrl || DEFAULT_AVATAR_URL,
            }}
            style={styles.avatarImg}
          />
          <View style={styles.cameraIconBadge}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </Pressable>

        <View style={styles.heroInfo}>
          <View style={styles.nameHeaderRow}>
            <Text style={styles.heroName} numberOfLines={1}>{name || (isGuest ? 'Guest Explorer' : 'User')}</Text>
            {isGuest ? (
              onSignIn ? (
                <Pressable
                  style={({ pressed }) => [styles.authPillBtn, pressed && styles.pressedSubtle]}
                  onPress={onSignIn}
                  hitSlop={6}
                >
                  <Ionicons name="log-in-outline" size={12} color={Colors.primary} />
                  <Text style={styles.authPillBtnText}>Sign In</Text>
                </Pressable>
              ) : null
            ) : (
              onSignOut ? (
                <Pressable
                  style={({ pressed }) => [styles.signOutPillBtn, pressed && styles.pressedSubtle]}
                  onPress={onSignOut}
                  hitSlop={6}
                >
                  <Ionicons name="log-out-outline" size={12} color="#DC2626" />
                  <Text style={styles.signOutPillBtnText}>Sign Out</Text>
                </Pressable>
              ) : null
            )}
          </View>
          <Text style={styles.heroEmail} numberOfLines={1}>{email || (isGuest ? 'Guest Mode' : '')}</Text>
          <View style={styles.badgesRow}>
            <View style={styles.proBadge}>
              <Ionicons name="sparkles" size={11} color="#B45309" />
              <Text style={styles.proBadgeText}>{isGuest ? 'GUEST' : 'PRO VIP'}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 7-Day Streak</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Body Stats Grid Strip */}
      <View style={styles.quickStatsRow}>
        <View style={styles.quickStatCol}>
          <Text style={styles.quickStatVal}>
            {weightNum} <Text style={styles.quickStatUnit}>kg</Text>
          </Text>
          <Text style={styles.quickStatKey}>Current</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStatCol}>
          <Text style={styles.quickStatVal}>
            {targetWeightNum} <Text style={styles.quickStatUnit}>kg</Text>
          </Text>
          <Text style={styles.quickStatKey}>Target</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStatCol}>
          <Text style={[styles.quickStatVal, { color: bmiColor }]}>{bmi}</Text>
          <Text style={styles.quickStatKey}>BMI</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStatCol}>
          <Text style={[styles.quickStatVal, { color: Colors.primary }]}>{calorieBudget}</Text>
          <Text style={styles.quickStatKey}>kcal/day</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroInfo: {
    flex: 1,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  authPillBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  signOutPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  signOutPillBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#DC2626',
  },
  pressedSubtle: {
    opacity: 0.7,
  },
  heroName: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    color: '#0F172A',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  heroEmail: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  proBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#B45309',
    letterSpacing: 0.5,
  },
  streakBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  streakBadgeText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: Colors.primary,
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  quickStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  quickStatUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#64748B',
  },
  quickStatKey: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
});
