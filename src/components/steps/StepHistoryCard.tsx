import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { StepLogEntry, DailyLog } from '@/types';
import {
  formatHistoryDateHeader,
  mapHealthConnectRecordsToStepEntries,
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
import { StepHistoryModal } from './StepHistoryModal';

export interface StepHistoryCardProps {
  dateStr: string;
  totalSteps: number;
  rawHealthRecords?: any[];
  customEntries?: StepLogEntry[];
  dailyLogs?: Record<string, DailyLog>;
  onDeleteEntry?: (entry: StepLogEntry) => void;
  style?: StyleProp<ViewStyle>;
}

export const StepHistoryCard: React.FC<StepHistoryCardProps> = ({
  dateStr,
  totalSteps,
  rawHealthRecords = [],
  customEntries,
  dailyLogs,
  onDeleteEntry,
  style,
}) => {
  // Popover state
  const [popoverState, setPopoverState] = useState<{
    visible: boolean;
    entry: StepLogEntry | null;
    positionY: number;
    positionX?: number;
  }>({
    visible: false,
    entry: null,
    positionY: 300,
  });

  // View All modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Derive display entries
  const displayEntries: StepLogEntry[] = useMemo(() => {
    // 1. If custom/manual entries passed, use them
    if (customEntries && customEntries.length > 0) {
      return customEntries;
    }

    // 2. If raw Health Connect records exist, map them
    if (rawHealthRecords && rawHealthRecords.length > 0) {
      const mapped = mapHealthConnectRecordsToStepEntries(rawHealthRecords);
      if (mapped.length > 0) {
        return mapped;
      }
    }

    // 3. Fallback: If totalSteps > 0, synthesize realistic sessions
    if (totalSteps > 0) {
      return synthesizeSessionsFromTotal(totalSteps, dateStr);
    }

    return [];
  }, [customEntries, rawHealthRecords, totalSteps, dateStr]);

  const previewEntries = displayEntries.slice(0, 4);
  const hasEntries = displayEntries.length > 0;

  const handleOpenMenu = (entry: StepLogEntry, event?: any) => {
    const y = event?.nativeEvent?.pageY || 320;
    const x = event?.nativeEvent?.pageX;
    setPopoverState({
      visible: true,
      entry,
      positionY: y,
      positionX: x,
    });
  };

  const handleClosePopover = () => {
    setPopoverState((prev) => ({ ...prev, visible: false }));
  };

  const handleDelete = (entry: StepLogEntry) => {
    if (onDeleteEntry) {
      onDeleteEntry(entry);
    }
  };

  return (
    <View style={[styles.wrapper, style]}>
      {/* 1. Header: History (left) and View All → (right) */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>History</Text>

        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.btnPressed]}
          onPress={() => setIsModalOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="View all step history"
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={15} color={Colors.steps} />
        </Pressable>
      </View>

      {/* 2. Date Context Sub-header matching sample (e.g. Yesterday, Dec 21, 2024) */}
      <Text style={styles.dateSubtitle}>{formatHistoryDateHeader(dateStr)}</Text>

      {/* 3. Main White Card Container */}
      <View style={styles.cardContainer}>
        {!hasEntries ? (
          <View style={styles.emptyContainer}>
            <EmptyShoesOutlineSvg size={70} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No step records yet</Text>
            <Text style={styles.emptySubtitle}>
              Take a walk or sync with Health Connect to see your session history.
            </Text>
          </View>
        ) : (
          <View style={styles.listArea}>
            {previewEntries.map((entry, index) => {
              const isLast = index === previewEntries.length - 1;

              return (
                <View
                  key={entry.id || `step_row_${index}`}
                  style={[styles.row, !isLast && styles.rowBorderBottom]}
                >
                  {/* Column 1: Steps (Orange Outline) */}
                  <View style={[styles.col, styles.colSteps]}>
                    <View style={styles.iconCell}>
                      <FootstepsOutlineSvg size={20} color="#F97316" />
                    </View>
                    <Text style={styles.valueText} numberOfLines={1}>
                      {entry.steps.toLocaleString()}
                    </Text>
                  </View>

                  {/* Column 2: Time Duration (Green Outline) */}
                  <View style={[styles.col, styles.colTime]}>
                    <View style={styles.iconCell}>
                      <ClockOutlineSvg size={20} color="#22C55E" />
                    </View>
                    <Text style={styles.valueText} numberOfLines={1}>
                      {entry.durationMinutes}m
                    </Text>
                  </View>

                  {/* Column 3: Calories Burned (Red Outline with double-peak cleft) */}
                  <View style={[styles.col, styles.colCalories]}>
                    <View style={styles.iconCell}>
                      <FlameOutlineSvg size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.valueText} numberOfLines={1}>
                      {entry.caloriesBurned}
                    </Text>
                  </View>

                  {/* Column 4: Distance in KM (Blue Outline) */}
                  <View style={[styles.col, styles.colDistance]}>
                    <View style={styles.iconCell}>
                      <LocationPinOutlineSvg size={20} color="#0EA5E9" />
                    </View>
                    <Text style={styles.valueText} numberOfLines={1}>
                      {entry.distanceKm.toFixed(1)}
                    </Text>
                  </View>

                  {/* Column 5: 3-Dots Kebab Menu */}
                  <Pressable
                    style={({ pressed }) => [styles.kebabBtn, pressed && styles.btnPressed]}
                    onPress={(e) => handleOpenMenu(entry, e)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Options for step entry"
                  >
                    <Ionicons name="ellipsis-vertical" size={17} color="#64748B" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Floating 3-Dots Action Popover */}
      <StepEntryActionPopover
        visible={popoverState.visible}
        positionY={popoverState.positionY}
        positionX={popoverState.positionX}
        entry={popoverState.entry}
        onDelete={handleDelete}
        onClose={handleClosePopover}
      />

      {/* Full "View All" Modal */}
      <StepHistoryModal
        visible={isModalOpen}
        dateStr={dateStr}
        entries={displayEntries}
        totalSteps={totalSteps}
        dailyLogs={dailyLogs}
        onClose={() => setIsModalOpen(false)}
        onDeleteEntry={onDeleteEntry ? (entry) => onDeleteEntry(entry) : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: Colors.steps,
  },
  btnPressed: {
    opacity: 0.7,
  },
  dateSubtitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  listArea: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.07)',
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
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15.5,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  kebabBtn: {
    width: 24,
    height: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
