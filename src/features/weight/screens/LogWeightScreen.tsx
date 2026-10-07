import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useDailyLog, useGoals, getTodayDateString } from '@/context/HealthContext';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

export interface LogWeightScreenProps {
  initialWeight?: number; // in kg
  initialNote?: string;
  targetDate?: string;
  targetEntryId?: string;
  onClose: () => void;
  onSave?: (savedWeightKg: number) => void;
  onDelete?: () => void;
}

const QUICK_TAGS = ['Morning fasted', 'Post workout', 'Pre meal', 'Evening'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const LogWeightScreen: React.FC<LogWeightScreenProps> = ({
  initialWeight,
  initialNote,
  targetDate,
  targetEntryId,
  onClose,
  onSave,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  const { dailyLogs, logWeight, updateWeightEntry, deleteWeightEntry, currentLog } = useDailyLog();
  const { userGoals, updateGoals } = useGoals();

  const todayStr = useMemo(() => getTodayDateString(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getTodayDateString(d);
  }, []);

  const [activeDate, setActiveDate] = useState<string>(() => {
    return targetDate || getTodayDateString(new Date());
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());

  const [unit, setUnit] = useState<'kg' | 'lbs'>(userGoals.weightUnit || 'kg');
  const [weightKg, setWeightKg] = useState<number>(() => {
    return initialWeight ?? currentLog?.weightKg ?? userGoals.currentWeightKg ?? 68.0;
  });

  const [selectedTag, setSelectedTag] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  // Monitor keyboard visibility for responsive viewport adaptation
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleDateSelect = useCallback(
    (newDate: string) => {
      setActiveDate(newDate);
      if (!targetEntryId) {
        const existingLog = dailyLogs[newDate];
        if (existingLog && typeof existingLog.weightKg === 'number' && existingLog.weightKg > 0) {
          setWeightKg(existingLog.weightKg);
          const latestEntry = existingLog.weightEntries?.[0];
          const existingNote = latestEntry?.note || '';
          if (existingNote) {
            const matchingTag = QUICK_TAGS.find(tag => existingNote.startsWith(tag));
            if (matchingTag) {
              setSelectedTag(matchingTag);
              const rest = existingNote
                .replace(matchingTag, '')
                .replace(/^[ •\-]+/, '')
                .trim();
              setCustomNote(rest);
            } else {
              setSelectedTag('');
              setCustomNote(existingNote);
            }
          } else {
            setSelectedTag('');
            setCustomNote('');
          }
        } else {
          const fallbackKg = currentLog?.weightKg ?? userGoals.currentWeightKg ?? 68.0;
          setWeightKg(fallbackKg);
          setSelectedTag('');
          setCustomNote('');
        }
        setIsManualInput(false);
        setManualText('');
      }
    },
    [targetEntryId, dailyLogs, currentLog?.weightKg, userGoals.currentWeightKg]
  );

  // Initialize and synchronize state when screen mounts
  useEffect(() => {
    const startingKg = initialWeight ?? currentLog?.weightKg ?? userGoals.currentWeightKg ?? 68.0;
    setWeightKg(startingKg);
    setUnit(userGoals.weightUnit || 'kg');

    const initialDate = targetDate || getTodayDateString(new Date());
    setActiveDate(initialDate);

    const [y, m] = initialDate.split('-').map(Number);
    if (y && m) {
      setCalendarYear(y);
      setCalendarMonth(m - 1);
    }

    if (initialNote) {
      const matchingTag = QUICK_TAGS.find(tag => initialNote.startsWith(tag));
      if (matchingTag) {
        setSelectedTag(matchingTag);
        const rest = initialNote
          .replace(matchingTag, '')
          .replace(/^[ •\-]+/, '')
          .trim();
        setCustomNote(rest);
      } else {
        setSelectedTag('');
        setCustomNote(initialNote);
      }
    } else {
      setSelectedTag('');
      setCustomNote('');
    }

    setIsManualInput(false);
    setManualText('');
  }, [
    initialWeight,
    initialNote,
    targetDate,
    currentLog?.weightKg,
    userGoals.currentWeightKg,
    userGoals.weightUnit,
  ]);

  // Calendar month navigation
  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(y => y - 1);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const isCurrentOrFutureMonth = useMemo(() => {
    const now = new Date();
    return (
      calendarYear > now.getFullYear() ||
      (calendarYear === now.getFullYear() && calendarMonth >= now.getMonth())
    );
  }, [calendarYear, calendarMonth]);

  const nextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(y => y + 1);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  // Build calendar grid cells
  const monthGrid = useMemo(() => {
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const cells: Array<{
      dayNum: number | null;
      dateStr: string | null;
      isToday: boolean;
      isSelected: boolean;
      isFuture: boolean;
      hasLoggedWeight: boolean;
    }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({
        dayNum: null,
        dateStr: null,
        isToday: false,
        isSelected: false,
        isFuture: false,
        hasLoggedWeight: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = dailyLogs[dStr];
      const hasLoggedWeight = Boolean(
        (log && typeof log.weightKg === 'number' && log.weightKg > 0) ||
        (log && log.weightEntries && log.weightEntries.length > 0)
      );
      const isFuture = dStr > todayStr;

      cells.push({
        dayNum: d,
        dateStr: dStr,
        isToday: dStr === todayStr,
        isSelected: dStr === activeDate,
        isFuture,
        hasLoggedWeight,
      });
    }

    // Trailing empty cells to ensure a full 7-column grid on the last row
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const trailingCount = 7 - remainder;
      for (let i = 0; i < trailingCount; i++) {
        cells.push({
          dayNum: null,
          dateStr: null,
          isToday: false,
          isSelected: false,
          isFuture: false,
          hasLoggedWeight: false,
        });
      }
    }

    return cells;
  }, [calendarYear, calendarMonth, todayStr, activeDate, dailyLogs]);

  // Display value in chosen unit
  const displayWeight = unit === 'kg' ? weightKg : weightKg * 2.20462;
  const formattedDisplay = displayWeight.toFixed(1);

  const handleStep = useCallback(
    (deltaInCurrentUnit: number) => {
      setIsManualInput(false);
      if (unit === 'kg') {
        setWeightKg(prev => {
          const next = Math.max(
            20,
            Math.min(300, Math.round((prev + deltaInCurrentUnit) * 10) / 10)
          );
          return next;
        });
      } else {
        setWeightKg(prev => {
          const currentLbs = prev * 2.20462;
          const nextLbs = Math.max(44, Math.min(660, currentLbs + deltaInCurrentUnit));
          // Use 2-decimal kg precision so that +/- 0.1 lbs (~0.045 kg) increments cleanly without quantization lock
          const nextKg = Math.round((nextLbs / 2.20462) * 100) / 100;
          return nextKg;
        });
      }
    },
    [unit]
  );

  const handleToggleUnit = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === unit) return;
    setUnit(newUnit);
    setIsManualInput(false);
    updateGoals({ weightUnit: newUnit });
  };

  const handleManualTextChange = (text: string) => {
    setManualText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed > 0) {
      if (unit === 'kg') {
        setWeightKg(Math.min(300, Math.max(20, Math.round(parsed * 10) / 10)));
      } else {
        const inKg = parsed / 2.20462;
        setWeightKg(Math.min(300, Math.max(20, Math.round(inKg * 100) / 100)));
      }
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSave = () => {
    Keyboard.dismiss();
    const finalNote = selectedTag
      ? customNote
        ? `${selectedTag} • ${customNote}`
        : selectedTag
      : customNote;

    // Retain 2-decimal precision for lbs so displaying in lbs never drifts or loses 0.1 increments
    const roundedKg =
      unit === 'lbs' ? Math.round(weightKg * 100) / 100 : Math.round(weightKg * 10) / 10;

    if (targetEntryId) {
      updateWeightEntry(
        targetEntryId,
        { weightKg: roundedKg, note: finalNote || undefined },
        targetDate,
        activeDate
      );
    } else {
      logWeight(roundedKg, activeDate, finalNote || undefined);
    }
    onSave?.(roundedKg);
    onClose();
  };

  const handleDeleteEntry = () => {
    Keyboard.dismiss();
    if (targetEntryId) {
      deleteWeightEntry(targetEntryId, targetDate);
      onDelete?.();
      onClose();
    }
  };

  // Date Label for Header & Chips
  const dateLabel = useMemo(() => {
    if (!activeDate) return 'Today';
    if (activeDate === todayStr) return 'Today';
    if (activeDate === yesterdayStr) return 'Yesterday';

    try {
      const [y, m, d] = activeDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return activeDate;
    }
  }, [activeDate, todayStr, yesterdayStr]);

  const isCustomDate = activeDate !== todayStr && activeDate !== yesterdayStr;
  const customDateChipLabel = useMemo(() => {
    if (!isCustomDate) return 'Pick Date';
    try {
      const [y, m, d] = activeDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Pick Date';
    }
  }, [activeDate, isCustomDate]);

  // Target comparison hint (supports both weight loss and weight gain goals)
  const goalDiffHint = useMemo(() => {
    if (!userGoals.targetWeightKg) return null;
    const target = userGoals.targetWeightKg;
    const isGain = userGoals.startWeightKg ? target > userGoals.startWeightKg : false;

    if (Math.abs(weightKg - target) < 0.05) {
      return 'Goal reached! 🎉';
    }

    if (isGain) {
      if (weightKg >= target) return 'Goal reached! 🎉';
      const remainingKg = Math.round((target - weightKg) * 10) / 10;
      const display = unit === 'kg' ? remainingKg.toFixed(1) : (remainingKg * 2.20462).toFixed(1);
      return `${display} ${unit} to goal`;
    } else {
      if (weightKg <= target) return 'Goal reached! 🎉';
      const remainingKg = Math.round((weightKg - target) * 10) / 10;
      const display = unit === 'kg' ? remainingKg.toFixed(1) : (remainingKg * 2.20462).toFixed(1);
      return `${display} ${unit} to goal`;
    }
  }, [weightKg, userGoals.targetWeightKg, userGoals.startWeightKg, unit]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={[
          styles.rootContainer,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          {/* 1. Header Toolbar */}
          <View style={styles.headerBar}>
            <Pressable
              style={({ pressed }) => [styles.headerCircleBtn, pressed && styles.btnPressed]}
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTitleCenter}>
              <Text style={styles.headerTitleText}>
                {targetEntryId ? 'Edit Weigh-In' : 'Log Weigh-In'}
              </Text>
              <Text style={styles.headerSubtitleText}>{dateLabel}</Text>
            </View>

            {targetEntryId ? (
              <Pressable
                style={({ pressed }) => [styles.headerDeleteBtn, pressed && styles.btnPressed]}
                onPress={handleDeleteEntry}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Delete entry"
              >
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              </Pressable>
            ) : (
              <View style={styles.headerRightSpacer} />
            )}
          </View>

          {/* 2. Date Quick Ribbon */}
          <View style={[styles.dateRibbonRow, isKeyboardOpen && styles.dateRibbonRowCompact]}>
            {/* Today Chip */}
            <Pressable
              style={[styles.dateChip, activeDate === todayStr && styles.dateChipActive]}
              onPress={() => handleDateSelect(todayStr)}
            >
              <Text
                style={[styles.dateChipText, activeDate === todayStr && styles.dateChipTextActive]}
              >
                Today
              </Text>
            </Pressable>

            {/* Yesterday Chip */}
            <Pressable
              style={[styles.dateChip, activeDate === yesterdayStr && styles.dateChipActive]}
              onPress={() => handleDateSelect(yesterdayStr)}
            >
              <Text
                style={[
                  styles.dateChipText,
                  activeDate === yesterdayStr && styles.dateChipTextActive,
                ]}
              >
                Yesterday
              </Text>
            </Pressable>

            {/* Other Date / Calendar Trigger */}
            <Pressable
              style={[styles.dateChip, isCustomDate && styles.dateChipActive]}
              onPress={() => setIsDatePickerOpen(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isCustomDate ? Colors.weight : Colors.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.dateChipText, isCustomDate && styles.dateChipTextActive]}>
                {customDateChipLabel}
              </Text>
            </Pressable>
          </View>

          {/* 3. Central Hero Display Card (Non-Scroll, Perfectly Centered) */}
          <View style={[styles.heroCard, isKeyboardOpen && styles.heroCardCompact]}>
            {/* Unit Toggle Pill */}
            <View
              style={[styles.unitPillContainer, isKeyboardOpen && styles.unitPillContainerCompact]}
            >
              <Pressable
                style={[styles.unitTab, unit === 'kg' && styles.unitTabActive]}
                onPress={() => handleToggleUnit('kg')}
              >
                <Text style={[styles.unitTabText, unit === 'kg' && styles.unitTabTextActive]}>
                  kg
                </Text>
              </Pressable>
              <Pressable
                style={[styles.unitTab, unit === 'lbs' && styles.unitTabActive]}
                onPress={() => handleToggleUnit('lbs')}
              >
                <Text style={[styles.unitTabText, unit === 'lbs' && styles.unitTabTextActive]}>
                  lbs
                </Text>
              </Pressable>
            </View>

            {/* Digital Weight Number */}
            {isManualInput ? (
              <View style={styles.manualInputRow}>
                <TextInput
                  style={[styles.manualInput, isKeyboardOpen && styles.manualInputCompact]}
                  value={manualText}
                  onChangeText={handleManualTextChange}
                  keyboardType="decimal-pad"
                  autoFocus
                  placeholder={formattedDisplay}
                  placeholderTextColor={Colors.textMuted}
                  selectTextOnFocus
                />
                <Text style={[styles.heroUnitLabel, isKeyboardOpen && styles.heroUnitLabelCompact]}>
                  {unit}
                </Text>
                <Pressable
                  style={styles.manualDoneBtn}
                  onPress={() => {
                    setIsManualInput(false);
                    Keyboard.dismiss();
                  }}
                >
                  <Ionicons name="checkmark" size={18} color={Colors.onPrimary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.heroDisplayRow}
                onPress={() => {
                  setManualText(formattedDisplay);
                  setIsManualInput(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Tap to type weight numerically"
              >
                <Text
                  style={[styles.heroNumberText, isKeyboardOpen && styles.heroNumberTextCompact]}
                >
                  {formattedDisplay}
                </Text>
                <Text style={[styles.heroUnitLabel, isKeyboardOpen && styles.heroUnitLabelCompact]}>
                  {unit}
                </Text>
                <View style={styles.editPencilBadge}>
                  <Feather name="edit-2" size={14} color={Colors.textMuted} />
                </View>
              </Pressable>
            )}

            {/* Goal Diff Hint */}
            {goalDiffHint && (
              <View style={styles.goalHintContainer}>
                <Ionicons
                  name="flag-outline"
                  size={13}
                  color={Colors.weightDark}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.goalHintText}>{goalDiffHint}</Text>
              </View>
            )}

            {/* Micro Steppers Bar (Hidden when keyboard is active to prevent squishing) */}
            {!isKeyboardOpen && (
              <View style={styles.steppersContainer}>
                <View style={styles.stepperGroup}>
                  <Pressable
                    style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                    onPress={() => handleStep(-1.0)}
                  >
                    <Text style={styles.stepperBtnLabel}>-1.0</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                    onPress={() => handleStep(-0.1)}
                  >
                    <Text style={styles.stepperBtnLabel}>-0.1</Text>
                  </Pressable>
                </View>

                <View style={styles.stepperDivider} />

                <View style={styles.stepperGroup}>
                  <Pressable
                    style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                    onPress={() => handleStep(0.1)}
                  >
                    <Text style={styles.stepperBtnLabel}>+0.1</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.stepperBtn, pressed && styles.btnPressed]}
                    onPress={() => handleStep(1.0)}
                  >
                    <Text style={styles.stepperBtnLabel}>+1.0</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* 4. Context & Note Card */}
          <View style={[styles.contextCard, isKeyboardOpen && styles.contextCardCompact]}>
            <Text style={styles.contextLabel}>CONTEXT (OPTIONAL)</Text>
            <View style={[styles.tagsGrid, isKeyboardOpen && styles.tagsGridCompact]}>
              {QUICK_TAGS.map(tag => {
                const isSelected = selectedTag === tag;
                return (
                  <Pressable
                    key={tag}
                    style={[styles.tagPill, isSelected && styles.tagPillActive]}
                    onPress={() => setSelectedTag(isSelected ? '' : tag)}
                  >
                    <Text style={[styles.tagPillText, isSelected && styles.tagPillTextActive]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Note Input */}
            <View style={styles.noteInputRow}>
              <Ionicons
                name="create-outline"
                size={17}
                color={Colors.textMuted}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.noteTextInput}
                placeholder="Add personal note (e.g. after morning run)..."
                placeholderTextColor={Colors.textMuted}
                value={customNote}
                onChangeText={setCustomNote}
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          </View>

          {/* Flexible Space to push button cleanly down */}
          <View style={styles.flexSpacer} />

          {/* 5. Fixed Pinned Bottom CTA (Always visible, zero scroll) */}
          <View
            style={[styles.bottomCtaContainer, isKeyboardOpen && styles.bottomCtaContainerCompact]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.saveCtaBtn,
                isKeyboardOpen && styles.saveCtaBtnCompact,
                pressed && styles.saveCtaBtnPressed,
              ]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Save Weigh-In"
            >
              <Text style={styles.saveCtaBtnText}>
                {targetEntryId ? 'Update Weigh-In' : 'Save Weigh-In'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* 6. Overlaid Date Picker Modal */}
        <Modal
          visible={isDatePickerOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsDatePickerOpen(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setIsDatePickerOpen(false)}>
            <Pressable style={styles.pickerCard} onPress={e => e.stopPropagation()}>
              {/* Picker Header */}
              <View style={styles.pickerHeader}>
                <Pressable
                  style={({ pressed }) => [styles.pickerNavBtn, pressed && styles.btnPressed]}
                  onPress={prevMonth}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
                </Pressable>
                <Text style={styles.pickerMonthTitle}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.pickerNavBtn,
                    isCurrentOrFutureMonth && styles.pickerNavBtnDisabled,
                    pressed && !isCurrentOrFutureMonth && styles.btnPressed,
                  ]}
                  onPress={nextMonth}
                  disabled={isCurrentOrFutureMonth}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isCurrentOrFutureMonth ? Colors.textLight : Colors.textPrimary}
                  />
                </Pressable>
              </View>

              {/* Weekday Initials */}
              <View style={styles.pickerWeekdaysRow}>
                {WEEKDAY_INITIALS.map((init, i) => (
                  <Text key={i} style={styles.pickerWeekdayText}>
                    {init}
                  </Text>
                ))}
              </View>

              {/* Day Cells Grid */}
              <View style={styles.pickerGrid}>
                {monthGrid.map((cell, idx) => {
                  if (!cell.dayNum || !cell.dateStr) {
                    return <View key={`empty-${idx}`} style={styles.pickerEmptyCell} />;
                  }

                  return (
                    <Pressable
                      key={cell.dateStr}
                      style={[
                        styles.pickerDayCell,
                        cell.isSelected && styles.pickerDayCellSelected,
                        cell.isToday && !cell.isSelected && styles.pickerDayCellToday,
                        cell.isFuture && styles.pickerDayCellDisabled,
                      ]}
                      disabled={cell.isFuture}
                      onPress={() => {
                        if (cell.dateStr) {
                          handleDateSelect(cell.dateStr);
                          setIsDatePickerOpen(false);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerDayText,
                          cell.isSelected && styles.pickerDayTextSelected,
                          cell.isToday && !cell.isSelected && styles.pickerDayTextToday,
                          cell.isFuture && styles.pickerDayTextDisabled,
                        ]}
                      >
                        {cell.dayNum}
                      </Text>
                      {cell.hasLoggedWeight && !cell.isSelected && (
                        <View style={styles.pickerLogDot} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Cancel Button */}
              <Pressable style={styles.pickerCloseBtn} onPress={() => setIsDatePickerOpen(false)}>
                <Text style={styles.pickerCloseBtnText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background
  },
  keyboardContainer: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },

  // 1. Header Toolbar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginBottom: 12,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  headerTitleText: {
    fontSize: 18,
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitleText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightSpacer: {
    width: 38,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  // 2. Date Quick Ribbon
  dateRibbonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  dateChipActive: {
    backgroundColor: Colors.weightLight,
    borderColor: Colors.weight,
  },
  dateChipText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textSecondary,
  },
  dateChipTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.weight,
  },

  // 3. Central Hero Display Card
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    marginBottom: 16,
  },
  unitPillContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceInset,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 3,
    marginBottom: 12,
  },
  unitTab: {
    paddingHorizontal: 18,
    paddingVertical: 5,
    borderRadius: 8,
  },
  unitTabActive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
  },
  unitTabText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textSecondary,
  },
  unitTabTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textPrimary,
  },
  heroDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: 4,
  },
  heroNumberText: {
    fontSize: 54,
    fontFamily: Fonts.urbanist.bold,
    color: Colors.weight,
    letterSpacing: -1.5,
  },
  heroUnitLabel: {
    fontSize: 22,
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.weight,
    marginLeft: 6,
  },
  editPencilBadge: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLow,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  manualInput: {
    fontSize: 54,
    fontFamily: Fonts.urbanist.bold,
    color: Colors.weight,
    textAlign: 'center',
    minWidth: 140,
    padding: 0,
    margin: 0,
  },
  manualDoneBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.weight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  goalHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.weightLight,
    borderRadius: 8,
  },
  goalHintText: {
    fontSize: 12,
    fontFamily: Fonts.urbanist.medium,
    color: Colors.weightDark,
  },
  steppersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
  },
  stepperGroup: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  stepperDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderInset,
    marginHorizontal: 10,
  },
  stepperBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderInset,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnLabel: {
    fontSize: 14,
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textSlate700,
  },

  // 4. Context & Note Card
  contextCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    marginBottom: 12,
  },
  contextLabel: {
    fontSize: 11,
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  tagPillActive: {
    backgroundColor: Colors.weightLight,
    borderColor: Colors.weight,
  },
  tagPillText: {
    fontSize: 12,
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textSlate600,
  },
  tagPillTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.weight,
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderInset,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteTextInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.urbanist.regular,
    color: Colors.textPrimary,
    padding: 0,
    margin: 0,
  },

  flexSpacer: {
    flex: 1,
    minHeight: 12,
  },

  // 5. Fixed Pinned Bottom CTA
  bottomCtaContainer: {
    width: '100%',
    paddingTop: 6,
  },
  saveCtaBtn: {
    backgroundColor: Colors.weight,
    borderRadius: 10,
    borderCurve: 'continuous',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCtaBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  saveCtaBtnText: {
    fontSize: 16,
    fontFamily: Fonts.urbanist.bold,
    color: Colors.onPrimary,
    letterSpacing: 0.3,
  },

  // Responsive Compact Viewport Styles (Active when Keyboard is open)
  dateRibbonRowCompact: {
    marginBottom: 8,
  },
  heroCardCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  unitPillContainerCompact: {
    marginBottom: 6,
  },
  heroNumberTextCompact: {
    fontSize: 38,
    letterSpacing: -1,
  },
  manualInputCompact: {
    fontSize: 38,
  },
  heroUnitLabelCompact: {
    fontSize: 17,
  },
  contextCardCompact: {
    padding: 12,
    marginBottom: 8,
  },
  tagsGridCompact: {
    marginBottom: 8,
  },
  bottomCtaContainerCompact: {
    paddingTop: 2,
  },
  saveCtaBtnCompact: {
    height: 44,
  },

  // 6. Overlaid Date Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayScrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 18,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  pickerNavBtnDisabled: {
    opacity: 0.3,
  },
  pickerMonthTitle: {
    fontSize: 15,
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textPrimary,
  },
  pickerWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  pickerWeekdayText: {
    fontSize: 12,
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textMuted,
    width: 32,
    textAlign: 'center',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  pickerEmptyCell: {
    width: 32,
    height: 32,
    marginVertical: 3,
  },
  pickerDayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  pickerDayCellSelected: {
    backgroundColor: Colors.weight,
  },
  pickerDayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.weight,
  },
  pickerDayCellDisabled: {
    opacity: 0.25,
  },
  pickerDayText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textSlate700,
  },
  pickerDayTextSelected: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.onPrimary,
  },
  pickerDayTextToday: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.weight,
  },
  pickerDayTextDisabled: {
    color: Colors.textLight,
  },
  pickerLogDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.weight,
    position: 'absolute',
    bottom: 2,
  },
  pickerCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: Colors.surfaceInset,
  },
  pickerCloseBtnText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textSlate600,
  },
});
