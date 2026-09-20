import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useHealth } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

interface DayItem {
  dateStr: string;
  dayName: string; // 'SUN', 'MON', etc.
  dayNum: number;  // 20, 21, etc.
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  progress: number; // 0 to 1
  hasData: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad2 = (n: number) => String(n).padStart(2, '0');

const toDateString = (d: Date): string => {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const parseDateString = (str: string): Date => {
  const parts = str.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date();
};

export const TopDateStrip: React.FC = () => {
  const { selectedDate, setSelectedDate, shiftDate, dailyLogs, userGoals } = useHealth();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Calendar Modal State
  const [calendarYear, setCalendarYear] = useState(() => parseDateString(selectedDate).getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateString(selectedDate).getMonth());

  const budget = userGoals.dailyCalorieBudget || 2000;

  // Real-world today reference
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const isViewingToday = selectedDate === todayStr;

  // Touch gesture tracking for swipe navigation
  const touchStartX = useRef<number>(0);

  const onTouchStart = (e: GestureResponderEvent) => {
    touchStartX.current = e.nativeEvent.pageX;
  };

  const onTouchEnd = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - touchStartX.current;
    if (dx > 48) {
      // Swiped right -> go to previous week
      shiftDate(-7);
    } else if (dx < -48) {
      // Swiped left -> go to next week
      shiftDate(7);
    }
  };

  // 7 Days of the currently selected week (SUN to SAT)
  const { weekDays, monthHeaderTitle } = useMemo(() => {
    const current = parseDateString(selectedDate);
    const dayOfWeek = current.getDay(); // 0 is Sunday
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const days: DayItem[] = [];
    const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);

      const dateStr = toDateString(d);
      const log = dailyLogs[dateStr];
      const cals = log && Array.isArray(log.meals)
        ? log.meals.reduce((sum, item) => sum + item.calories, 0)
        : 0;
      const progress = Math.min(1, Math.max(0, cals / budget));
      const hasData = Boolean(
        (log && Array.isArray(log.meals) && log.meals.length > 0) ||
        (log && typeof log.waterMl === 'number' && log.waterMl > 0) ||
        (log && typeof log.steps === 'number' && log.steps > 0)
      );

      days.push({
        dateStr,
        dayName: dayLabels[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isFuture: dateStr > todayStr,
        progress,
        hasData,
      });
    }

    // Determine the month header title
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    let title = '';
    if (sunday.getMonth() === saturday.getMonth()) {
      title = `${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`;
    } else if (sunday.getFullYear() === saturday.getFullYear()) {
      title = `${SHORT_MONTHS[sunday.getMonth()]} – ${SHORT_MONTHS[saturday.getMonth()]} ${sunday.getFullYear()}`;
    } else {
      title = `${SHORT_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()} – ${SHORT_MONTHS[saturday.getMonth()]} ${saturday.getFullYear()}`;
    }

    return { weekDays: days, monthHeaderTitle: title };
  }, [selectedDate, dailyLogs, budget, todayStr]);

