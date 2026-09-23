import React from 'react';
import { StyleSheet, View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useGoals } from '@/context/HealthContext';

interface MetabolicSummaryModalSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const MetabolicSummaryModalSheet: React.FC<MetabolicSummaryModalSheetProps> = ({
  visible,
  onClose,
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close metabolic energy summary"
        />

        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragPill} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleStack}>
                <Text style={styles.sheetTitle}>Metabolic Energy Summary</Text>
                <Text style={styles.sheetSubtitle}>Scientific daily burn rate & caloric deficit math</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedSubtle : null]}
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close metabolic energy summary"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Stat Highlights */}
            <View style={styles.statsRow}>
              <View
                style={styles.statBox}
                accessible={true}
                accessibilityLabel={`Basal metabolic rate: ${bmrEst} kilocalories resting burn per day`}
              >
                <View style={[styles.statIconBox, styles.statIconBmr]}>
                  <Ionicons name="flame" size={18} color="#2563EB" />
                </View>
                <Text style={styles.statVal}>{bmrEst}</Text>
                <Text style={styles.statLabel}>BMR (kcal)</Text>
                <Text style={styles.statSub}>Basal resting rate</Text>
              </View>

              <View
                style={styles.statBox}
                accessible={true}
                accessibilityLabel={`Total daily energy expenditure: ${tdeeEst} kilocalories burn per day`}
              >
                <View style={[styles.statIconBox, styles.statIconTdee]}>
                  <Ionicons name="flash" size={18} color="#059669" />
                </View>
                <Text style={[styles.statVal, styles.statValTdee]}>{tdeeEst}</Text>
                <Text style={styles.statLabel}>TDEE (kcal)</Text>
                <Text style={styles.statSub}>Total daily burn</Text>
              </View>
            </View>

            {/* Calorie Deficit Engine Card */}
            <View
              style={styles.engineCard}
              accessible={true}
              accessibilityLabel={`Energy balance: ${tdeeEst} burn minus ${currentBudget} budget equals ${dailyDeficit} daily caloric deficit. Projected fat loss approximately ${weeklyFatLossKg} kg per week`}
            >
              <View style={styles.engineHeader}>
                <Ionicons name="analytics-outline" size={20} color={Colors.primary} />
                <Text style={styles.engineTitle}>Energy Balance & Deficit</Text>
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
                <Ionicons name="trending-down" size={18} color="#EA580C" />
                <Text style={styles.fatLossText}>
                  Projected fat loss: <Text style={styles.boldText}>~{weeklyFatLossKg} kg / week</Text> ({Math.round(dailyDeficit * 7)} kcal weekly deficit).
                </Text>
              </View>
            </View>

            {/* Scientific Formulas Explanation */}
            <Text style={styles.sectionHeader}>Biometric Inputs Used</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Weight</Text>
                <Text style={styles.detailValue}>{weightNum} kg</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Target Goal Weight</Text>
                <Text style={styles.detailValue}>{targetWeightNum} kg</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Height Recorded</Text>
                <Text style={styles.detailValue}>{heightNum} cm</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Formula Reference</Text>
                <Text style={styles.detailValue}>Mifflin-St Jeor Clinical Standard</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.doneBtn, pressed ? styles.pressedSubtle : null]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close metabolic energy summary"
            >
              <Text style={styles.doneBtnText}>Close Summary</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitleStack: {
    flex: 1,
  },
  sheetTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedSubtle: {
    opacity: 0.75,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    color: '#0F172A',
  },
  statLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  statSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  engineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  engineTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  engineFormulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  formulaCol: {
    alignItems: 'center',
  },
  formulaNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  formulaKey: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  formulaSign: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#94A3B8',
  },
  fatLossBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 10,
  },
  fatLossText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#C2410C',
    flex: 1,
  },
  boldText: {
    fontFamily: Fonts.poppins.bold,
  },
  sectionHeader: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#64748B',
  },
  detailValue: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12.5,
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  statIconBmr: {
    backgroundColor: '#EFF6FF',
  },
  statIconTdee: {
    backgroundColor: '#ECFDF5',
  },
  statValTdee: {
    color: '#059669',
  },
  formulaNumberDeficit: {
    color: '#16A34A',
  },
});
