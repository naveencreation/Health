import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { WeightEntryActionPopover } from '@/components/weight/WeightEntryActionPopover';
import { LogWeightModal } from '@/components/modals/LogWeightModal';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export interface WeightHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  deltaKg: number;
  loggedAt?: string;
  note?: string;
}

export interface WeightHistoryScreenProps {
  onBack: () => void;
  onOpenReport?: () => void;
}

const formatTime = (isoString?: string): string => {
  if (!isoString) return '08:00 AM';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '08:00 AM';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  } catch {
    return '08:00 AM';
  }
};

const formatDateGroupHeader = (dateStr: string): string => {
  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const formatted = targetDate.toLocaleDateString('en-US', options);

    if (dateStr === todayStr) {
      return `Today, ${formatted}`;
    }
    if (dateStr === yesterdayStr) {
      return `Yesterday, ${formatted}`;
    }
    return formatted;
  } catch {
    return dateStr;
  }
};

// Vector SVG Empty Scale Illustration
const EmptyWeightHistoryIllustration: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <View style={styles.emptyContainer}>
    <Svg width={96} height={80} viewBox="0 0 100 85" fill="none">
      <Rect x="16" y="16" width="68" height="58" rx="16" fill="#FFF1EE" />
      <Rect
        x="18"
        y="14"
        width="64"
        height="56"
        rx="14"
        fill="#FFFFFF"
        stroke="#FFDCD2"
        strokeWidth="1.8"
      />
      <Rect x="36" y="22" width="28" height="12" rx="3" fill="#0F172A" />
      <Rect x="42" y="27" width="4" height="2" rx="0.5" fill="#38BDF8" />
      <Circle cx="49" cy="28" r="0.8" fill="#38BDF8" />
      <Rect x="52" y="27" width="4" height="2" rx="0.5" fill="#38BDF8" />
      <Path
        d="M 27 46 C 27 42 33 42 33 46 L 33 56 C 33 58 27 58 27 56 Z"
        fill="#FFF1EE"
      />
      <Path
        d="M 67 46 C 67 42 73 42 73 46 L 73 56 C 73 58 67 58 67 56 Z"
        fill="#FFF1EE"
      />
      <Circle cx="50" cy="18" r="1.5" fill="#FF5722" />
    </Svg>
    <Text style={styles.emptyTitle}>No weight logs found</Text>
    <Text style={styles.emptySubtitle}>Weigh-in logs for previous days will appear here</Text>
    {onAdd && (
      <Pressable
        style={({ pressed }) => [styles.emptyAddBtn, pressed && styles.btnPressed]}
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Log weigh-in"
      >
        <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.emptyAddBtnText}>Log First Weigh-In</Text>
      </Pressable>
    )}
  </View>
);

