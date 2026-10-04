import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

export interface PermissionPrimerStepProps {
  onEnablePermissions: () => void | Promise<void>;
  onSkip: () => void;
}

export const PermissionPrimerStep: React.FC<PermissionPrimerStepProps> = ({
  onEnablePermissions,
  onSkip,
}) => {
  const handleEnable = async () => {
    await haptics.impactMedium();
    await onEnablePermissions();
  };

  const handleSkip = async () => {
    await haptics.selection();
    onSkip();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Badge */}
        <View style={styles.badgeWrap}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color={Colors.primary} />
            <Text style={styles.badgeText}>SMART INTEGRATIONS</Text>
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Unlock Full Precision</Text>
        <Text style={styles.subtitle}>
          Calorify uses your device capabilities to give you instant food recognition and effortless step tracking.
        </Text>

        {/* Permission Feature Cards */}
        <View style={styles.cardList}>
          {/* Card 1: Camera / Food Vision */}
          <View style={styles.featureCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="camera" size={24} color={Colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Instant Meal Scanning</Text>
              <Text style={styles.cardDescription}>
                Snap a quick photo of your plate to let Ria AI identify foods, portion sizes, and calculate macros in seconds.
              </Text>
            </View>
          </View>

          {/* Card 2: Google Health Connect */}
          <View style={styles.featureCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="footsteps" size={24} color="#3B82F6" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Automatic Step Tracking</Text>
              <Text style={styles.cardDescription}>
                Sync steps, active workout duration, and calorie burn automatically via Google Health Connect.
              </Text>
            </View>
          </View>

          {/* Card 3: Notifications / Habit Reminders */}
          <View style={styles.featureCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="notifications" size={24} color="#10B981" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Smart Streak Protection</Text>
              <Text style={styles.cardDescription}>
                Gentle reminders for hydration and meal logging so you never lose your progress streak.
              </Text>
            </View>
          </View>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            onPress={handleEnable}
            accessibilityRole="button"
            accessibilityLabel="Enable Permissions and Continue"
          >
            <Text style={styles.primaryBtnText}>Enable & Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={styles.skipBtn}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
          >
            <Text style={styles.skipBtnText}>I'll configure this later</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  badgeWrap: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  badgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    marginBottom: 24,
  },
  cardList: {
    gap: 14,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  actionContainer: {
    gap: 10,
    marginTop: 16,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skipBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#94A3B8',
  },
});

export default PermissionPrimerStep;
