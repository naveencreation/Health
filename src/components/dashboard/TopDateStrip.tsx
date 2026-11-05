import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { BIOMETRIC_DEFAULTS, KCAL_PER_STEP } from '@/constants/biometricDefaults';
import {
  parseDateString,
  getRollingSevenDays,
  getWeekWindowEnd,
  formatRangeMonthTitle,
  SHORT_DAY_NAMES,
  MONTH_NAMES,
  WEEKDAY_INITIALS,
  pad2,
} from '@/utils/dateUtils';

interface DayItem {
  dateStr: string;
  dayName: string; // 'SUN', 'MON', etc.
  dayNum: number; // 20, 21, etc.
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  progress: number; // 0 to 1
  hasData: boolean;
}

export interface TopDateStripProps {
  metric?: 'calories' | 'water' | 'weight' | 'steps';
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export const TopDateStripComponent: React.FC<TopDateStripProps> = ({
  metric = 'calories',
  style,
}) => {
  const { todayStr, selectedDate, setSelectedDate, shiftDate, dailyLogs } = useDailyLog();
  const { userGoals } = useGoals();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const isViewingToday = selectedDate === todayStr;

  // Calendar Modal State
  const [calendarYear, setCalendarYear] = useState(() =>
    parseDateString(selectedDate).getFullYear()
  );
  const [calendarMonth, setCalendarMonth] = useState(() =>
    parseDateString(selectedDate).getMonth()
  );

  const isWater = metric === 'water';
  const isWeight = metric === 'weight';
  const isSteps = metric === 'steps';
  const budget = userGoals.dailyCalorieBudget || BIOMETRIC_DEFAULTS.dailyCalorieBudget;
  const waterGoal = userGoals.waterGoalMl || BIOMETRIC_DEFAULTS.waterGoalMl;
  const stepGoal = userGoals.stepGoal || BIOMETRIC_DEFAULTS.stepGoal;
  const progressColor = isWater
    ? Colors.water
    : isWeight
      ? Colors.weight
      : isSteps
        ? Colors.steps
        : Colors.primary;
  const trackColor = isWater
    ? Colors.waterTrack
    : isWeight
      ? Colors.weightTrack
      : isSteps
        ? Colors.surfaceInset
        : Colors.borderInset;

  // The visible week is derived from selectedDate (same page as HeroCalorieCard), so the
  // week arrows move the selected day by 7 to keep the strip and the page on the same day.
  const windowEnd = getWeekWindowEnd(selectedDate, todayStr);
  const canGoForward = windowEnd < todayStr;

  const handlePrevWeek = useCallback(() => shiftDate(-7), [shiftDate]);

  const handleNextWeek = useCallback(() => {
    if (canGoForward) shiftDate(7);
  }, [canGoForward, shiftDate]);

  const handleJumpToToday = useCallback(() => {
    setSelectedDate(todayStr);
  }, [todayStr, setSelectedDate]);

  // Touch gesture tracking for swipe navigation
  const touchStart = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e: GestureResponderEvent) => {
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  }, []);

  const onTouchEnd = useCallback(
    (e: GestureResponderEvent) => {
      const dx = e.nativeEvent.pageX - touchStart.current.x;
      const dy = e.nativeEvent.pageY - touchStart.current.y;
      // Only a mostly-horizontal swipe changes week; a diagonal page scroll does not
      if (Math.abs(dx) < 2 * Math.abs(dy)) return;
      if (dx > 48) {
        // Swiped right -> go to previous week
        handlePrevWeek();
      } else if (dx < -48) {
        // Swiped left -> go to next week (strictly disabled at today boundary)
        if (canGoForward) {
          handleNextWeek();
        }
      }
    },
    [handlePrevWeek, handleNextWeek, canGoForward]
  );

  // 7 Days of the controlled rolling window
  const { weekDays, monthHeaderTitle } = useMemo(() => {
    const rollingDates = getRollingSevenDays(windowEnd, todayStr);
    const days: DayItem[] = [];

    for (let i = 0; i < rollingDates.length; i++) {
      const dateStr = rollingDates[i];
      const d = parseDateString(dateStr);
      const dayOfWeek = d.getDay(); // 0 is SUN, 1 is MON, etc.
      const dayName = SHORT_DAY_NAMES[dayOfWeek];

      const log = dailyLogs[dateStr];
      let progress = 0;
      if (isWater) {
        const waterMl = log && typeof log.waterMl === 'number' ? log.waterMl : 0;
        progress = Math.min(1, Math.max(0, waterMl / waterGoal));
      } else if (isWeight) {
        const hasWeight = Boolean(log && typeof log.weightKg === 'number' && log.weightKg > 0);
        progress = hasWeight ? 1 : 0;
      } else if (isSteps) {
        const steps = log && typeof log.steps === 'number' ? log.steps : 0;
        progress = Math.min(1, Math.max(0, steps / stepGoal));
      } else {
        const cals =
          log && Array.isArray(log.meals)
            ? log.meals.reduce((sum, item) => sum + item.calories, 0)
            : 0;
        // Same allowance as the hero dial: budget + workouts + step burn
        const workoutBurn = Array.isArray(log?.activities)
          ? log.activities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0)
          : 0;
        const burned = workoutBurn + Math.round((log?.steps || 0) * KCAL_PER_STEP);
        progress = Math.min(1, Math.max(0, cals / (budget + burned)));
      }

      const hasData = Boolean(
        (log && Array.isArray(log.meals) && log.meals.length > 0) ||
        (log && typeof log.waterMl === 'number' && log.waterMl > 0) ||
        (log && typeof log.steps === 'number' && log.steps > 0) ||
        (log && typeof log.weightKg === 'number' && log.weightKg > 0)
      );

      days.push({
        dateStr,
        dayName,
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isFuture: dateStr > todayStr,
        progress,
        hasData,
      });
    }

    const title = formatRangeMonthTitle(rollingDates[0], rollingDates[rollingDates.length - 1]);

    return { weekDays: days, monthHeaderTitle: title };
  }, [windowEnd, todayStr, selectedDate, dailyLogs, budget, isWater, isWeight, isSteps, waterGoal, stepGoal]);

  // Open calendar synchronized to currently selected date's month
  const handleOpenCalendar = useCallback(() => {
    const d = parseDateString(selectedDate);
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth());
    setIsCalendarOpen(true);
  }, [selectedDate]);

  const todayDate = useMemo(() => parseDateString(todayStr), [todayStr]);
  const canGoNextMonth = useMemo(() => {
    if (calendarYear < todayDate.getFullYear()) return true;
    if (calendarYear === todayDate.getFullYear()) {
      return calendarMonth < todayDate.getMonth();
    }
    return false;
  }, [calendarYear, calendarMonth, todayDate]);

  // Earliest browsable month: the oldest logged day (or the selected day if older)
  const earliestMonth = useMemo(() => {
    const oldest = Object.keys(dailyLogs).reduce((min, d) => (d < min ? d : min), selectedDate);
    return oldest.slice(0, 7);
  }, [dailyLogs, selectedDate]);
  const canGoPrevMonth = `${calendarYear}-${pad2(calendarMonth + 1)}` > earliestMonth;

  // Calendar Modal Navigation
  const prevMonth = useCallback(() => {
    if (!canGoPrevMonth) return;
    if (calendarMonth === 0) {
      setCalendarYear(calendarYear - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  }, [canGoPrevMonth, calendarMonth, calendarYear]);

  const nextMonth = useCallback(() => {
    if (!canGoNextMonth) return;
    if (calendarMonth === 11) {
      setCalendarYear(calendarYear + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  }, [canGoNextMonth, calendarMonth, calendarYear]);

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
      isFuture: boolean;
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
        isFuture: false,
        hasMeals: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${pad2(calendarMonth + 1)}-${pad2(d)}`;
      const isFuture = dateStr > todayStr;
      const log = dailyLogs[dateStr];
      const hasMeals = isWater
        ? Boolean(log && typeof log.waterMl === 'number' && log.waterMl > 0)
        : isWeight
          ? Boolean(log && typeof log.weightKg === 'number' && log.weightKg > 0)
          : Boolean(log && Array.isArray(log.meals) && log.meals.length > 0);

      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isFuture,
        hasMeals,
      });
    }

    return cells;
  }, [calendarYear, calendarMonth, dailyLogs, todayStr, selectedDate, isWater, isWeight]);

  return (
    <View style={[styles.container, style]}>
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
          <Ionicons name="calendar-outline" size={15} color={Colors.textSlate600} style={styles.monthIcon} />
          <Text style={styles.monthTitleText}>{monthHeaderTitle}</Text>
          <Ionicons name="chevron-down" size={13} color={Colors.textSecondary} style={styles.chevronDown} />
        </Pressable>

        {/* Right Action Group: Dynamic "Today" Pill + Week Arrow Chevrons */}
        <View style={styles.rightActionGroup}>
          {!isViewingToday && (
            <Pressable
              style={({ pressed }) => [styles.todayPill, pressed ? styles.btnPressed : null]}
              onPress={handleJumpToToday}
              accessibilityRole="button"
              accessibilityLabel="Return to today"
            >
              <Ionicons
                name="arrow-undo-outline"
                size={12}
                color={
                  isWater ? Colors.waterDark : isWeight ? Colors.weightDark : Colors.primaryDark
                }
              />
              <Text
                style={[
                  styles.todayPillText,
                  isWater && { color: Colors.waterDark },
                  isWeight && { color: Colors.weightDark },
                ]}
              >
                Today
              </Text>
            </Pressable>
          )}

          {/* Week Navigation Arrows */}
          <View style={styles.weekArrowsContainer}>
            <Pressable
              style={({ pressed }) => [styles.arrowCircle, pressed ? styles.btnPressed : null]}
              onPress={handlePrevWeek}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Previous week"
            >
              <Ionicons name="chevron-back" size={15} color={Colors.textSlate700} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.arrowCircle,
                !canGoForward && styles.arrowCircleDisabled,
                pressed && canGoForward ? styles.btnPressed : null,
              ]}
              onPress={handleNextWeek}
              disabled={!canGoForward}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Next week"
              accessibilityState={{ disabled: !canGoForward }}
            >
              <Ionicons
                name="chevron-forward"
                size={15}
                color={canGoForward ? Colors.textSlate700 : Colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2. Seven Day Pill Strip with Touch Swipe Responder */}
      <View style={styles.stripRow} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {weekDays.map(item => {
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
                      stroke={Colors.onPrimary}
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
                      stroke={trackColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    {hasProgress ? (
                      <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={progressColor}
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

                <Text style={[styles.dayNumText, item.isFuture ? styles.futureDayNumText : null]}>
                  {item.dayNum}
                </Text>

                {/* Real-world Today indicator dot when unselected */}
                {item.isToday && <View style={styles.todayIndicatorDot} />}
              </View>

              <Text style={[styles.dayNameText, item.isFuture ? styles.futureDayNameText : null]}>
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
        <Pressable style={styles.modalOverlay} onPress={() => setIsCalendarOpen(false)}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalNavRow}>
                <Pressable
                  style={[styles.modalArrowBtn, !canGoPrevMonth && styles.modalArrowBtnDisabled]}
                  onPress={prevMonth}
                  disabled={!canGoPrevMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  accessibilityState={{ disabled: !canGoPrevMonth }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={canGoPrevMonth ? Colors.textPrimary : Colors.textMuted}
                  />
                </Pressable>

                <Text style={styles.modalMonthTitle}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>

                <Pressable
                  style={[styles.modalArrowBtn, !canGoNextMonth && styles.modalArrowBtnDisabled]}
                  onPress={nextMonth}
                  disabled={!canGoNextMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  accessibilityState={{ disabled: !canGoNextMonth }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={canGoNextMonth ? Colors.textPrimary : Colors.textMuted}
                  />
                </Pressable>
              </View>

              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setIsCalendarOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close calendar"
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
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
                      cell.isFuture ? styles.modalDayCellFuture : null,
                    ]}
                    disabled={cell.isFuture}
                    accessibilityRole="button"
                    accessibilityLabel={`${cell.dayNum} ${MONTH_NAMES[calendarMonth]} ${calendarYear}${cell.isFuture ? ', future date' : ''}${cell.hasMeals ? ', has entries' : ''}`}
                    accessibilityState={{ disabled: cell.isFuture, selected: cell.isSelected }}
                    onPress={() => {
                      if (cell.dateStr && !cell.isFuture) {
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
                        cell.isFuture ? styles.modalDayTextFuture : null,
                      ]}
                    >
                      {cell.dayNum}
                    </Text>

                    {/* Meal activity dot */}
                    {cell.hasMeals && !cell.isSelected && !cell.isFuture && <View style={styles.modalMealDot} />}
                  </Pressable>
                );
              })}
            </View>

            {/* Modal Bottom Actions: Jump to Today & Close */}
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalTodayBtn}
                onPress={() => {
                  handleJumpToToday();
                  setIsCalendarOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Jump to today"
              >
                <Ionicons name="today-outline" size={16} color={progressColor} />
                <Text style={[styles.modalTodayBtnText, { color: progressColor }]}>
                  Jump to Today
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export const TopDateStrip = React.memo(TopDateStripComponent);

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
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textPrimary,
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
    backgroundColor: Colors.fatLight,
    borderWidth: 1,
    borderColor: Colors.burnBorder,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 5,
  },
  todayPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  todayPillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.primaryDark,
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
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircleDisabled: {
    opacity: 0.35,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  // 2. Strip Row
  stripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Inactive White Capsule
  capsule: {
    width: 42,
    height: 72,
    borderRadius: 21,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  futureCapsule: {
    backgroundColor: Colors.card,
    borderColor: Colors.borderWhisper,
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
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textSlate700,
  },
  futureDayNumText: {
    color: Colors.textMuted,
  },
  todayIndicatorDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  dayNameText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  futureDayNameText: {
    color: Colors.textMuted,
  },

  // Active High-Contrast Capsule
  activeCapsule: {
    width: 44,
    height: 76,
    borderRadius: 22,
    backgroundColor: Colors.inverseSurface,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.onPrimary,
  },
  activeDayNameText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    color: Colors.onPrimary,
    letterSpacing: 0.3,
  },
  pressedCapsule: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },

  // 3. Month Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayScrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 20,
    shadowColor: Colors.shadowColor,
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
    backgroundColor: Colors.surfaceLow,
  },
  modalArrowBtnDisabled: {
    opacity: 0.35,
  },
  modalMonthTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceInset,
  },
  modalWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  modalWeekdayText: {
    width: 36,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textMuted,
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
    backgroundColor: Colors.inverseSurface,
  },
  modalDayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.fatLight,
  },
  modalDayCellFuture: {
    opacity: 0.35,
  },
  modalDayText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSlate800,
  },
  modalDayTextSelected: {
    color: Colors.onPrimary,
    fontFamily: Fonts.urbanist.bold,
  },
  modalDayTextToday: {
    color: Colors.primaryDark,
    fontFamily: Fonts.urbanist.bold,
  },
  modalDayTextFuture: {
    color: Colors.textMuted,
  },
  modalMealDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.protein,
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceInset,
    alignItems: 'center',
  },
  modalTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.fatLight,
  },
  modalTodayBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.primaryDark,
  },
});
