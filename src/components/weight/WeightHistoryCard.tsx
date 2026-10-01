import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Rect, Path, Circle, G } from 'react-native-svg';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { WeightEntryActionPopover } from './WeightEntryActionPopover';

export interface WeightHistoryItem {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  deltaKg: number; // vs previous weigh-in entry
  loggedAt?: string; // ISO string
  note?: string;
}

export interface WeightHistoryCardProps {
  onEditEntry?: (item: WeightHistoryItem) => void;
  onDeleteEntry?: (item: WeightHistoryItem) => void;
  onViewAll?: () => void;
  style?: StyleProp<ViewStyle>;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const formatLogTime = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  } catch {
    return '';
  }
};

// Vector SVG Empty Scale Illustration
const EmptyWeightIllustration: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Svg width={96} height={80} viewBox="0 0 100 85" fill="none">
      {/* Background shadow glow */}
      <Rect x="16" y="16" width="68" height="58" rx="16" fill="#FFF1EE" />
      {/* Bathroom Scale Platform */}
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
      {/* Scale LCD Display Screen */}
      <Rect
        x="36"
        y="22"
        width="28"
        height="12"
        rx="3"
        fill="#0F172A"
      />
      {/* Glowing 0.0 display reading */}
      <Rect x="42" y="27" width="4" height="2" rx="0.5" fill="#38BDF8" />
      <Circle cx="49" cy="28" r="0.8" fill="#38BDF8" />
      <Rect x="52" y="27" width="4" height="2" rx="0.5" fill="#38BDF8" />

      {/* Decorative Footprint/Tread lines */}
      <Path
        d="M 27 46 C 27 42 33 42 33 46 L 33 56 C 33 58 27 58 27 56 Z"
        fill="#FFF1EE"
      />
      <Path
        d="M 67 46 C 67 42 73 42 73 46 L 73 56 C 73 58 67 58 67 56 Z"
        fill="#FFF1EE"
      />
      {/* Accent dot on top center */}
      <Circle cx="50" cy="18" r="1.5" fill="#FF5722" />
    </Svg>
    <Text style={styles.emptyTitle}>No weigh-ins logged yet</Text>
    <Text style={styles.emptySubtitle}>Tap Update above to log your current weight</Text>
  </View>
);

