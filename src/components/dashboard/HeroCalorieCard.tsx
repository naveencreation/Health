import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';

interface HeroCalorieCardProps {
  onEditGoal?: () => void;
}

export const HeroCalorieCard: React.FC<HeroCalorieCardProps> = ({ onEditGoal }) => {
  const {
    userGoals,
    totalConsumed,
    totalBurned,
    remainingCalories,
    totalCarbs,
    totalProtein,
    totalFat,
  } = useHealth();

  const budget = userGoals.dailyCalorieBudget || 2000;
  const eaten = totalConsumed ?? 0;
  const burned = totalBurned ?? 0;
  const calLeft = remainingCalories;

  // Format goal title based on user's goal
  const goalLabel = (() => {
    switch (userGoals.goal) {
      case 'lose':
        return 'Weight Loss';
      case 'gain':
        return 'Muscle Hypertrophy';
      case 'maintain':
      default:
        return 'Balanced Diet';
    }
  })();

  // Dial specs
  const dialSize = 124;
  const strokeWidth = 10;
  const radius = (dialSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, Math.max(0, eaten / budget));
  const strokeDashoffset = circumference - circumference * progressRatio;

  // Macro progress ratios
  const targetCarbs = userGoals.targetCarbs || 110;
  const targetProtein = userGoals.targetProtein || 90;
  const targetFat = userGoals.targetFat || 70;

  const carbRatio = Math.min(1, Math.max(0, (totalCarbs || 0) / targetCarbs));
  const proteinRatio = Math.min(1, Math.max(0, (totalProtein || 0) / targetProtein));
  const fatRatio = Math.min(1, Math.max(0, (totalFat || 0) / targetFat));

  return (
    <View style={styles.card}>
      {/* 1. Header: Goal Title + Calorie Budget + Edit Pencil */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.goalTitle}>
            {goalLabel} : {budget} Cal
          </Text>
          {onEditGoal && (
            <TouchableOpacity
              onPress={onEditGoal}
              activeOpacity={0.7}
              style={styles.editBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="pencil-outline" size={16} color="#0F172A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Middle Body: Eaten & Burned (Left) + Circular Dial (Right) */}
      <View style={styles.metricsBody}>
        {/* Left Column: Eaten & Burned */}
        <View style={styles.leftMetricsCol}>
          {/* Eaten */}
          <View style={styles.metricBlock}>
            <View style={styles.metricLabelRow}>
              <Text style={styles.metricLabel}>Eaten</Text>
              <Ionicons name="restaurant-outline" size={13} color="#0284C7" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.metricValueText}>{eaten} <Text style={styles.metricUnit}>Cal</Text></Text>
          </View>

          {/* Burned */}
          <View style={[styles.metricBlock, { marginTop: 14 }]}>
            <View style={styles.metricLabelRow}>
              <Text style={styles.metricLabel}>Burned</Text>
              <Ionicons name="flame" size={13} color="#EA580C" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.metricValueText}>{burned} <Text style={styles.metricUnit}>Cal</Text></Text>
          </View>
        </View>

        {/* Right Column: Hero "Cal left" Progress Dial */}
        <View style={styles.dialContainer}>
          <Svg width={dialSize} height={dialSize}>
            {/* Background Soft Track */}
            <Circle
              cx={dialSize / 2}
              cy={dialSize / 2}
              r={radius}
              stroke="rgba(15, 23, 42, 0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Dark Active Arc */}
            <Circle
              cx={dialSize / 2}
              cy={dialSize / 2}
              r={radius}
              stroke={calLeft < 0 ? '#EF4444' : '#0F172A'}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
            />
          </Svg>

          {/* Center Text inside Dial */}
          <View style={styles.dialCenterContent}>
            <Text style={styles.calLeftNumber}>
              {Math.abs(calLeft).toLocaleString()}
            </Text>
            <Text style={styles.calLeftLabel}>
              {calLeft < 0 ? 'Cal over' : 'Cal left'}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Bottom Row: 3 Macro Progress Strips (Carb, Proteins, Fat) */}
      <View style={styles.macrosRow}>
        {/* Carb */}
        <View style={styles.macroItem}>
          <Text style={styles.macroName}>Carb</Text>
          <View style={styles.macroTrack}>
            <View style={[styles.macroFill, { width: `${Math.round(carbRatio * 100)}%`, backgroundColor: '#38BDF8' }]} />
          </View>
          <Text style={styles.macroRatioText}>
            <Text style={styles.macroBoldVal}>{totalCarbs}</Text> / {targetCarbs}g
          </Text>
        </View>

        {/* Proteins */}
        <View style={styles.macroItem}>
          <Text style={styles.macroName}>Proteins</Text>
          <View style={styles.macroTrack}>
            <View style={[styles.macroFill, { width: `${Math.round(proteinRatio * 100)}%`, backgroundColor: '#22C55E' }]} />
          </View>
          <Text style={styles.macroRatioText}>
            <Text style={styles.macroBoldVal}>{totalProtein}</Text> / {targetProtein}g
          </Text>
        </View>

        {/* Fat */}
        <View style={styles.macroItem}>
          <Text style={styles.macroName}>Fat</Text>
          <View style={styles.macroTrack}>
            <View style={[styles.macroFill, { width: `${Math.round(fatRatio * 100)}%`, backgroundColor: '#F97316' }]} />
          </View>
          <Text style={styles.macroRatioText}>
            <Text style={styles.macroBoldVal}>{totalFat}</Text> / {targetFat}g
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: '#DDF4EF', // Soft mint/cyan pastel gradient tone
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  editBtn: {
    padding: 2,
  },
  // Middle Section
  metricsBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  leftMetricsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  metricBlock: {},
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  metricValueText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
  },
  // Dial
  dialContainer: {
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dialCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calLeftNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  calLeftLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: -2,
  },
  // Bottom Macros
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
    paddingTop: 16,
  },
  macroItem: {
    flex: 1,
  },
  macroName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 6,
  },
  macroTrack: {
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroRatioText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#64748B',
  },
  macroBoldVal: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    color: '#0F172A',
  },
});
