import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useGoals } from '@/context/HealthContext';

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

  const weightNum = userGoals.currentWeightKg || 74.2;
  const targetWeightNum = userGoals.targetWeightKg || 68.0;
  const heightNum = userGoals.heightCm || 178;
  const userAge = userGoals.age || 24;
  const genderConstant = userGoals.gender === 'female' ? -161 : userGoals.gender === 'other' ? -78 : 5;

  // Mifflin-St Jeor formula
  const bmrEst = Math.round(10 * weightNum + 6.25 * heightNum - 5 * userAge + genderConstant);
  const tdeeEst = Math.round(bmrEst * 1.375); // Light activity
  const currentBudget = userGoals.dailyCalorieBudget || 1950;
  const dailyDeficit = Math.max(0, tdeeEst - currentBudget);
  const weeklyFatLossKg = ((dailyDeficit * 7) / 7700).toFixed(2); // ~7700 kcal per kg of fat

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
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
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
              <Ionicons name="options-outline" size={19} color="#0F172A" />
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
              <Ionicons name="flame" size={20} color="#2563EB" />
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
              <Ionicons name="flash" size={20} color="#059669" />
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
          accessibilityLabel={`Energy balance: ${tdeeEst} burn minus ${currentBudget} budget equals ${dailyDeficit} daily caloric deficit. Projected fat loss approximately ${weeklyFatLossKg} kg per week`}
        >
          <View style={styles.engineHeader}>
            <View style={styles.engineIconBox}>
              <Ionicons name="analytics" size={18} color={Colors.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.engineTitle}>Energy Balance & Deficit</Text>
              <Text style={styles.engineSubtitle}>Calculated from diet target vs total daily expenditure</Text>
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
              <Text style={[styles.formulaNumber, styles.formulaNumberDeficit]}>{dailyDeficit}</Text>
              <Text style={styles.formulaKey}>Daily Deficit</Text>
            </View>
          </View>

          <View style={styles.fatLossBanner}>
            <Ionicons name="trending-down" size={20} color="#EA580C" />
            <Text style={styles.fatLossText}>
              Projected fat loss: <Text style={styles.boldText}>~{weeklyFatLossKg} kg / week</Text>{' '}
              ({Math.round(dailyDeficit * 7).toLocaleString()} kcal weekly deficit).
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
            <Text style={styles.detailValue}>{weightNum} kg</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="flag-outline" size={18} color="#64748B" />
              <Text style={styles.detailLabel}>Target Goal Weight</Text>
            </View>
            <Text style={styles.detailValue}>{targetWeightNum} kg</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="body-outline" size={18} color="#64748B" />
              <Text style={styles.detailLabel}>Recorded Height</Text>
            </View>
            <Text style={styles.detailValue}>{heightNum} cm</Text>
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
            Basal Metabolic Rate (BMR) represents the calories your body requires at complete rest to sustain vital organ functions. Total Daily Energy Expenditure (TDEE) accounts for lifestyle and light physical activity.
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
    paddingTop: 12,
    paddingBottom: 10,
    minHeight: 64,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    lineHeight: 28,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statIconBmr: {
    backgroundColor: '#DBEAFE',
  },
  statIconTdee: {
    backgroundColor: '#D1FAE5',
  },
  statVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 26,
    lineHeight: 32,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statValTdee: {
    color: '#059669',
  },
  statLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  statSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  engineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 10,
    backgroundColor: '#FFF1EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  engineSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  engineFormulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  formulaCol: {
    alignItems: 'center',
    flex: 1,
  },
  formulaNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    color: '#0F172A',
    fontWeight: '700',
  },
  formulaNumberDeficit: {
    color: '#EA580C',
  },
  formulaKey: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
  formulaSign: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#94A3B8',
    paddingHorizontal: 4,
  },
  fatLossBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  fatLossText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#C2410C',
    flex: 1,
  },
  boldText: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  sectionHeader: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#475569',
  },
  detailValue: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  explainerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  explainerIconBox: {
    marginTop: 1,
  },
  explainerText: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  flex1: {
    flex: 1,
  },
});
