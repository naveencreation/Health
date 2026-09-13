import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { useHealth } from '../context/HealthContext';

const DAYS = [
  { id: 'sun', label: 'S', dayIndex: 0 },
  { id: 'mon', label: 'M', dayIndex: 1 },
  { id: 'tue', label: 'T', dayIndex: 2 },
  { id: 'wed', label: 'W', dayIndex: 3 },
  { id: 'thu', label: 'T', dayIndex: 4 },
  { id: 'fri', label: 'F', dayIndex: 5 },
  { id: 'sat', label: 'S', dayIndex: 6 },
];

export const DietJourneyChart: React.FC = () => {
  const { totalConsumed, totalCarbs, totalProtein, totalFat } = useHealth();
  const [selectedDay, setSelectedDay] = useState<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'>('wed');

  // Wave Chart Dimensions
  const chartWidth = 280;
  const chartHeight = 140;

  // Exact Figma coordinates for smooth Bezier curve
  // Points: (0, 110), (45, 105), (90, 80), (135, 30 - Active Peak), (180, 50), (225, 35), (270, 70)
  const activePointX = 135;
  const activePointY = 42;

  const curvePath = `M 0 110 C 45 110, 60 90, 95 85 C 115 80, 125 45, ${activePointX} ${activePointY} C 150 40, 165 65, 195 55 C 225 45, 245 40, 275 60`;
  const areaPath = `${curvePath} L 275 ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <View style={styles.container}>
      {/* Figma: "Track your diet journey" (32px Kurale/Serif) */}
      <Text style={styles.sectionHeading}>Track your diet journey</Text>

      {/* Figma: "Today Calorie: 1721" (#F47551) */}
      <Text style={styles.todayCalorieText}>
        Today Calorie: {totalConsumed || 1721}
      </Text>

      {/* Chart Canvas with Y-Axis and Wave */}
      <View style={styles.chartWrapper}>
        {/* Y-Axis Labels (2500, 2000, 1500, 1000, 0) */}
        <View style={styles.yAxisCol}>
          <Text style={styles.yAxisText}>2500</Text>
          <Text style={styles.yAxisText}>2000</Text>
          <Text style={styles.yAxisText}>1500</Text>
          <Text style={styles.yAxisText}>1000</Text>
          <Text style={styles.yAxisText}>0</Text>
        </View>

        {/* Wave SVG Area with Guidelines */}
        <View style={styles.svgContainer}>
          {/* Grid lines */}
          <View style={[styles.gridLine, { top: 8 }]} />
          <View style={[styles.gridLine, { top: 40 }]} />
          <View style={[styles.gridLine, { top: 72 }]} />
          <View style={[styles.gridLine, { top: 104 }]} />
          <View style={[styles.gridLine, { top: 136 }]} />

          <Svg width={chartWidth} height={chartHeight} style={styles.svg}>
            <Defs>
              <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="rgba(252, 76, 100, 0.35)" />
                <Stop offset="85%" stopColor="rgba(252, 109, 198, 0.0)" />
              </LinearGradient>
            </Defs>

            {/* Filled Gradient Area */}
            <Path d={areaPath} fill="url(#waveGradient)" />

            {/* Glowing Wave Curve */}
            <Path
              d={curvePath}
              stroke="#F47551"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />

            {/* Ellipse 18: Active point dot (10px x 10px white with border) */}
            <Circle
              cx={activePointX}
              cy={activePointY}
              r={5}
              fill="#FFFFFF"
              stroke="#F47551"
              strokeWidth={2}
            />
          </Svg>

          {/* Floating Tooltip: Rectangle 28 (#F8D558 Gold Box) */}
          <View style={[styles.tooltipBox, { left: activePointX - 35, top: activePointY - 70 }]}>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipKey}>Fat</Text>
              <Text style={styles.tooltipVal}>{totalFat || 40}g</Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipKey}>Carbs</Text>
              <Text style={styles.tooltipVal}>{totalCarbs || 20}g</Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipKey}>Protein</Text>
              <Text style={styles.tooltipVal}>{totalProtein || 4}g</Text>
            </View>
            {/* Tooltip Triangle Arrow */}
            <View style={styles.tooltipArrow} />
          </View>
        </View>
      </View>

      {/* Frame 29: Days of Week (S M T [W] T F S) */}
      <View style={styles.daysRow}>
        {DAYS.map((day) => {
          const isSelected = selectedDay === day.id;
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayItem, isSelected && styles.dayItemSelected]}
              onPress={() => setSelectedDay(day.id as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayLetter, isSelected && styles.dayLetterSelected]}>
                {day.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    marginTop: 10,
    paddingBottom: 24,
  },
  // "Track your diet journey" (Figma: Kurale 32px, #000000, line-height 29px)
  sectionHeading: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 32,
    color: '#000000',
    fontWeight: '400',
  },
  // "Today Calorie: 1721" (Figma: Poppins 14px, 600, #F47551)
  todayCalorieText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary, // #F47551
    marginTop: 6,
    marginBottom: 20,
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 155,
  },
  // Y-Axis Column (2500, 2000, 1500, 1000, 0)
  yAxisCol: {
    width: 44,
    height: 140,
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  yAxisText: {
    fontFamily: Fonts.kurale,
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.55)',
  },
  svgContainer: {
    flex: 1,
    height: 140,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  svg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  // Figma Tooltip: Rectangle 28 (#F8D558 Gold Box with White Text)
  tooltipBox: {
    position: 'absolute',
    width: 72,
    backgroundColor: '#F8D558',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 1,
  },
  tooltipKey: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  tooltipVal: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    left: 28,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F8D558',
  },
  // Frame 29: S M T [W] T F S
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingLeft: 44, // Align with the chart area
    paddingRight: 6,
  },
  dayItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ellipse 28: 27px x 27px #F47551
  dayItemSelected: {
    backgroundColor: Colors.primary, // #F47551
  },
  dayLetter: {
    fontFamily: Fonts.kurale,
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.65)',
    fontWeight: '400',
  },
  dayLetterSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