  // Open calendar synchronized to currently selected date's month
  const handleOpenCalendar = () => {
    const d = parseDateString(selectedDate);
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth());
    setIsCalendarOpen(true);
  };

  // Calendar Modal Navigation
  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  // Generate days grid for month modal
  const monthGrid = useMemo(() => {
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const cells: Array<{
      dayNum: number | null;
      dateStr: string | null;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasMeals: boolean;
    }> = [];

    // Leading empty slots
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({
        dayNum: null,
        dateStr: null,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        hasMeals: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${pad2(calendarMonth + 1)}-${pad2(d)}`;
      const log = dailyLogs[dateStr];
      const hasMeals = Boolean(log && Array.isArray(log.meals) && log.meals.length > 0);

      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        hasMeals,
      });
    }

    return cells;
  }, [calendarYear, calendarMonth, dailyLogs, todayStr, selectedDate]);

  return (
    <View style={styles.container}>
      {/* 1. Context Header Toolbar (Month Label, Jump to Today, Week Chevrons) */}
      <View style={styles.headerToolbar}>
        {/* Month & Year with subtle drop chevron */}
        <Pressable
          style={({ pressed }) => [styles.monthSelector, pressed ? styles.btnPressed : null]}
          onPress={handleOpenCalendar}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Change month, currently ${monthHeaderTitle}`}
        >
          <Ionicons name="calendar-outline" size={15} color="#475569" style={styles.monthIcon} />
          <Text style={styles.monthTitleText}>{monthHeaderTitle}</Text>
          <Ionicons name="chevron-down" size={13} color="#64748B" style={styles.chevronDown} />
        </Pressable>

        {/* Right Action Group: Dynamic "Today" Pill + Week Arrow Chevrons */}
        <View style={styles.rightActionGroup}>
          {!isViewingToday && (
            <Pressable
              style={({ pressed }) => [styles.todayPill, pressed ? styles.btnPressed : null]}
              onPress={() => setSelectedDate(todayStr)}
              accessibilityRole="button"
              accessibilityLabel="Return to today"
            >
              <View style={styles.todayPillDot} />
              <Text style={styles.todayPillText}>Today</Text>
            </Pressable>
          )}

          {/* Week Navigation Arrows */}
          <View style={styles.weekArrowsContainer}>
            <Pressable
              style={({ pressed }) => [styles.arrowCircle, pressed ? styles.btnPressed : null]}
              onPress={() => shiftDate(-7)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Previous week"
            >
              <Ionicons name="chevron-back" size={15} color="#334155" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.arrowCircle, pressed ? styles.btnPressed : null]}
              onPress={() => shiftDate(7)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Next week"
            >
              <Ionicons name="chevron-forward" size={15} color="#334155" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2. Seven Day Pill Strip with Touch Swipe Responder */}
      <View
        style={styles.stripRow}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
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

          // Unselected Translucent White Capsule with Subtle Mini Ring & Today Indicator
          const size = 32;
          const strokeWidth = 2;
          const radius = (size - strokeWidth) / 2;
          const circumference = 2 * Math.PI * radius;
          const hasProgress = !item.isFuture && item.progress > 0;
          const strokeDashoffset = circumference - circumference * item.progress;

          return (
            <Pressable
              key={item.dateStr}
              style={({ pressed }) => [
                styles.capsule,
                item.isFuture ? styles.futureCapsule : null,
                pressed ? styles.pressedCapsule : null,
              ]}
              onPress={() => setSelectedDate(item.dateStr)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.dayName} ${item.dayNum}`}
              accessibilityState={{ selected: false }}
            >
              <View style={styles.circleNumberWrapper}>
                {!item.isFuture ? (
                  <Svg width={size} height={size} style={styles.svgRing}>
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke="#E2E8F0"
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    {hasProgress ? (
                      <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={item.progress >= 0.9 ? '#10B981' : Colors.primary}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                      />
                    ) : null}
                  </Svg>
                ) : (
                  <View style={styles.futureCircleBg} />
                )}

                <Text
                  style={[
                    styles.dayNumText,
                    item.isFuture ? styles.futureDayNumText : null,
                  ]}
                >
                  {item.dayNum}
                </Text>

                {/* Real-world Today indicator dot when unselected */}
                {item.isToday && (
                  <View style={styles.todayIndicatorDot} />
                )}
              </View>

              <Text
                style={[
                  styles.dayNameText,
                  item.isFuture ? styles.futureDayNameText : null,
                ]}
              >
                {item.dayName}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3. Interactive Month Calendar Picker Modal */}
      <Modal
        visible={isCalendarOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsCalendarOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalNavRow}>
                <Pressable
                  style={styles.modalArrowBtn}
                  onPress={prevMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={20} color="#0F172A" />
                </Pressable>

                <Text style={styles.modalMonthTitle}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>

                <Pressable
                  style={styles.modalArrowBtn}
                  onPress={nextMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                </Pressable>
              </View>

              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setIsCalendarOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Weekday Initials Row */}
            <View style={styles.modalWeekdaysRow}>
              {WEEKDAY_INITIALS.map((initial, index) => (
                <Text key={index} style={styles.modalWeekdayText}>
                  {initial}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.modalGrid}>
              {monthGrid.map((cell, idx) => {
                if (!cell.dayNum || !cell.dateStr) {
                  return <View key={`empty-${idx}`} style={styles.modalEmptyCell} />;
                }

                return (
                  <Pressable
                    key={cell.dateStr}
                    style={[
                      styles.modalDayCell,
                      cell.isSelected ? styles.modalDayCellSelected : null,
                      cell.isToday && !cell.isSelected ? styles.modalDayCellToday : null,
                    ]}
                    onPress={() => {
                      if (cell.dateStr) {
                        setSelectedDate(cell.dateStr);
                        setIsCalendarOpen(false);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.modalDayText,
                        cell.isSelected ? styles.modalDayTextSelected : null,
                        cell.isToday && !cell.isSelected ? styles.modalDayTextToday : null,
                      ]}
                    >
                      {cell.dayNum}
                    </Text>

                    {/* Meal activity dot */}
                    {cell.hasMeals && !cell.isSelected && (
                      <View style={styles.modalMealDot} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Modal Bottom Actions: Jump to Today & Close */}
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalTodayBtn}
                onPress={() => {
                  setSelectedDate(todayStr);
                  setIsCalendarOpen(false);
                }}
              >
                <Ionicons name="today-outline" size={16} color={Colors.primary} />
                <Text style={styles.modalTodayBtnText}>Jump to Today</Text>
              </Pressable>
            </View>
          </Pressable>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  // 1. Header Toolbar
  headerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  monthIcon: {
    marginRight: 1,
  },
  monthTitleText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    lineHeight: 19,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  chevronDown: {
    marginTop: 1,
  },
  rightActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 14,
    gap: 5,
  },
  todayPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F97316',
  },
  todayPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#C2410C',
    fontWeight: '600',
  },
  weekArrowsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  btnPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },

  // 2. Strip Row
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1.2,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  futureCapsule: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  circleNumberWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  futureCircleBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'transparent',
  },
  dayNumText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  futureDayNumText: {
    color: '#94A3B8',
  },
  todayIndicatorDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F47551',
  },
  dayNameText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  futureDayNameText: {
    color: '#94A3B8',
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

  // 3. Month Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  modalMonthTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  modalWeekdayText: {
    width: 36,
    textAlign: 'center',
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  modalEmptyCell: {
    width: 38,
    height: 38,
    marginVertical: 2,
  },
  modalDayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    position: 'relative',
  },
  modalDayCellSelected: {
    backgroundColor: '#0F172A',
  },
  modalDayCellToday: {
    borderWidth: 1.5,
    borderColor: '#F47551',
    backgroundColor: '#FFF7ED',
  },
  modalDayText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#1E293B',
  },
  modalDayTextSelected: {
    color: '#FFFFFF',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  modalDayTextToday: {
    color: '#EA580C',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  modalMealDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
  },
  modalTodayBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
});
