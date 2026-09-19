import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useHealth } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';

interface DayItem {
  dateStr: string;
  dayName: string; // 'SUN', 'MON', etc.
  dayNum: number;  // 12, 13, etc.
  isSelected: boolean;
  progress: number; // 0 to 1
}

export const TopDateStrip: React.FC = () => {
  const { selectedDate, setSelectedDate, dailyLogs, userGoals } = useHealth();

  const budget = userGoals.dailyCalorieBudget || 2000;

  // 7 Days of the currently selected week (SUN to SAT)
  const weekDays = useMemo((): DayItem[] => {
    const parts = selectedDate.split('-');
    const current = parts.length === 3
      ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      : new Date();

    const dayOfWeek = current.getDay(); // 0 is Sunday
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const days: DayItem[] = [];
    const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dateVal}`;

      const log = dailyLogs[dateStr];
      const cals = log && Array.isArray(log.meals) ? log.meals.reduce((sum, item) => sum + item.calories, 0) : 0;
      const progress = Math.min(1, Math.max(0, cals / budget));

      days.push({
        dateStr,
        dayName: dayLabels[i],
        dayNum: d.getDate(),
        isSelected: dateStr === selectedDate,
        progress,
      });
    }

    return days;
  }, [selectedDate, dailyLogs, budget]);

  return (
    <View style={styles.container}>
      <View style={styles.stripRow}>
        {weekDays.map((item) => {
          if (item.isSelected) {
            // High-Contrast Active Capsule (Black/Obsidian with circular progress)
            const size = 32;
            const strokeWidth = 2.5;
            const radius = (size - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - circumference * Math.max(0.08, item.progress);

            return (
              <Pressable
                key={item.dateStr}
                style={({ pressed }) => [
                  styles.activeCapsule,
                  pressed ? styles.pressedCapsule : null,
                ]}
                onPress={() => setSelectedDate(item.dateStr)}
                accessibilityRole="button"
                accessibilityLabel={`Selected ${item.dayName} ${item.dayNum}`}
                accessibilityState={{ selected: true }}
              >
                <View style={styles.activeCircleWrapper}>
                  <Svg width={size} height={size} style={styles.svgRing}>
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke="#FFFFFF"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                  </Svg>
                  <Text style={styles.activeDayNumText}>{item.dayNum}</Text>
                </View>

                <Text style={styles.activeDayNameText}>{item.dayName}</Text>
              </Pressable>
            );
          }

          // Unselected Translucent White Capsule
          return (
            <Pressable
              key={item.dateStr}
              style={({ pressed }) => [
                styles.capsule,
                pressed ? styles.pressedCapsule : null,
              ]}
              onPress={() => setSelectedDate(item.dateStr)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.dayName} ${item.dayNum}`}
              accessibilityState={{ selected: false }}
            >
              <View style={styles.circleNumber}>
                <Text style={styles.dayNumText}>{item.dayNum}</Text>
              </View>
              <Text style={styles.dayNameText}>{item.dayName}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Inactive White Capsule
  capsule: {
    width: 44,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  circleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  dayNameText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  // Active High-Contrast Capsule
  activeCapsule: {
    width: 46,
    height: 76,
    borderRadius: 23,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  activeCircleWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svgRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  activeDayNumText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeDayNameText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pressedCapsule: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});
