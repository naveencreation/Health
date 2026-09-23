import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useDailyLog, useGoals, useAnalytics } from '@/context/HealthContext';

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
  const { totalConsumed, totalCarbs, totalProtein, totalFat } = useDailyLog();
  const { userGoals } = useGoals();
  const { weeklyLogs } = useAnalytics();
  const todayDayIndex = new Date().getDay();
  const initialDayId = (DAYS.find((d) => d.dayIndex === todayDayIndex)?.id || 'wed') as any;
  const [selectedDay, setSelectedDay] = useState<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'>(initialDayId);

  // Wave Chart Dimensions
  const chartWidth = 275;
  const chartHeight = 140;

  // Selected Day Item lookup in weeklyLogs (Sunday to Saturday)
  const selectedDayObj = DAYS.find((d) => d.id === selectedDay) || DAYS[3];
  const selectedDayIdx = selectedDayObj.dayIndex;

  // Compute 7 real day coordinates
  const dayPoints = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      // Find log item whose day matches day index i (0 = Sun, 6 = Sat)
      const dayLog = weeklyLogs.find((l) => {
        const parts = l.date.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          return d.getDay() === i;
        }
        return false;
      });

      const cals = dayLog ? dayLog.calories : 0;
      const x = Math.round(i * (chartWidth / 6));
      // Max scale 2500 kcal, baseline at 125, top peak at 25
      const y = Math.round(125 - Math.min(1, cals / 2500) * 95);
      return {
        x,
        y,
        cals,
        fat: dayLog ? dayLog.fat : 0,
        carbs: dayLog ? dayLog.carbs : 0,
        protein: dayLog ? dayLog.protein : 0,
      };
    });
  }, [weeklyLogs]);

  // Active Point coordinates for selected day
  const activePoint = dayPoints[selectedDayIdx] || dayPoints[3];
  const activePointX = activePoint.x;
  const activePointY = activePoint.y;

  // Build smooth bezier curve through the 7 real points
  const hasAnyCalories = dayPoints.some((p) => p.cals > 0);
  const curvePath = useMemo(() => {
    if (!hasAnyCalories) {
      return `M 0 125 L ${chartWidth} 125`;
    }
    let path = `M ${dayPoints[0].x} ${dayPoints[0].y}`;
    for (let i = 0; i < dayPoints.length - 1; i++) {
      const p0 = dayPoints[i];
      const p1 = dayPoints[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [dayPoints, hasAnyCalories]);

  const areaPath = `${curvePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <View style={styles.container}>
      {/* Figma: "Track your diet journey" (32px Kurale/Serif) */}
      <Text style={styles.sectionHeading}>Track your diet journey</Text>

      {/* Dynamic Today Calorie */}
      <Text style={styles.todayCalorieText}>
        Today: {totalConsumed ?? 0} kcal consumed
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
          <View style={[styles.gridLine, styles.gridLine8]} />
          <View style={[styles.gridLine, styles.gridLine40]} />
          <View style={[styles.gridLine, styles.gridLine72]} />
          <View style={[styles.gridLine, styles.gridLine104]} />
          <View style={[styles.gridLine, styles.gridLine136]} />

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
          <View style={[styles.tooltipBox, { left: Math.min(chartWidth - 65, Math.max(10, activePointX - 35)), top: Math.max(10, activePointY - 70) }]}>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipKey}>Fat</Text>
              <Text style={styles.tooltipVal}>{activePoint.fat}g</Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipKey}>Carbs</Text>
              <Text style={styles.tooltipVal}>{activePoint.carbs}g</Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipKey}>Protein</Text>
              <Text style={styles.tooltipVal}>{activePoint.protein}g</Text>
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
            <Pressable
              key={day.id}
              style={({ pressed }) => [
                styles.dayItem,
                isSelected ? styles.dayItemSelected : null,
                pressed ? styles.dayItemPressed : null,
              ]}
              onPress={() => setSelectedDay(day.id as any)}
              accessibilityRole="button"
              accessibilityLabel={`Select day ${day.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.dayLetter, isSelected ? styles.dayLetterSelected : null]}>
                {day.label}
              </Text>
            </Pressable>
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
  gridLine8: {
    top: 8,
  },
  gridLine40: {
    top: 40,
  },
  gridLine72: {
    top: 72,
  },
  gridLine104: {
    top: 104,
  },
  gridLine136: {
    top: 136,
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
  dayItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  // Ellipse 28: 27px x 27px #F47551
  dayItemSelected: {
    backgroundColor: Colors.primary, // #F47551
  },
  dayLetter: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.65)',
    fontWeight: '600',
  },
  dayLetterSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
