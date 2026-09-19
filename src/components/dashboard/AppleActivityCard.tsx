import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useHealth } from '@/context/HealthContext';

interface ActivityRingData {
  label: string;
  current: number;
  target: number;
  unit: string;
  colorStart: string;
  colorEnd: string;
  trackColor: string;
  size: number;
}

export const AppleActivityCard: React.FC<{ initialMode?: 'activity' | 'nutrition' }> = ({
  initialMode = 'activity',
}) => {
  const { currentLog, totalBurned, totalConsumed, userGoals, totalProtein } = useHealth();
  const [mode, setMode] = useState<'activity' | 'nutrition'>(initialMode);

  // Concentric Rings Dimensions
  const strokeWidth = 15;
  const center = 100;

  const activities = Array.isArray(currentLog?.activities) ? currentLog.activities : [];
  const workoutMinutes = activities.reduce((acc, a) => acc + (a.durationMinutes || 0), 0);
  const moveCalories = totalBurned ?? 0;
  const standHours = Math.min(12, Math.round((currentLog?.steps || 0) / 800));

  const activityRings: ActivityRingData[] = [
    {
      label: 'MOVE',
      current: moveCalories,
      target: 800,
      unit: 'CAL',
      colorStart: '#FF2D55',
      colorEnd: '#FF6B8B',
      trackColor: 'rgba(255, 45, 85, 0.18)',
      size: 184,
    },
    {
      label: 'EXERCISE',
      current: workoutMinutes,
      target: 30,
      unit: 'MIN',
      colorStart: '#A3F900',
      colorEnd: '#C5FF4D',
      trackColor: 'rgba(163, 249, 0, 0.18)',
      size: 146,
    },
    {
      label: 'STAND',
      current: standHours,
      target: 12,
      unit: 'HR',
      colorStart: '#04C7DD',
      colorEnd: '#4DDFED',
      trackColor: 'rgba(4, 199, 221, 0.18)',
      size: 108,
    },
  ];

  // Mode 2: Nutrition & Calorie Rings
  const consumedCalories = totalConsumed ?? 0;
  const calorieBudget = userGoals.dailyCalorieBudget || 2000;
  const proteinCurrent = totalProtein ?? 0;
  const proteinTarget = userGoals.targetProtein || 90;
  const waterCurrent = currentLog.waterMl ?? 0;
  const waterTarget = userGoals.waterGoalMl || 2500;

  const nutritionRings: ActivityRingData[] = [
    {
      label: 'CALORIES',
      current: consumedCalories,
      target: calorieBudget,
      unit: 'CAL',
      colorStart: '#F47551',
      colorEnd: '#FF9575',
      trackColor: 'rgba(244, 117, 81, 0.18)',
      size: 184,
    },
    {
      label: 'PROTEIN',
      current: proteinCurrent,
      target: proteinTarget,
      unit: 'G',
      colorStart: '#67BD6E',
      colorEnd: '#8FE496',
      trackColor: 'rgba(103, 189, 110, 0.18)',
      size: 146,
    },
    {
      label: 'WATER',
      current: waterCurrent,
      target: waterTarget,
      unit: 'ML',
      colorStart: '#38BDF8',
      colorEnd: '#7DD3FC',
      trackColor: 'rgba(56, 189, 248, 0.18)',
      size: 108,
    },
  ];

  const currentRings = mode === 'activity' ? activityRings : nutritionRings;

  return (
    <View style={styles.cardContainer}>
      {/* Header with Title and Mode Switcher */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>
          {mode === 'activity' ? 'Activity Rings' : 'Nutrition Rings'}
        </Text>

        <View style={styles.toggleBar}>
          <Pressable
            style={({ pressed }) => [
              styles.toggleBtn,
              mode === 'activity' ? styles.toggleBtnActive : null,
              pressed ? styles.toggleBtnPressed : null,
            ]}
            onPress={() => setMode('activity')}
            accessibilityRole="tab"
            accessibilityLabel="Activity mode"
            accessibilityState={{ selected: mode === 'activity' }}
          >
            <Text style={[styles.toggleBtnText, mode === 'activity' ? styles.toggleBtnTextActive : null]}>
              Activity
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.toggleBtn,
              mode === 'nutrition' ? styles.toggleBtnActive : null,
              pressed ? styles.toggleBtnPressed : null,
            ]}
            onPress={() => setMode('nutrition')}
            accessibilityRole="tab"
            accessibilityLabel="Nutrition mode"
            accessibilityState={{ selected: mode === 'nutrition' }}
          >
            <Text style={[styles.toggleBtnText, mode === 'nutrition' ? styles.toggleBtnTextActive : null]}>
              Nutrition
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.mainRow}>
        {/* Concentric SVG Rings */}
        <View style={styles.svgWrapper}>
          <Svg width={200} height={200} viewBox="0 0 200 200">
            <Defs>
              {currentRings.map((ring) => (
                <LinearGradient
                  key={`grad-${mode}-${ring.label}`}
                  id={`gradient-${mode}-${ring.label.toLowerCase()}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor={ring.colorStart} stopOpacity="1" />
                  <Stop offset="100%" stopColor={ring.colorEnd} stopOpacity="1" />
                </LinearGradient>
              ))}
            </Defs>

            {/* Concentric Circles from Outer to Inner */}
            {currentRings.map((ring) => {
              const radius = (ring.size - strokeWidth) / 2;
              const circumference = radius * 2 * Math.PI;
              const progressRatio = Math.min(1.0, ring.current / ring.target);
              const strokeDashoffset = circumference - progressRatio * circumference;

              return (
                <React.Fragment key={`${mode}-${ring.label}`}>
                  {/* Background Track */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={ring.trackColor}
                    strokeWidth={strokeWidth}
                  />

                  {/* Active Gradient Arc */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={`url(#gradient-${mode}-${ring.label.toLowerCase()})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${center} ${center})`}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        {/* Detailed Stats Legend */}
        <View style={styles.legendCol}>
          {currentRings.map((ring) => (
            <View key={`${mode}-legend-${ring.label}`} style={styles.legendItem}>
              <Text style={styles.legendLabel}>{ring.label}</Text>
              <Text style={[styles.legendValue, getLegendColorStyle(ring.label)]}>
                {ring.current}/{ring.target}
                <Text style={styles.legendUnit}> {ring.unit}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const getLegendColorStyle = (label: string) => {
  switch (label) {
    case 'MOVE':
      return styles.legendColorMove;
    case 'EXERCISE':
      return styles.legendColorExercise;
    case 'STAND':
      return styles.legendColorStand;
    case 'CALORIES':
      return styles.legendColorCalories;
    case 'PROTEIN':
      return styles.legendColorProtein;
    case 'WATER':
      return styles.legendColorWater;
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0F1115', // Deep OLED dark card (KokonutUI / Apple reference)
    borderRadius: 28,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  toggleBar: {
    flexDirection: 'row',
    backgroundColor: '#1E222A',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#2D323E',
  },
  toggleBtnPressed: {
    opacity: 0.8,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  svgWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCol: {
    marginLeft: 12,
    flex: 1,
    gap: 14,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'column',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  legendColorMove: {
    color: '#FF2D55',
  },
  legendColorExercise: {
    color: '#A3F900',
  },
  legendColorStand: {
    color: '#04C7DD',
  },
  legendColorCalories: {
    color: '#F47551',
  },
  legendColorProtein: {
    color: '#67BD6E',
  },
  legendColorWater: {
    color: '#38BDF8',
  },
  legendUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
