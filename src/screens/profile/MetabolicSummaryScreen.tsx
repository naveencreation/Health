import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useGoals } from '@/context/HealthContext';
import { planFor, LBS_PER_KG } from '@/features/onboarding/services/goalsForm';

const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly active',
  moderately_active: 'Moderately active',
  very_active: 'Very active',
};

interface MetabolicSummaryScreenProps {
  onBack: () => void;
  onOpenGoals?: () => void;
}

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export const MetabolicSummaryScreen: React.FC<MetabolicSummaryScreenProps> = ({
  onBack,
  onOpenGoals,
}) => {
  const { userGoals } = useGoals();

  // Same formula and activity level as the onboarding plan
  const plan = planFor(userGoals);
  const bmrEst = plan.bmr;
  const tdeeEst = plan.tdee;
  const currentBudget = userGoals.dailyCalorieBudget;
  const balance = tdeeEst - currentBudget; // > 0 deficit, < 0 surplus
  const isSurplus = balance < 0;
  const dailyGap = Math.abs(balance);
  const weeklyKg = ((dailyGap * 7) / 7700).toFixed(2); // ~7700 kcal per kg of body weight
  const isLbs = userGoals.weightUnit === 'lbs';
  const fmtWeight = (kg?: number) =>
    kg ? `${(Math.round((isLbs ? kg * LBS_PER_KG : kg) * 10) / 10).toFixed(1)} ${isLbs ? 'lbs' : 'kg'}` : 'Not set';
  const sexLabel =
    userGoals.gender === 'female' ? 'Female' : userGoals.gender === 'male' ? 'Male' : 'Not specified';
  const activityLabel = userGoals.activityLevel
    ? ACTIVITY_LABEL[userGoals.activityLevel]
    : 'Moderately active (assumed)';

  return (
    <View style={styles.rootContainer}>
      {/* 1. Unified Top Navigation Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [styles.headerBackBtn, pressed ? styles.btnPressed : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Go back to profile"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.iconNavy} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Metabolic Summary
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Clinical daily burn rate & deficit telemetry
            </Text>
          </View>

          {onOpenGoals ? (
            <Pressable
              style={({ pressed }) => [styles.headerActionBtn, pressed ? styles.btnPressed : null]}
              onPress={onOpenGoals}
              hitSlop={HIT_SLOP_10}
              accessibilityRole="button"
              accessibilityLabel="Tune goals"
            >
              <Ionicons name="options-outline" size={20} color={Colors.iconNavy} />
            </Pressable>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Dual Stat Telemetry Cards */}
        <View style={styles.statsRow}>
          <View
            style={styles.statBox}
            accessible={true}
            accessibilityLabel={`Basal metabolic rate: ${bmrEst} kilocalories resting burn per day`}
          >
            <View style={[styles.statIconBox, styles.statIconBmr]}>
              <Ionicons name="flame" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statVal}>{bmrEst}</Text>
            <Text style={styles.statLabel}>BMR (kcal/day)</Text>
            <Text style={styles.statSub}>Basal resting burn</Text>
          </View>

          <View
            style={styles.statBox}
            accessible={true}
            accessibilityLabel={`Total daily energy expenditure: ${tdeeEst} kilocalories burn per day`}
          >
            <View style={[styles.statIconBox, styles.statIconTdee]}>
              <Ionicons name="flash" size={20} color={Colors.steps} />
            </View>
            <Text style={[styles.statVal, styles.statValTdee]}>{tdeeEst}</Text>
            <Text style={styles.statLabel}>TDEE (kcal/day)</Text>
            <Text style={styles.statSub}>Total daily expenditure</Text>
          </View>
        </View>

        {/* Calorie Deficit Engine Card */}
        <View
          style={styles.engineCard}
          accessible={true}
          accessibilityLabel={`Energy balance: ${tdeeEst} burn minus ${currentBudget} budget, a daily ${isSurplus ? 'surplus' : 'deficit'} of ${dailyGap} kilocalories. About ${weeklyKg} kilograms ${isSurplus ? 'gained' : 'lost'} per week`}
        >
          <View style={styles.engineHeader}>
            <View style={styles.engineIconBox}>
              <Ionicons name="analytics" size={18} color={Colors.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.engineTitle}>Energy Balance</Text>
              <Text style={styles.engineSubtitle}>
                Calculated from diet target vs total daily expenditure
              </Text>
            </View>
          </View>

          <View style={styles.engineFormulaRow}>
            <View style={styles.formulaCol}>
              <Text style={styles.formulaNumber}>{tdeeEst}</Text>
              <Text style={styles.formulaKey}>Daily Burn (TDEE)</Text>
            </View>
            <Text style={styles.formulaSign}>−</Text>
            <View style={styles.formulaCol}>
              <Text style={styles.formulaNumber}>{currentBudget}</Text>
              <Text style={styles.formulaKey}>Diet Budget</Text>
            </View>
            <Text style={styles.formulaSign}>=</Text>
            <View style={styles.formulaCol}>
              <Text style={[styles.formulaNumber, styles.formulaNumberDeficit]}>
                {isSurplus ? `+${dailyGap}` : dailyGap}
              </Text>
              <Text style={styles.formulaKey}>{isSurplus ? 'Daily Surplus' : 'Daily Deficit'}</Text>
            </View>
          </View>

          <View style={styles.fatLossBanner}>
            <Ionicons
              name={isSurplus ? 'trending-up' : dailyGap === 0 ? 'remove' : 'trending-down'}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.fatLossText}>
              {dailyGap === 0 ? (
                'Your budget matches your daily burn, so your weight should hold steady.'
              ) : (
                <>
                  {isSurplus ? 'Projected gain: ' : 'Projected loss: '}
                  <Text style={styles.boldText}>~{weeklyKg} kg / week</Text> (
                  {Math.round(dailyGap * 7).toLocaleString()} kcal weekly{' '}
                  {isSurplus ? 'surplus' : 'deficit'}).
                </>
              )}
            </Text>
          </View>
        </View>

        {/* Biometrics Inputs Used */}
        <Text style={styles.sectionHeader}>Biometric Baseline Inputs</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="scale-outline" size={18} color="#64748B" />
              <Text style={styles.detailLabel}>Current Weight</Text>
            </View>
            <Text style={styles.detailValue}>{fmtWeight(userGoals.currentWeightKg)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="flag-outline" size={18} color="#64748B" />
              <Text style={styles.detailLabel}>Target Goal Weight</Text>
            </View>
            <Text style={styles.detailValue}>{fmtWeight(userGoals.targetWeightKg)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="body-outline" size={18} color="#64748B" />
              <Text style={styles.detailLabel}>Recorded Height</Text>
            </View>
            <Text style={styles.detailValue}>
              {userGoals.heightCm ? `${Math.round(userGoals.heightCm)} cm` : 'Not set'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.detailLabel}>Age</Text>
            </View>
            <Text style={styles.detailValue}>{userGoals.age ?? 'Not set'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.detailLabel}>Sex</Text>
            </View>
            <Text style={styles.detailValue}>{sexLabel}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="walk-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.detailLabel}>Activity Level</Text>
            </View>
            <Text style={styles.detailValue}>{activityLabel}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="document-text-outline" size={18} color="#64748B" />
              <Text style={styles.detailLabel}>Formula Standard</Text>
            </View>
            <Text style={styles.detailValue}>Mifflin-St Jeor Clinical</Text>
          </View>
        </View>

        {/* Explainer Note Card */}
        <View style={styles.explainerCard}>
          <View style={styles.explainerIconBox}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.explainerText}>
            Basal Metabolic Rate (BMR) represents the calories your body requires at complete rest
            to sustain vital organ functions. Total Daily Energy Expenditure (TDEE) accounts for
            your activity level on top of that.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 56,
    justifyContent: 'center',
    zIndex: 10,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  headerPlaceholder: {
    width: 38,
    height: 38,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginTop: 1,
    includeFontPadding: false,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statIconBmr: {
    backgroundColor: Colors.fatLight,
  },
  statIconTdee: {
    backgroundColor: Colors.stepsLight,
  },
  statVal: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 26,
    lineHeight: 32,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statValTdee: {
    color: Colors.stepsDark,
  },
  statLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  statSub: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  engineCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
    gap: 16,
  },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  engineIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.fatLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  engineSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  engineFormulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  formulaCol: {
    alignItems: 'center',
    flex: 1,
  },
  formulaNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  formulaNumberDeficit: {
    color: Colors.primaryDark,
  },
  formulaKey: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  formulaSign: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: Colors.textMuted,
    paddingHorizontal: 4,
  },
  fatLossBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.fatLight,
    borderRadius: 8,
    borderCurve: 'continuous',
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.burnBorder,
  },
  fatLossText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.primaryDark,
    flex: 1,
  },
  boldText: {
    fontFamily: Fonts.urbanist.bold,
  },
  sectionHeader: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#475569',
  },
  detailValue: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  explainerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceLow,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  explainerIconBox: {
    marginTop: 1,
  },
  explainerText: {
    flex: 1,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  flex1: {
    flex: 1,
  },
});
