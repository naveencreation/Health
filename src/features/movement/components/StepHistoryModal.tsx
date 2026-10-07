import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  LayoutAnimation,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { DailyLog, StepLogEntry } from '@/types';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };
import { SlideInSubScreen } from '@/components/common/SlideInSubScreen';
import { StepReportScreen } from '../screens/StepReportScreen';
import {
  formatHistoryDateHeader,
  calculateStepMetrics,
  synthesizeSessionsFromTotal,
} from '@/utils/stepHistoryUtils';
import {
  FootstepsOutlineSvg,
  ClockOutlineSvg,
  FlameOutlineSvg,
  LocationPinOutlineSvg,
  EmptyShoesOutlineSvg,
} from './StepOutlineIcons';
import { StepEntryActionPopover } from './StepEntryActionPopover';

// Enable layout animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface StepHistoryModalProps {
  visible: boolean;
  dateStr?: string;
  entries?: StepLogEntry[];
  totalSteps?: number;
  dailyLogs?: Record<string, DailyLog>;
  onClose: () => void;
  onDeleteEntry?: (entry: StepLogEntry, dateStr: string) => void;
  onOpenReport?: () => void;
}

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

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const StepHistoryModalContent: React.FC<Omit<StepHistoryModalProps, 'visible'>> = ({
  dateStr: propDateStr,
  entries: propEntries,
  totalSteps: propTotalSteps,
  dailyLogs = {},
  onClose,
  onDeleteEntry,
  onOpenReport,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Step Report screen slide-in state
  const [isReportVisible, setIsReportVisible] = useState(false);
  const [isClosingReport, setIsClosingReport] = useState(false);

  const handleOpenReport = useCallback(() => {
    if (onOpenReport) {
      onOpenReport();
    } else {
      setIsReportVisible(true);
    }
  }, [onOpenReport]);

  // Primary anchor date (defaulting to today if not provided)
  const anchorDate = useMemo(() => {
    if (propDateStr) return propDateStr;
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }, [propDateStr]);

  // Expand / collapse state per date: key is dateStr, value is boolean
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Local overrides for deleted entries to provide instant reactivity
  const [deletedEntryIds, setDeletedEntryIds] = useState<Record<string, Set<string>>>({});

  // Kebab 3-dots action popover state
  const [popoverState, setPopoverState] = useState<{
    visible: boolean;
    entry: StepLogEntry | null;
    dateStr: string;
    positionY: number;
    positionX?: number;
  }>({
    visible: false,
    entry: null,
    dateStr: '',
    positionY: 200,
  });

  // Calendar picker state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const toggleDateExpanded = useCallback((date: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date],
    }));
  }, []);

  // Open action menu popover
  const handleOpenPopover = useCallback((entry: StepLogEntry, date: string, event: any) => {
    const pageY = event.nativeEvent.pageY || 200;
    const pageX = event.nativeEvent.pageX || 300;
    setPopoverState({
      visible: true,
      entry,
      dateStr: date,
      positionY: pageY,
      positionX: pageX,
    });
  }, []);

  const handleClosePopover = useCallback(() => {
    setPopoverState(prev => ({ ...prev, visible: false }));
  }, []);

  // Delete entry action
  const handleDeleteEntry = useCallback(
    (entry: StepLogEntry) => {
      const targetDate = popoverState.dateStr || anchorDate;

      // Mark locally deleted for instant UI update
      setDeletedEntryIds(prev => {
        const setForDate = new Set(prev[targetDate] || []);
        setForDate.add(entry.id);
        return {
          ...prev,
          [targetDate]: setForDate,
        };
      });

      // Propagate if callback provided
      if (onDeleteEntry) {
        onDeleteEntry(entry, targetDate);
      }

      handleClosePopover();
    },
    [popoverState.dateStr, anchorDate, onDeleteEntry, handleClosePopover]
  );

  // Collect all relevant dates
  const daysData = useMemo(() => {
    const datesSet = new Set<string>();

    if (anchorDate) datesSet.add(anchorDate);
    if (selectedCalendarDate) datesSet.add(selectedCalendarDate);

    // Add all dates from dailyLogs that have steps or stepEntries
    if (dailyLogs) {
      Object.keys(dailyLogs).forEach(d => {
        const log = dailyLogs[d];
        if (log && ((log.steps || 0) > 0 || (log.stepEntries && log.stepEntries.length > 0))) {
          datesSet.add(d);
        }
      });
    }

    // Sort descending (newest first)
    const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(d => {
      const isAnchor = d === anchorDate;
      const deletedSet = deletedEntryIds[d] || new Set();

      let entries: StepLogEntry[] = [];

      if (isAnchor && propEntries && propEntries.length > 0) {
        entries = propEntries.filter(e => !deletedSet.has(e.id));
      } else if (dailyLogs[d]?.stepEntries && dailyLogs[d].stepEntries!.length > 0) {
        entries = dailyLogs[d].stepEntries!.filter(e => !deletedSet.has(e.id));
      } else if (dailyLogs[d]?.steps && dailyLogs[d].steps > 0) {
        const synthesized = synthesizeSessionsFromTotal(dailyLogs[d].steps, d);
        entries = synthesized.filter(e => !deletedSet.has(e.id));
      } else if (isAnchor && (propTotalSteps || 0) > 0) {
        const synthesized = synthesizeSessionsFromTotal(propTotalSteps!, d);
        entries = synthesized.filter(e => !deletedSet.has(e.id));
      }

      // Calculate totals
      let dayTotalSteps = 0;
      let dayTotalTime = 0;
      let dayTotalCalories = 0;
      let dayTotalDistance = 0;

      if (entries.length > 0) {
        dayTotalSteps = entries.reduce((acc, e) => acc + (e.steps || 0), 0);
        dayTotalTime = entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
        dayTotalCalories = entries.reduce((acc, e) => acc + (e.caloriesBurned || 0), 0);
        dayTotalDistance = entries.reduce((acc, e) => acc + (e.distanceKm || 0), 0);
      } else if (isAnchor && propTotalSteps && propTotalSteps > 0) {
        const metrics = calculateStepMetrics(propTotalSteps);
        dayTotalSteps = propTotalSteps;
        dayTotalTime = metrics.durationMinutes;
        dayTotalCalories = metrics.calories;
        dayTotalDistance = metrics.distanceKm;
      } else if (dailyLogs[d]?.steps && dailyLogs[d].steps > 0) {
        const metrics = calculateStepMetrics(dailyLogs[d].steps);
        dayTotalSteps = dailyLogs[d].steps;
        dayTotalTime = metrics.durationMinutes;
        dayTotalCalories = metrics.calories;
        dayTotalDistance = metrics.distanceKm;
      }

      return {
        dateStr: d,
        entries,
        totalSteps: dayTotalSteps,
        totalTime: dayTotalTime,
        totalCalories: dayTotalCalories,
        totalDistance: dayTotalDistance,
      };
    });
  }, [anchorDate, selectedCalendarDate, dailyLogs, propEntries, propTotalSteps, deletedEntryIds]);

  // Filter out completely empty dates unless explicitly picked in calendar
  const activeDays = useMemo(() => {
    return daysData.filter(
      day => day.entries.length > 0 || day.totalSteps > 0 || day.dateStr === selectedCalendarDate
    );
  }, [daysData, selectedCalendarDate]);

  // Calendar modal calculations
  const monthGrid = useMemo(() => {
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const cells: Array<{ dayNum?: number; dateStr?: string; hasSteps?: boolean }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({});
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${calendarYear}-${pad2(calendarMonth + 1)}-${pad2(d)}`;
      const hasSteps = Boolean(
        dailyLogs[dStr]?.steps ||
        (dailyLogs[dStr]?.stepEntries && dailyLogs[dStr].stepEntries!.length > 0) ||
        dStr === anchorDate
      );
      cells.push({ dayNum: d, dateStr: dStr, hasSteps });
    }

    return cells;
  }, [calendarYear, calendarMonth, dailyLogs, anchorDate]);

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={[styles.screenContainer, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.mobileContainer}>
          {/* Top Header: [ Back ] [ Step Counter History ] [ Step Report ] */}
          <View style={styles.topHeader}>
            <View style={styles.headerSideWrapper}>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
                onPress={onClose}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={20} color={Colors.iconNavy} />
              </Pressable>
            </View>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.screenTitle} numberOfLines={1}>
                Step Counter History
              </Text>
            </View>

            <View style={[styles.headerSideWrapper, styles.headerRightWrapper]}>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
                onPress={handleOpenReport}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel="View Step Report"
              >
                <Ionicons name="stats-chart-outline" size={20} color={Colors.iconNavy} />
              </Pressable>
            </View>
          </View>

          {/* Scrollable multi-day feed */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 36 }]}
            showsVerticalScrollIndicator={false}
          >
            {activeDays.length === 0 ? (
              <View style={styles.emptyContainer}>
                <EmptyShoesOutlineSvg size={90} color={Colors.textLight} />
                <Text style={styles.emptyTitle}>No step records recorded</Text>
                <Text style={styles.emptySub}>
                  Walking sessions logged through Health Connect or manually will appear here.
                </Text>
              </View>
            ) : (
              activeDays.map(dayGroup => {
                const {
                  dateStr,
                  entries,
                  totalSteps: dayTotalSteps,
                  totalTime: dayTotalTime,
                  totalCalories: dayTotalCalories,
                  totalDistance: dayTotalDistance,
                } = dayGroup;

                const hasMoreThan5 = entries.length > 5;
                const isExpanded = expandedDates[dateStr] === true;
                const visibleEntries = hasMoreThan5 && !isExpanded ? entries.slice(0, 5) : entries;

                return (
                  <View key={dateStr} style={styles.daySection}>
                    {/* Date Header: "Today, Dec 22, 2024 ─────────" */}
                    <View style={styles.dateHeaderRow}>
                      <Text style={styles.dateHeaderText}>{formatHistoryDateHeader(dateStr)}</Text>
                      <View style={styles.dateHeaderHairline} />
                    </View>

                    {/* Day Card Container */}
                    <View style={styles.dayCard}>
                      {entries.length === 0 ? (
                        <View style={styles.dayEmptyRow}>
                          <Text style={styles.dayEmptyText}>No step sessions for this date</Text>
                        </View>
                      ) : (
                        <>
                          {/* Session Rows */}
                          {visibleEntries.map((entry, index) => {
                            const isLastInList = index === visibleEntries.length - 1;

                            return (
                              <View
                                key={entry.id || `session_${index}`}
                                style={[
                                  styles.sessionRow,
                                  (!isLastInList || hasMoreThan5) && styles.rowBorderBottom,
                                ]}
                              >
                                {/* 1. Footsteps (Orange) */}
                                <View style={[styles.col, styles.colSteps]}>
                                  <View style={styles.iconCell}>
                                    <FootstepsOutlineSvg size={20} color={Colors.steps} />
                                  </View>
                                  <Text style={styles.valueText} numberOfLines={1}>
                                    {entry.steps.toLocaleString()}
                                  </Text>
                                </View>

                                {/* 2. Time Duration (Green) */}
                                <View style={[styles.col, styles.colTime]}>
                                  <View style={styles.iconCell}>
                                    <ClockOutlineSvg size={20} color={Colors.success} />
                                  </View>
                                  <Text style={styles.valueText} numberOfLines={1}>
                                    {entry.durationMinutes}m
                                  </Text>
                                </View>

                                {/* 3. Calories (Red) */}
                                <View style={[styles.col, styles.colCalories]}>
                                  <View style={styles.iconCell}>
                                    <FlameOutlineSvg size={20} color={Colors.danger} />
                                  </View>
                                  <Text style={styles.valueText} numberOfLines={1}>
                                    {entry.caloriesBurned}
                                  </Text>
                                </View>

                                {/* 4. Distance (Blue) */}
                                <View style={[styles.col, styles.colDistance]}>
                                  <View style={styles.iconCell}>
                                    <LocationPinOutlineSvg size={20} color={Colors.water} />
                                  </View>
                                  <Text style={styles.valueText} numberOfLines={1}>
                                    {entry.distanceKm}
                                  </Text>
                                </View>

                                {/* 5. 3-Dots Kebab Action Menu */}
                                <Pressable
                                  style={({ pressed }) => [
                                    styles.kebabBtn,
                                    pressed && styles.btnPressed,
                                  ]}
                                  onPress={e => handleOpenPopover(entry, dateStr, e)}
                                  hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                                  accessibilityRole="button"
                                  accessibilityLabel="More options"
                                >
                                  <Ionicons name="ellipsis-vertical" size={18} color={Colors.textPrimary} />
                                </Pressable>
                              </View>
                            );
                          })}

                          {/* Expand / Collapse Toggle if > 5 entries */}
                          {hasMoreThan5 && (
                            <Pressable
                              style={({ pressed }) => [
                                styles.expandToggleBtn,
                                pressed && styles.btnPressed,
                              ]}
                              onPress={() => toggleDateExpanded(dateStr)}
                              accessibilityRole="button"
                              accessibilityLabel={
                                isExpanded
                                  ? 'Show less sessions'
                                  : `Show ${entries.length - 5} more sessions`
                              }
                            >
                              <Text style={styles.expandToggleText}>
                                {isExpanded
                                  ? 'Show less'
                                  : `+ Show ${entries.length - 5} more sessions`}
                              </Text>
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color={Colors.textSecondary}
                              />
                            </Pressable>
                          )}
                        </>
                      )}

                      {/* Labeled Total Divider: "Total ────────────────────────" */}
                      <View style={styles.totalDividerRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <View style={styles.totalHairline} />
                      </View>

                      {/* Total Row matching reference: 👣 4,205   ⏱️ 41m   🔥 205   📍 3.3 */}
                      <View style={styles.totalRow}>
                        {/* Total Steps */}
                        <View style={[styles.col, styles.colSteps]}>
                          <View style={styles.iconCell}>
                            <FootstepsOutlineSvg size={20} color={Colors.steps} />
                          </View>
                          <Text style={styles.valueText} numberOfLines={1}>
                            {dayTotalSteps.toLocaleString()}
                          </Text>
                        </View>

                        {/* Total Duration */}
                        <View style={[styles.col, styles.colTime]}>
                          <View style={styles.iconCell}>
                            <ClockOutlineSvg size={20} color={Colors.success} />
                          </View>
                          <Text style={styles.valueText} numberOfLines={1}>
                            {dayTotalTime}m
                          </Text>
                        </View>

                        {/* Total Calories */}
                        <View style={[styles.col, styles.colCalories]}>
                          <View style={styles.iconCell}>
                            <FlameOutlineSvg size={20} color={Colors.danger} />
                          </View>
                          <Text style={styles.valueText} numberOfLines={1}>
                            {dayTotalCalories}
                          </Text>
                        </View>

                        {/* Total Distance */}
                        <View style={[styles.col, styles.colDistance]}>
                          <View style={styles.iconCell}>
                            <LocationPinOutlineSvg size={20} color={Colors.water} />
                          </View>
                          <Text style={styles.valueText} numberOfLines={1}>
                            {dayTotalDistance.toFixed(1)}
                          </Text>
                        </View>

                        {/* Kebab Placeholder to guarantee exact 5-column grid alignment */}
                        <View style={styles.kebabPlaceholder} />
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Floating Action Menu Popover (Screenshot 2) */}
          <StepEntryActionPopover
            visible={popoverState.visible}
            positionY={popoverState.positionY}
            positionX={popoverState.positionX}
            entry={popoverState.entry}
            onDelete={handleDeleteEntry}
            onClose={handleClosePopover}
          />

          {/* Interactive Month Calendar Picker Modal */}
          <Modal
            visible={isCalendarOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsCalendarOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setIsCalendarOpen(false)}>
              <Pressable style={styles.calendarModalCard} onPress={e => e.stopPropagation()}>
                {/* Calendar Month Header */}
                <View style={styles.calendarHeaderRow}>
                  <View style={styles.calendarNavRow}>
                    <Pressable
                      style={styles.calNavArrow}
                      onPress={() => {
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear(y => y - 1);
                        } else {
                          setCalendarMonth(m => m - 1);
                        }
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                    </Pressable>

                    <Text style={styles.calendarMonthTitle}>
                      {MONTH_NAMES[calendarMonth]} {calendarYear}
                    </Text>

                    <Pressable
                      style={styles.calNavArrow}
                      onPress={() => {
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear(y => y + 1);
                        } else {
                          setCalendarMonth(m => m + 1);
                        }
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.calCloseBtn}
                    onPress={() => setIsCalendarOpen(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={20} color={Colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Weekday Initials */}
                <View style={styles.calendarWeekdaysRow}>
                  {WEEKDAY_INITIALS.map((initial, idx) => (
                    <Text key={idx} style={styles.calendarWeekdayText}>
                      {initial}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.calendarGrid}>
                  {monthGrid.map((cell, idx) => {
                    if (!cell.dayNum || !cell.dateStr) {
                      return <View key={`empty_${idx}`} style={styles.calendarEmptyCell} />;
                    }

                    const isSelected = cell.dateStr === selectedCalendarDate;

                    return (
                      <Pressable
                        key={cell.dateStr}
                        style={[
                          styles.calendarDayCell,
                          isSelected && styles.calendarDayCellSelected,
                        ]}
                        onPress={() => {
                          setSelectedCalendarDate(cell.dateStr!);
                          setIsCalendarOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                          ]}
                        >
                          {cell.dayNum}
                        </Text>
                        {cell.hasSteps && !isSelected && <View style={styles.calendarStepDot} />}
                      </Pressable>
                    );
                  })}
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Dedicated Full-Screen Step Report Sub-Screen */}
          {isReportVisible && (
            <SlideInSubScreen
              isClosing={isClosingReport}
              onClosed={() => {
                setIsReportVisible(false);
                setIsClosingReport(false);
              }}
              screenWidth={Math.min(screenWidth, 480)}
              zIndex={300}
            >
              <StepReportScreen onBack={() => setIsClosingReport(true)} />
            </SlideInSubScreen>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const StepHistoryModal: React.FC<StepHistoryModalProps> = props => {
  if (!props.visible) return null;
  return <StepHistoryModalContent {...props} />;
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    position: 'relative',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    minHeight: 44,
  },
  headerSideWrapper: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRightWrapper: {
    alignItems: 'flex-end',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  screenTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  daySection: {
    marginBottom: 24,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 12,
  },
  dateHeaderHairline: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderSubtle,
  },
  dayCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    shadowOpacity: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderWhisper,
  },
  col: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCell: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colSteps: {
    flex: 1.35,
  },
  colTime: {
    flex: 1.0,
  },
  colCalories: {
    flex: 1.0,
  },
  colDistance: {
    flex: 1.0,
  },
  valueText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  kebabBtn: {
    width: 24,
    height: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  kebabPlaceholder: {
    width: 24,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.surfaceLow,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderWhisper,
    gap: 6,
  },
  expandToggleText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  totalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  totalLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textMuted,
    marginRight: 10,
  },
  totalHairline: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderSubtle,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  dayEmptyRow: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayEmptyText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySub: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  // Calendar Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  calendarModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 18,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calNavArrow: {
    padding: 4,
  },
  calendarMonthTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  calCloseBtn: {
    padding: 4,
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekdayText: {
    width: 36,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarEmptyCell: {
    width: 36,
    height: 36,
    marginVertical: 3,
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  calendarDayCellSelected: {
    backgroundColor: Colors.steps,
  },
  calendarDayText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  calendarDayTextSelected: {
    color: Colors.onPrimary,
    fontFamily: Fonts.urbanist.semiBold,
  },
  calendarStepDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.steps,
  },
});
