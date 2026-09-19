import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

export const CalorieBudgetCard: React.FC = () => {
  const {
    userGoals,
    totalConsumed,
    totalCarbs,
    totalProtein,
    totalFat,
    remainingCalories,
  } = useHealth();

  // Figma Specs: 224px x 224px Arc Gauge
  const size = 224;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;

  // Semi-circle from 180 deg to 0 deg (or 200 deg to -20 deg for open bottom)
  // Let's create an elegant upper arc (from angle 180 to 0)
  const targetBudget = userGoals.dailyCalorieBudget || 2213;
  const consumed = totalConsumed ?? 0;
  const progressRatio = Math.min(1, Math.max(0, consumed / targetBudget));

  // Polar to Cartesian helper
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // 180 degrees total sweep (from 180 to 360/0)
  const startAngle = 0;
  const endAngle = 180;
  const activeAngle = startAngle + progressRatio * (endAngle - startAngle);

  const backgroundArcPath = describeArc(cx, cy, radius, startAngle, endAngle);
  const activeArcPath = describeArc(cx, cy, radius, startAngle, Math.max(1, activeAngle));
  const thumbPos = polarToCartesian(cx, cy, radius, activeAngle);

  // Macro progress widths (Figma specifies max width 65px for track)
  const proteinWidth = Math.min(65, Math.max(0, Math.round(((totalProtein || 0) / (userGoals.targetProtein || 90)) * 65)));
  const fatWidth = Math.min(65, Math.max(0, Math.round(((totalFat || 0) / (userGoals.targetFat || 70)) * 65)));
  const carbsWidth = Math.min(65, Math.max(0, Math.round(((totalCarbs || 0) / (userGoals.targetCarbs || 110)) * 65)));

  return (
    <View style={styles.container}>
      {/* Hero Calorie Arc Section */}
      <View style={styles.arcContainer}>
        <Svg width={size} height={size * 0.72}>
          {/* Background Peach Track: #F4D7CF */}
          <Path
            d={backgroundArcPath}
            stroke={Colors.primaryLight} // #F4D7CF
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {/* Active Terracotta Progress: #F47551 */}
          <Path
            d={activeArcPath}
            stroke={Colors.primary} // #F47551
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {/* End Dot Thumb: Ellipse 27 (14px x 14px, #FFFFFF) */}
          <Circle
            cx={thumbPos.x}
            cy={thumbPos.y}
            r={6.5}
            fill="#FFFFFF"
            stroke={Colors.primary}
            strokeWidth={1.5}
          />
        </Svg>

        {/* Center Flame & Calorie Text */}
        <View style={styles.arcCenterContent}>
          <Text style={styles.flameEmoji}>🔥</Text>
          <Text style={styles.calorieNumberText}>{consumed} Kcal</Text>
          <Text style={styles.calorieSubText}>
            {consumed === 0
              ? `${targetBudget.toLocaleString()} kcal remaining`
              : `${Math.max(0, remainingCalories).toLocaleString()} kcal left of ${targetBudget}`}
          </Text>
        </View>
      </View>

      {/* Frame 300: Macro Triad (Protein, Fats, Carbs) */}
      <View style={styles.macroTriad}>
        {/* Column 1: Protein */}
        <View style={styles.macroCol}>
          <Text style={styles.macroLabel}>Protein</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, styles.barProtein, { width: proteinWidth }]} />
          </View>
          <Text style={styles.macroValueText}>{totalProtein}/{userGoals.targetProtein || 90}g</Text>
        </View>

        {/* Column 2: Fats */}
        <View style={styles.macroCol}>
          <Text style={styles.macroLabel}>Fats</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, styles.barFat, { width: fatWidth }]} />
          </View>
          <Text style={styles.macroValueText}>{totalFat}/{userGoals.targetFat || 70}g</Text>
        </View>

        {/* Column 3: Carbs */}
        <View style={styles.macroCol}>
          <Text style={styles.macroLabel}>Carbs</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, styles.barCarbs, { width: carbsWidth }]} />
          </View>
          <Text style={styles.macroValueText}>{totalCarbs}/{userGoals.targetCarbs || 110}g</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  arcContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 6,
  },
  arcCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 50,
  },
  // Flame icon
  flameEmoji: {
    fontSize: 30,
    marginBottom: 4,
  },
  // 1721 Kcal (Figma: Poppins 28px, #000000)
  calorieNumberText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  // of 2213 kcal (Figma: Poppins 16px, rgba(0, 0, 0, 0.2))
  calorieSubText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(0, 0, 0, 0.35)',
    marginTop: 2,
  },
  // Frame 300: Macro Triad
  macroTriad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 6,
  },
  macroCol: {
    alignItems: 'flex-start',
    width: 65,
  },
  // Protein, Fats, Carbs Labels (Figma: Poppins 16px, 600, #000000)
  macroLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  // 65px track (Figma: border: 4px solid #E9E9E9)
  barTrack: {
    width: 65,
    height: 5,
    backgroundColor: '#E9E9E9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  // Fill: Protein #67BD6E, Fats #F47551, Carbs #F8D558
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barProtein: {
    backgroundColor: Colors.protein,
  },
  barFat: {
    backgroundColor: Colors.fat,
  },
  barCarbs: {
    backgroundColor: Colors.carbs,
  },
  // 78/90g (Figma: Poppins 12px, 500, #878488)
  macroValueText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#878488',
  },
});
