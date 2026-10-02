import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

const HEALTH_CONNECT_LOGO = require('../../../assets/health_connect_logo.webp');

export interface HealthConnectSyncCardProps {
  isConnected: boolean;
  loading?: boolean;
  syncedCount?: number;
  feedbackMessage?: string;
  onConnect: () => void;
  onOpenSettings?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const HealthConnectSyncCard: React.FC<HealthConnectSyncCardProps> = ({
  isConnected,
  loading = false,
  syncedCount = 0,
  feedbackMessage,
  onConnect,
  onOpenSettings,
  style,
}) => {
  const handleConnectPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onConnect();
  };

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onOpenSettings) onOpenSettings();
  };

  // State 2: Once Connected — Minimalist Status Bar (~48px)
  if (isConnected) {
    return (
      <View style={[styles.wrapper, style]}>
        <Pressable
          style={({ pressed }) => [styles.connectedBar, pressed && styles.barPressed]}
          onPress={handleSettingsPress}
          accessibilityRole="button"
          accessibilityLabel="Manage Health Connect settings"
        >
          {/* Left: Health Connect Logo + Green Pulse Dot + Label */}
          <View style={styles.connectedLeft}>
            <Image
              source={HEALTH_CONNECT_LOGO}
              style={styles.logoConnected}
              contentFit="contain"
              accessibilityLabel="Google Health Connect logo"
            />
            <View style={styles.pulseDot} />
            <Text style={styles.connectedTitle}>Health Connect Active</Text>
          </View>

          {/* Right: Step Count Badge + Refresh Trigger */}
          <View style={styles.connectedRight}>
            {syncedCount > 0 ? (
              <View style={styles.stepsBadge}>
                <Text style={styles.stepsBadgeText}>
                  ✓ {syncedCount.toLocaleString()} steps
                </Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.syncIconBtn, pressed && styles.btnPressed]}
              onPress={handleConnectPress}
              disabled={loading}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Sync steps data now"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Ionicons name="sync-outline" size={17} color="#0F172A" />
              )}
            </Pressable>
          </View>
        </Pressable>

        {/* Only show feedback text below if 0 steps or if it's an alert */}
        {feedbackMessage && syncedCount === 0 && !feedbackMessage.startsWith('✓') ? (
          <Text style={styles.feedbackText}>{feedbackMessage}</Text>
        ) : null}
      </View>
    );
  }

  // State 1: When Disconnected — 1-Tap Setup Tile (~68px)
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.setupCard}>
        {/* Left: Official Health Connect Logo */}
        <Image
          source={HEALTH_CONNECT_LOGO}
          style={styles.logoSetup}
          contentFit="contain"
          accessibilityLabel="Google Health Connect logo"
        />

        {/* Center: Value Proposition */}
        <View style={styles.setupInfo}>
          <Text style={styles.setupTitle}>Auto-Sync Steps</Text>
          <Text style={styles.setupSubtitle}>Google Fit · Samsung Health · Watch</Text>
        </View>

        {/* Right: 1-Tap Setup Button */}
        <Pressable
          style={({ pressed }) => [
            styles.setupBtn,
            pressed && styles.btnPressed,
            loading && styles.btnDisabled,
          ]}
          onPress={handleConnectPress}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Connect Health Connect"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.setupBtnText}>Set Up</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>

      {feedbackMessage ? (
        <Text style={styles.feedbackNoticeText}>{feedbackMessage}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 24,
  },
  // Connected State Styles (~48px height)
  connectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  barPressed: {
    backgroundColor: '#F8FAFC',
  },
  connectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoConnected: {
    width: 22,
    height: 22,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  connectedTitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#0F172A',
  },
  connectedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepsBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stepsBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#15803D',
  },
  syncIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Setup State Styles (~68px height)
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  logoSetup: {
    width: 36,
    height: 36,
  },
  setupInfo: {
    flex: 1,
  },
  setupTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14.5,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  setupSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  setupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  setupBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  feedbackText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#15803D',
    marginTop: 6,
    textAlign: 'center',
  },
  feedbackNoticeText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#D97706',
    marginTop: 6,
    textAlign: 'center',
  },
});
