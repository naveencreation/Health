import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

interface ProfileQuickNavGridProps {
  streakDays: number;
  calorieBudget?: number;
  riaTone?: string;
  onOpenAwards: () => void;
  onOpenSummary: () => void;
  onOpenPreferences: () => void;
  onOpenGoals: () => void;
}

export const ProfileQuickNavGrid: React.FC<ProfileQuickNavGridProps> = ({
  streakDays,
  calorieBudget,
  riaTone = 'supportive',
  onOpenAwards,
  onOpenSummary,
  onOpenPreferences,
  onOpenGoals,
}) => {
  const toneLabel =
    riaTone === 'focused'
      ? 'Disciplined & Direct'
      : riaTone === 'scientific'
      ? 'Nutritional Scientist'
      : 'Supportive & Warm';

  return (
    <View style={styles.gridContainer}>
      {/* Top Row: Awards & Summary */}
      <View style={styles.gridRow}>
        <Pressable
          style={({ pressed }) => [styles.gridCard, pressed ? styles.cardPressed : null]}
          onPress={onOpenAwards}
          accessibilityRole="button"
          accessibilityLabel={`Awards, ${streakDays} streak milestones`}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, styles.iconAwards]}>
              <Ionicons name="ribbon-outline" size={20} color="#EA580C" />
            </View>
            <View style={styles.textStack}>
              <Text style={styles.cardTitle}>Awards</Text>
              <Text style={styles.cardSubtitle}>{streakDays} streak milestones</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.gridCard, pressed ? styles.cardPressed : null]}
          onPress={onOpenSummary}
          accessibilityRole="button"
          accessibilityLabel="Summary, weekly and TDEE report"
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, styles.iconSummary]}>
              <Ionicons name="calendar-outline" size={20} color="#16A34A" />
            </View>
            <View style={styles.textStack}>
              <Text style={styles.cardTitle}>Summary</Text>
              <Text style={styles.cardSubtitle}>Weekly & TDEE</Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Bottom Row: Feedback / Preferences & My Goals */}
      <View style={styles.gridRow}>
        <Pressable
          style={({ pressed }) => [styles.gridCard, pressed ? styles.cardPressed : null]}
          onPress={onOpenPreferences}
          accessibilityRole="button"
          accessibilityLabel={`Preferences, coaching style: ${toneLabel}`}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, styles.iconPreferences]}>
              <Ionicons name="options-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.textStack}>
              <Text style={styles.cardTitle}>Preferences</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{toneLabel}</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.gridCard, pressed ? styles.cardPressed : null]}
          onPress={onOpenGoals}
          accessibilityRole="button"
          accessibilityLabel={`My Goals, ${(calorieBudget || 1950).toLocaleString()} kilocalories per day`}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, styles.iconGoals]}>
              <Ionicons name="flag-outline" size={20} color="#9333EA" />
            </View>
            <View style={styles.textStack}>
              <Text style={styles.cardTitle}>My Goals</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {(calorieBudget || 1950).toLocaleString()} kcal / day
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    gap: 12,
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAwards: {
    backgroundColor: '#FFEDD5',
  },
  iconSummary: {
    backgroundColor: '#DCFCE7',
  },
  iconPreferences: {
    backgroundColor: '#EFF6FF',
  },
  iconGoals: {
    backgroundColor: '#F3E8FF',
  },
  textStack: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
