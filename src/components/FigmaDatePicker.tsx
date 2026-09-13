import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { useHealth } from '../context/HealthContext';

interface DayItem {
  dateStr: string;
  dayName: string; // 'Mon', 'Tue', etc.
  dayNum: number;  // 12, 13, etc.
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
}

export const FigmaDatePicker: React.FC = () => {
  const { selectedDate, setSelectedDate, shiftDate } = useHealth();

  // Generate 7 days for the currently selected week (Mon to Sun)
  const weekDays = useMemo((): DayItem[] => {
    const parts = selectedDate.split('-');
    const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    // Calculate Monday of this week (Monday = 1, Sunday = 0 -> adjust so Monday is first day)
    const dayOfWeek = current.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

    const monday = new Date(current);
    monday.setDate(current.getDate() + diffToMonday);

    const todayStr = (() => {
      const t = new Date();
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    })();

    const days: DayItem[] = [];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dateVal}`;

      days.push({
        dateStr,
        dayName: dayLabels[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isFuture: dateStr > todayStr,
      });
    }

    return days;
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      {/* Left Navigation Arrow (Alt Arrow Left: left -2px, top 519px) */}
      <TouchableOpacity
        style={styles.arrowButton}
        onPress={() => shiftDate(-7)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={20} color="rgba(28, 39, 76, 0.6)" />
      </TouchableOpacity>

      {/* Frame 299 / Frame 298: 7 Weekday Columns */}
      <View style={styles.daysRow}>
        {weekDays.map((item) => {
          if (item.isSelected) {
            // Figma Rectangle 30: 46px wide x 75px tall, border-radius 20px, #F47551
            return (
              <View key={item.dateStr} style={styles.activePillWrapper}>
                <TouchableOpacity
                  style={styles.activePill}
                  activeOpacity={0.9}
                  onPress={() => setSelectedDate(item.dateStr)}
                >
                  <Text style={styles.activeDayText}>{item.dayName}</Text>
                  <Text style={styles.activeDateText}>{item.dayNum}</Text>
                </TouchableOpacity>
              </View>
            );
          }

          // Unselected Days
          return (
            <TouchableOpacity
              key={item.dateStr}
              style={styles.dayCol}
              onPress={() => setSelectedDate(item.dateStr)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  item.isFuture && styles.futureText,
                ]}
              >
                {item.dayName}
              </Text>
              <Text
                style={[
                  styles.dateNumText,
                  item.isFuture && styles.futureText,
                ]}
              >
                {item.dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Right Navigation Arrow (Alt Arrow Right: left 344px, top 519px) */}
      <TouchableOpacity
        style={styles.arrowButton}
        onPress={() => shiftDate(7)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-forward" size={20} color="rgba(28, 39, 76, 0.6)" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Frame 299: top: 504px, width: 331px, height: 54px
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 14,
    height: 85, // Accommodate the 75px active pill
  },
  arrowButton: {
    width: 28,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayCol: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    paddingVertical: 6,
  },
  // Inactive Day Names: Poppins 16px / line-height 27px, rgba(0, 0, 0, 0.9)
  dayText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.85)',
    marginBottom: 4,
  },
  // Inactive Date Numbers: Poppins 16px / line-height 27px, rgba(0, 0, 0, 0.9)
  dateNumText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.85)',
  },
  // Future dates: rgba(0, 0, 0, 0.4) per Figma
  futureText: {
    color: 'rgba(0, 0, 0, 0.35)',
  },
  // Figma Rectangle 30: width 46px, height 75px, border-radius 20px, background #F47551
  activePillWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    width: 46,
    height: 75,
    backgroundColor: '#F47551',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  activeDayText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activeDateText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