export const WeightHistoryCard: React.FC<WeightHistoryCardProps> = ({
  onEditEntry,
  onDeleteEntry,
  onViewAll,
  style,
}) => {
  const { dailyLogs } = useDailyLog();
  const { userGoals } = useGoals();
  const unit = userGoals.weightUnit || 'kg';

  const [isExpanded, setIsExpanded] = useState(false);

  // Popover state
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ y: 0, x: 0 });
  const [activeItem, setActiveItem] = useState<WeightHistoryItem | null>(null);

  // Convert for display if lbs
  const toDisplay = useCallback(
    (kg: number) => (unit === 'kg' ? kg : Math.round(kg * 2.20462 * 10) / 10),
    [unit]
  );

  // Compile sorted list of all weigh-in records across all dates
  const historyItems = useMemo<WeightHistoryItem[]>(() => {
    const rawItems: Array<{
      id: string;
      date: string;
      weightKg: number;
      loggedAt?: string;
      note?: string;
    }> = [];

    // 1. Gather all logged dates from dailyLogs
    const dates = Object.keys(dailyLogs).sort((a, b) => b.localeCompare(a));

    for (const dStr of dates) {
      const log = dailyLogs[dStr];
      if (!log) continue;

      if (log.weightEntries && log.weightEntries.length > 0) {
        for (const entry of log.weightEntries) {
          rawItems.push({
            id: entry.id,
            date: dStr,
            weightKg: entry.weightKg,
            loggedAt: entry.loggedAt,
            note: entry.note,
          });
        }
      } else if (typeof log.weightKg === 'number' && log.weightKg > 0) {
        rawItems.push({
          id: `weight_${dStr}`,
          date: dStr,
          weightKg: log.weightKg,
          loggedAt: `${dStr}T08:00:00.000Z`,
        });
      }
    }

    // Sort all entries chronologically descending (newest first)
    rawItems.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      const timeA = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
      const timeB = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
      return timeB - timeA;
    });

    if (rawItems.length === 0) {
      return [];
    }

    // Calculate delta against adjacent older record
    return rawItems.map((item, idx) => {
      let delta = 0;
      if (idx < rawItems.length - 1) {
        const olderW = rawItems[idx + 1].weightKg;
        delta = Math.round((item.weightKg - olderW) * 10) / 10;
      } else if (userGoals.startWeightKg) {
        delta = Math.round((item.weightKg - userGoals.startWeightKg) * 10) / 10;
      }

      return {
        ...item,
        deltaKg: delta,
      };
    });
  }, [dailyLogs, userGoals.startWeightKg]);

  // Format date display (e.g. "Today, Oct 1, 2026" or "Dec 20, 2024")
  const formatDateLabel = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const itemDate = new Date(y, m - 1, d);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday = itemDate.getTime() === today.getTime();
    const isYesterday = itemDate.getTime() === yesterday.getTime();

    const monthStr = MONTH_NAMES[itemDate.getMonth()];
    const dayStr = itemDate.getDate();
    const yearStr = itemDate.getFullYear();

    if (isToday) {
      return `Today, ${monthStr} ${dayStr}, ${yearStr}`;
    }
    if (isYesterday) {
      return `Yesterday, ${monthStr} ${dayStr}, ${yearStr}`;
    }
    return `${monthStr} ${dayStr}, ${yearStr}`;
  }, []);

  const handleOpenOptions = (item: WeightHistoryItem, event: GestureResponderEvent) => {
    const { pageY, pageX } = event.nativeEvent;
    setPopoverPos({ y: pageY, x: pageX });
    setActiveItem(item);
    setPopoverVisible(true);
  };

  const handleEdit = () => {
    setPopoverVisible(false);
    if (activeItem) {
      onEditEntry?.(activeItem);
    }
  };

  const handleDelete = () => {
    setPopoverVisible(false);
    if (activeItem) {
      onDeleteEntry?.(activeItem);
    }
  };

  const handleViewAllPress = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      setIsExpanded((prev) => !prev);
    }
  };

  // Preview shows up to 4 items in compact mode
  const displayedList = isExpanded ? historyItems : historyItems.slice(0, 4);
  const hasEntries = historyItems.length > 0;

  return (
    <>
      <View style={[styles.card, style]}>
        {/* Header Row: "History" with count badge & "View All →" */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeftRow}>
            <Text style={styles.headerTitle}>History</Text>
            {hasEntries && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{historyItems.length}</Text>
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.viewAllBtn, pressed && styles.btnPressed]}
            onPress={handleViewAllPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View all history records"
          >
            <Text style={styles.viewAllText}>
              {onViewAll ? 'View All' : isExpanded ? 'Collapse' : 'View All'}
            </Text>
            <Feather
              name={onViewAll ? 'arrow-right' : isExpanded ? 'chevron-up' : 'arrow-right'}
              size={15}
              color="#FF5722"
            />
          </Pressable>
        </View>

        {/* Content: Empty State vs. Chronological List */}
        {!hasEntries ? (
          <EmptyWeightIllustration />
        ) : (
          <View style={styles.listContainer}>
            {displayedList.map((item, index) => {
              const displayWeight = toDisplay(item.weightKg).toFixed(1);
              const displayDelta = toDisplay(Math.abs(item.deltaKg)).toFixed(1);
              const isZero = Math.abs(item.deltaKg) < 0.05;
              const isLoss = !isZero && item.deltaKg < 0;
              const isGain = !isZero && item.deltaKg > 0;
              const isLast = index === displayedList.length - 1;
              const timeString = formatLogTime(item.loggedAt);

              return (
                <View key={item.id + '_' + item.date + '_' + index}>
                  <View style={styles.itemRow}>
                    {/* Left Column: Weight, Date, Time & Optional Tag */}
                    <View style={styles.leftInfoCol}>
                      <View style={styles.weightReadoutRow}>
                        <Text style={styles.itemWeightText}>
                          {displayWeight} {unit}
                        </Text>
                        {timeString ? (
                          <Text style={styles.itemTimeText}>• {timeString}</Text>
                        ) : null}
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.itemDateText}>{formatDateLabel(item.date)}</Text>
                        {item.note ? (
                          <View style={styles.tagPill}>
                            <Text style={styles.tagPillText} numberOfLines={1}>
                              {item.note}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Right Column: Directional Delta Badge & Options Menu */}
                    <View style={styles.rightActionCol}>
                      <View style={styles.deltaBadge}>
                        <View
                          style={[
                            styles.deltaIconCircle,
                            isGain && styles.deltaIconCircleGain,
                            isZero && styles.deltaIconCircleZero,
                          ]}
                        >
                          <Ionicons
                            name={isZero ? 'remove' : isGain ? 'chevron-up' : 'chevron-down'}
                            size={11}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text
                          style={[
                            styles.deltaText,
                            isGain && styles.deltaTextGain,
                            isZero && styles.deltaTextZero,
                          ]}
                        >
                          {isZero ? `0.0 ${unit}` : isLoss ? `- ${displayDelta} ${unit}` : `+ ${displayDelta} ${unit}`}
                        </Text>
                      </View>

                      {/* Three-dots menu button */}
                      <Pressable
                        style={({ pressed }) => [styles.optionsBtn, pressed && styles.btnPressed]}
                        onPress={(e) => handleOpenOptions(item, e)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Options for ${item.date}`}
                      >
                        <Ionicons name="ellipsis-vertical" size={17} color="#64748B" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Hairline Divider between items */}
                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}

            {/* Bottom Overflow Button if items > 4 and collapsed */}
            {historyItems.length > 4 && !isExpanded && (
              <Pressable
                style={({ pressed }) => [styles.moreFooterBtn, pressed && styles.btnPressed]}
                onPress={handleViewAllPress}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`View all ${historyItems.length} records`}
              >
                <Text style={styles.moreFooterText}>
                  +{historyItems.length - 4} more records
                </Text>
                <Feather name="arrow-right" size={13} color="#FF5722" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Action Popover for Edit/Delete */}
      <WeightEntryActionPopover
        visible={popoverVisible}
        positionY={popoverPos.y}
        positionX={popoverPos.x}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClose={() => setPopoverVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FFF1EE', // Soft coral background
  },
  countBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#FF5722',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: Fonts.poppins.semiBold,
    fontWeight: '600',
    color: '#FF5722',
  },
  btnPressed: {
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#334155',
    marginTop: 10,
  },
  emptySubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  listContainer: {
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  leftInfoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  weightReadoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  itemWeightText: {
    fontSize: 16,
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  itemTimeText: {
    fontSize: 12,
    fontFamily: Fonts.poppins.regular,
    color: '#94A3B8',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  itemDateText: {
    fontSize: 12,
    fontFamily: Fonts.poppins.medium,
    color: '#64748B',
  },
  tagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    maxWidth: 130,
  },
  tagPillText: {
    fontSize: 10.5,
    fontFamily: Fonts.poppins.medium,
    color: '#475569',
  },
  rightActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deltaIconCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#10B981', // Emerald 500
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaIconCircleGain: {
    backgroundColor: '#F43F5E', // Rose 500
  },
  deltaIconCircleZero: {
    backgroundColor: '#94A3B8', // Slate 400
  },
  deltaText: {
    fontSize: 13,
    fontFamily: Fonts.poppins.semiBold,
    fontWeight: '600',
    color: '#10B981',
  },
  deltaTextGain: {
    color: '#F43F5E',
  },
  deltaTextZero: {
    color: '#64748B',
  },
  optionsBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  moreFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    gap: 6,
  },
  moreFooterText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
});