export const WeightHistoryScreen: React.FC<WeightHistoryScreenProps> = ({
  onBack,
  onOpenReport,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const {
    dailyLogs,
    selectedDate,
    logWeight,
    deleteWeightEntry,
    updateWeightEntry,
  } = useDailyLog();
  const { userGoals } = useGoals();
  const unit = userGoals.weightUnit || 'kg';

  // Convert for display if lbs
  const toDisplay = useCallback(
    (kg: number) => (unit === 'kg' ? kg : Math.round(kg * 2.20462 * 10) / 10),
    [unit]
  );

  // Floating Popover state
  const [activeMenu, setActiveMenu] = useState<{
    entry: WeightHistoryEntry;
    positionY: number;
    positionX?: number;
  } | null>(null);

  // Reversible Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    entry: WeightHistoryEntry;
  } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Add Modal State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<WeightHistoryEntry | null>(null);

  // Compile full sorted timeline of weigh-ins, grouped by date
  const dateGroups = useMemo(() => {
    // 1. Gather all entries into a flat array first to accurately calculate deltas
    const flatEntries: Array<{
      id: string;
      date: string;
      weightKg: number;
      loggedAt?: string;
      note?: string;
    }> = [];

    const dates = Object.keys(dailyLogs).sort((a, b) => b.localeCompare(a));
    for (const dStr of dates) {
      const log = dailyLogs[dStr];
      if (!log) continue;

      if (log.weightEntries && log.weightEntries.length > 0) {
        for (const entry of log.weightEntries) {
          flatEntries.push({
            id: entry.id,
            date: dStr,
            weightKg: entry.weightKg,
            loggedAt: entry.loggedAt,
            note: entry.note,
          });
        }
      } else if (typeof log.weightKg === 'number' && log.weightKg > 0) {
        flatEntries.push({
          id: `weight_${dStr}`,
          date: dStr,
          weightKg: log.weightKg,
          loggedAt: `${dStr}T08:00:00.000Z`,
        });
      }
    }

    // Sort descending by date first, then by intra-day timestamp
    flatEntries.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      const timeA = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
      const timeB = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
      return timeB - timeA;
    });

    // If completely empty, return empty list
    if (flatEntries.length === 0) {
      return [];
    }

    // Attach deltas compared to older adjacent record
    const entriesWithDelta: WeightHistoryEntry[] = flatEntries.map((item, idx) => {
      let delta = 0;
      if (idx < flatEntries.length - 1) {
        const olderW = flatEntries[idx + 1].weightKg;
        delta = Math.round((item.weightKg - olderW) * 10) / 10;
      } else if (userGoals.startWeightKg) {
        delta = Math.round((item.weightKg - userGoals.startWeightKg) * 10) / 10;
      }
      return {
        ...item,
        deltaKg: delta,
      };
    });

    // Group into dates
    const groupMap = new Map<string, WeightHistoryEntry[]>();
    for (const entry of entriesWithDelta) {
      if (!groupMap.has(entry.date)) {
        groupMap.set(entry.date, []);
      }
      groupMap.get(entry.date)!.push(entry);
    }

    return Array.from(groupMap.entries()).map(([dateStr, entries]) => ({
      dateStr,
      headerTitle: formatDateGroupHeader(dateStr),
      entries,
    }));
  }, [dailyLogs, userGoals.startWeightKg]);

  const handleOpenMenu = (entry: WeightHistoryEntry, event: any) => {
    const y = event?.nativeEvent?.pageY || 300;
    const x = event?.nativeEvent?.pageX;
    setActiveMenu({ entry, positionY: y, positionX: x });
  };

  const handleDelete = () => {
    if (!activeMenu) return;
    const { entry } = activeMenu;
    deleteWeightEntry(entry.id, entry.date);
    setActiveMenu(null);

    // Show floating Undo snackbar for 4.5 seconds
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setUndoToast({ entry });
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 4500);
  };

  const handleUndoDelete = () => {
    if (!undoToast) return;
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    logWeight(undoToast.entry.weightKg, undoToast.entry.date, undoToast.entry.note);
    setUndoToast(null);
  };

  const handleStartEdit = () => {
    if (!activeMenu) return;
    setEditingEntry(activeMenu.entry);
    setActiveMenu(null);
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* 1. Header Bar */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [
              styles.navCircleBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Back to Weight Tracker"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.iconNavy} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Weight History
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            {onOpenReport && (
              <Pressable
                style={({ pressed }) => [
                  styles.navCircleBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onOpenReport}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel="View Weight Report"
              >
                <Ionicons name="stats-chart-outline" size={19} color={Colors.iconNavy} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.navAddBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setIsAddModalVisible(true)}
              hitSlop={HIT_SLOP_10}
              accessibilityRole="button"
              accessibilityLabel="Log weigh-in"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2. Scrollable Grouped History Feed */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {dateGroups.length === 0 ? (
          <EmptyWeightHistoryIllustration onAdd={() => setIsAddModalVisible(true)} />
        ) : (
          dateGroups.map((group) => (
            <View key={`group_${group.dateStr}`} style={styles.groupSection}>
              {/* Date Group Header */}
              <Text style={styles.groupHeaderTitle}>{group.headerTitle}</Text>

              {/* Date Group Card */}
              <View style={styles.groupCard}>
                {group.entries.map((entry, idx) => {
                  const isFirst = idx === 0;
                  const displayWeight = toDisplay(entry.weightKg).toFixed(1);
                  const displayDelta = toDisplay(Math.abs(entry.deltaKg)).toFixed(1);
                  const isLoss = entry.deltaKg < 0;
                  const isGain = entry.deltaKg > 0;
                  const timeString = formatTime(entry.loggedAt);

                  return (
                    <View
                      key={entry.id || `entry_${group.dateStr}_${idx}`}
                      style={[styles.entryRow, !isFirst && styles.rowBorderTop]}
                    >
                      {/* Left Scale Icon */}
                      <View style={styles.scaleIconBox}>
                        <MaterialCommunityIcons name="scale-bathroom" size={22} color="#FF5722" />
                      </View>

                      {/* Weight, Time & Note */}
                      <View style={styles.infoCol}>
                        <View style={styles.weightRow}>
                          <Text style={styles.weightText}>
                            {displayWeight} {unit}
                          </Text>
                          <Text style={styles.timeText}>• {timeString}</Text>
                        </View>
                        {entry.note ? (
                          <View style={styles.tagPill}>
                            <Text style={styles.tagPillText} numberOfLines={1}>
                              {entry.note}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Delta Indicator */}
                      <View style={styles.deltaBadge}>
                        <View
                          style={[
                            styles.deltaIconCircle,
                            isGain && styles.deltaIconCircleGain,
                          ]}
                        >
                          <Ionicons
                            name={isGain ? 'chevron-up' : 'chevron-down'}
                            size={11}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text
                          style={[
                            styles.deltaText,
                            isGain && styles.deltaTextGain,
                          ]}
                        >
                          {isLoss ? `- ${displayDelta} ${unit}` : isGain ? `+ ${displayDelta} ${unit}` : `- 0.0 ${unit}`}
                        </Text>
                      </View>

                      {/* 3-Dots Action Menu Trigger */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.menuTriggerBtn,
                          pressed && styles.btnPressed,
                        ]}
                        onPress={(e) => handleOpenMenu(entry, e)}
                        hitSlop={HIT_SLOP_10}
                        accessibilityRole="button"
                        accessibilityLabel={`Options for ${entry.weightKg} ${unit} entry`}
                      >
                        <Ionicons name="ellipsis-vertical" size={17} color="#64748B" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 3. Floating Action Popover Menu */}
      <WeightEntryActionPopover
        visible={!!activeMenu}
        positionY={activeMenu?.positionY || 300}
        positionX={activeMenu?.positionX}
        onEdit={handleStartEdit}
        onDelete={handleDelete}
        onClose={() => setActiveMenu(null)}
      />

      {/* 4. Edit Weigh-In Modal */}
      {editingEntry && (
        <LogWeightModal
          visible={!!editingEntry}
          initialWeight={editingEntry.weightKg}
          initialNote={editingEntry.note}
          targetDate={editingEntry.date}
          targetEntryId={editingEntry.id}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* 5. Add New Weigh-In Modal */}
      {isAddModalVisible && (
        <LogWeightModal
          visible={true}
          onClose={() => setIsAddModalVisible(false)}
        />
      )}

      {/* 5. Floating Undo Toast */}
      {undoToast && (
        <View style={[styles.undoToastWrapper, { bottom: insets.bottom + 16, pointerEvents: 'box-none' as any }]}>
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(180)}
            style={styles.undoToastCard}
          >
            <View style={styles.undoToastInfo}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.undoToastText} numberOfLines={1}>
                Deleted {toDisplay(undoToast.entry.weightKg).toFixed(1)} {unit} entry
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.undoBtn, pressed && styles.btnPressed]}
              onPress={handleUndoDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Undo weight deletion"
            >
              <Ionicons name="arrow-undo" size={13} color="#38BDF8" />
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1.5,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.weight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.weight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupHeaderTitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#94A3B8',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  scaleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#FFF1EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  weightText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15.5,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  timeText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  tagPillText: {
    fontSize: 11,
    fontFamily: Fonts.poppins.medium,
    color: '#475569',
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  deltaIconCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaIconCircleGain: {
    backgroundColor: '#F43F5E',
  },
  deltaText: {
    fontSize: 12.5,
    fontFamily: Fonts.poppins.semiBold,
    color: '#10B981',
  },
  deltaTextGain: {
    color: '#F43F5E',
  },
  menuTriggerBtn: {
    padding: 6,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.weight,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginTop: 18,
    shadowColor: Colors.weight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyAddBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  undoToastWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 999,
  },
  undoToastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  undoToastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  undoToastText: {
    fontSize: 13,
    fontFamily: Fonts.poppins.medium,
    color: '#FFFFFF',
    flex: 1,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  },
  undoBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.poppins.semiBold,
    color: '#38BDF8',
  },
});
