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
              <Ionicons name="ribbon-outline" size={20} color={Colors.primary} />
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
              <Ionicons name="calendar-outline" size={20} color={Colors.protein} />
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
              <Ionicons name="options-outline" size={20} color={Colors.iconNavy} />
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
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
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
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAwards: {
    backgroundColor: Colors.fatLight,
  },
  iconSummary: {
    backgroundColor: Colors.proteinLight,
  },
  iconPreferences: {
    backgroundColor: '#F1F5F9',
  },
  iconGoals: {
    backgroundColor: '#F3E8FF',
  },
  textStack: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
