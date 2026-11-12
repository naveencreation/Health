import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useGoals } from '@/context/HealthContext';
import { planFor, LBS_PER_KG } from '@/features/onboarding/services/goalsForm';
import {
  SubScreenHeader,
  SettingsSection,
  SettingsRow,
  ProfileButton,
  profileCard,
  profileScreenStyles,
} from '@/components/profile/ProfileUI';

const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly active',
  moderately_active: 'Moderately active',
  very_active: 'Very active',
};

const KCAL_PER_KG = 7700;

interface MetabolicSummaryScreenProps {
  onBack: () => void;
  onOpenGoals?: () => void;
}

export const MetabolicSummaryScreen: React.FC<MetabolicSummaryScreenProps> = ({
  onBack,
  onOpenGoals,
}) => {
  const { userGoals } = useGoals();

  // Same formula and activity level as the onboarding plan
  const plan = planFor(userGoals);
  const budget = userGoals.dailyCalorieBudget || 0;
  const balance = plan.tdee - budget; // > 0 deficit, < 0 surplus
  const dailyGap = Math.abs(balance);
  const isLbs = userGoals.weightUnit === 'lbs';
  const unit = isLbs ? 'lbs' : 'kg';
  const weeklyChange = ((dailyGap * 7) / KCAL_PER_KG) * (isLbs ? LBS_PER_KG : 1);
  const fmtWeight = (kg?: number) =>
    kg ? `${(Math.round((isLbs ? kg * LBS_PER_KG : kg) * 10) / 10).toFixed(1)} ${unit}` : 'Not set';
  const sexLabel =
    userGoals.gender === 'female' ? 'Female' : userGoals.gender === 'male' ? 'Male' : 'Not specified';
  const activityLabel = userGoals.activityLevel
    ? ACTIVITY_LABEL[userGoals.activityLevel]
    : 'Moderately active (assumed)';
  const budgetShare = plan.tdee > 0 ? Math.min(1, budget / plan.tdee) : 0;

  const balanceText = !budget
    ? 'Set a calorie budget in your goals to see your daily balance.'
    : dailyGap === 0
      ? 'Your budget matches your burn, so your weight should hold steady.'
      : `${dailyGap.toLocaleString()} kcal ${balance > 0 ? 'deficit' : 'surplus'} a day · about ${weeklyChange.toFixed(1)} ${unit} a week`;

  return (
    <View style={profileScreenStyles.root}>
      <SubScreenHeader
        title="Metabolic summary"
        subtitle="How your budget was worked out"
        onBack={onBack}
      />
      <ScrollView
        style={profileScreenStyles.scroll}
        contentContainerStyle={profileScreenStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[profileCard, styles.card]}>
          <View style={styles.stats}>
            <View
              style={styles.flex1}
              accessible
              accessibilityLabel={`Resting burn, ${plan.bmr} kilocalories a day`}
            >
              <Text style={styles.statLabel}>Resting burn (BMR)</Text>
              <Text style={styles.statValue}>{plan.bmr.toLocaleString()}</Text>
              <Text style={styles.statUnit}>kcal / day</Text>
            </View>
            <View
              style={styles.flex1}
              accessible
              accessibilityLabel={`Total burn, ${plan.tdee} kilocalories a day`}
            >
              <Text style={styles.statLabel}>Total burn (TDEE)</Text>
              <Text style={styles.statValue}>{plan.tdee.toLocaleString()}</Text>
              <Text style={styles.statUnit}>kcal / day</Text>
            </View>
          </View>

          <View style={styles.budgetBlock}>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Your budget</Text>
              <Text style={styles.budgetValue}>{budget ? `${budget.toLocaleString()} kcal` : 'Not set'}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(budgetShare * 100)}%` }]} />
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.statUnit}>0</Text>
              <Text style={styles.statUnit}>TDEE {plan.tdee.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.balance} accessible accessibilityLabel={balanceText}>
            <Ionicons
              name={!budget || dailyGap === 0 ? 'remove' : balance > 0 ? 'trending-down' : 'trending-up'}
              size={18}
              color={Colors.primaryDark}
            />
            <Text style={styles.balanceText}>{balanceText}</Text>
          </View>
        </View>

        <SettingsSection title="Based on">
          <SettingsRow title="Weight" trailing={<Text style={styles.value}>{fmtWeight(userGoals.currentWeightKg)}</Text>} />
          <SettingsRow title="Target" trailing={<Text style={styles.value}>{fmtWeight(userGoals.targetWeightKg)}</Text>} />
          <SettingsRow
            title="Height"
            trailing={
              <Text style={styles.value}>
                {userGoals.heightCm ? `${Math.round(userGoals.heightCm)} cm` : 'Not set'}
              </Text>
            }
          />
          <SettingsRow title="Age" trailing={<Text style={styles.value}>{userGoals.age ?? 'Not set'}</Text>} />
          <SettingsRow title="Sex" trailing={<Text style={styles.value}>{sexLabel}</Text>} />
          <SettingsRow title="Activity" trailing={<Text style={styles.value}>{activityLabel}</Text>} />
          <SettingsRow title="Formula" trailing={<Text style={styles.value}>Mifflin-St Jeor</Text>} />
        </SettingsSection>

        {onOpenGoals ? <ProfileButton label="Adjust goals" onPress={onOpenGoals} /> : null}

        <Text style={styles.note}>
          Estimates only. Resting burn is what your body uses at complete rest; total burn adds your
          activity level on top. Real burn varies with sleep, stress and muscle mass.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  card: { padding: 16, gap: 16 },
  stats: { flexDirection: 'row', gap: 12 },
  statLabel: { fontFamily: Fonts.urbanist.regular, fontSize: 13, color: Colors.textSecondary },
  statValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 26,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  statUnit: { fontFamily: Fonts.urbanist.regular, fontSize: 12, color: Colors.textSecondary },
  budgetBlock: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    paddingTop: 14,
  },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetLabel: { fontFamily: Fonts.urbanist.regular, fontSize: 14, color: Colors.textSecondary },
  budgetValue: { fontFamily: Fonts.urbanist.bold, fontSize: 14, color: Colors.primaryDark },
  track: { height: 10, borderRadius: 5, backgroundColor: Colors.surfaceContainer, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: Colors.burnLight,
  },
  balanceText: {
    flex: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.onPrimaryContainer,
  },
  value: { fontFamily: Fonts.urbanist.bold, fontSize: 15, color: Colors.textPrimary },
  note: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginHorizontal: 4,
  },
});
