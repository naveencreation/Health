import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { useAnalytics } from '@/context/HealthContext';
import { WorkoutActivity } from '@/types';

interface WorkoutEntry extends WorkoutActivity {
  date: string;
  dayLabel: string;
}

interface WorkoutHistoryCardProps {
  timeRange: '7d' | '30d';
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getTodayString = (): string => getDateString(new Date());

const formatDuration = (mins: number): string => {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
};

interface ActivityStyleConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
}

const getActivityConfig = (name: string): ActivityStyleConfig => {
  const lower = name.toLowerCase();
  if (lower.includes('walk') || lower.includes('stroll')) {
    return {
      icon: 'walk-outline',
      color: '#16A34A',
      bgColor: '#F0FDF4',
      borderColor: '#DCFCE7',
    };
  }
  if (lower.includes('run') || lower.includes('jog') || lower.includes('treadmill') || lower.includes('sprint')) {
    return {
      icon: 'flame-outline',
      color: '#F47551',
      bgColor: '#FFF1EE',
      borderColor: '#FFE4DE',
    };
  }
  if (lower.includes('cycl') || lower.includes('bike') || lower.includes('spin')) {
    return {
      icon: 'bicycle-outline',
      color: '#0284C7',
      bgColor: '#F0F9FF',
      borderColor: '#E0F2FE',
    };
  }
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('pilates')) {
    return {
      icon: 'body-outline',
      color: '#0D9488',
      bgColor: '#F0FDFA',
      borderColor: '#CCFBF1',
    };
  }
  if (lower.includes('gym') || lower.includes('weight') || lower.includes('lift') || lower.includes('strength') || lower.includes('barbell')) {
    return {
      icon: 'barbell-outline',
      color: '#EA580C',
      bgColor: '#FFF7ED',
      borderColor: '#FFEDD5',
    };
  }
  if (lower.includes('swim')) {
    return {
      icon: 'water-outline',
      color: '#0284C7',
      bgColor: '#F0F9FF',
      borderColor: '#E0F2FE',
    };
  }
  if (
    lower.includes('badminton') ||
    lower.includes('tennis') ||
    lower.includes('football') ||
    lower.includes('soccer') ||
    lower.includes('basketball') ||
    lower.includes('cricket') ||
    lower.includes('sport')
  ) {
    return {
      icon: 'trophy-outline',
      color: '#D97706',
      bgColor: '#FEFCE8',
      borderColor: '#FEF08A',
    };
  }
  return {
    icon: 'fitness-outline',
    color: '#F47551',
    bgColor: '#FFF1EE',
    borderColor: '#FFE4DE',
  };
};

interface WorkoutRowProps {
  item: WorkoutEntry;
  isLast: boolean;
}

const WorkoutRow = React.memo<WorkoutRowProps>(({ item, isLast }) => {
  const config = getActivityConfig(item.name);

  return (
    <View style={[rowStyles.row, !isLast && rowStyles.rowBorder]}>
      {/* Contextual Activity Icon Badge */}
      <View style={[rowStyles.iconWrap, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
      </View>

      {/* Main Info: Activity Name + Day & Time metadata */}
      <View style={rowStyles.info}>
        <Text style={rowStyles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={rowStyles.meta} numberOfLines={1}>
          <Text style={rowStyles.metaDay}>{item.dayLabel}</Text> · {item.durationMinutes} min
        </Text>
      </View>

      {/* Burned Metric */}
      <View style={rowStyles.burnBox}>
        <Text style={rowStyles.burnValue} numberOfLines={1}>
          {item.caloriesBurned}
        </Text>
        <Text style={rowStyles.burnUnit}>kcal</Text>
      </View>
    </View>
  );
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  metaDay: {
    fontFamily: Fonts.poppins.medium,
    color: '#334155',
  },
  burnBox: {
    alignItems: 'flex-end',
  },
  burnValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  burnUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#94A3B8',
  },
});

const WorkoutHistoryCardComponent: React.FC<WorkoutHistoryCardProps> = ({
  timeRange,
}) => {
  const { dailyLogs } = useAnalytics();
  const days = timeRange === '7d' ? 7 : 30;
  const todayStr = getTodayString();
  const [isExpanded, setIsExpanded] = useState(false);

  const { entries, totalBurn, totalDuration, sessionCount, activeDaysCount } = useMemo(() => {
    const result: WorkoutEntry[] = [];
    let burn = 0;
    let duration = 0;
    const activeDaysSet = new Set<string>();
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getDateString(d);
      const log = dailyLogs[dateStr];
      if (!log || !Array.isArray(log.activities) || log.activities.length === 0) continue;
      const dayLabel = dateStr === todayStr ? 'Today' : DAY_LABELS[d.getDay()];
      activeDaysSet.add(dateStr);
      for (const act of log.activities) {
        result.push({ ...act, date: dateStr, dayLabel });
        burn += act.caloriesBurned || 0;
        duration += act.durationMinutes || 0;
      }
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return {
      entries: result,
      totalBurn: burn,
      totalDuration: duration,
      sessionCount: result.length,
      activeDaysCount: activeDaysSet.size,
    };
  }, [dailyLogs, days, todayStr]);

  const hasWorkouts = sessionCount > 0;
  const displayedEntries = isExpanded ? entries : entries.slice(0, 4);

  return (
    <View style={styles.card}>
      {/* 1. Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="flame" size={16} color="#F47551" />
          </View>
          <View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Workout History
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {timeRange === '7d' ? 'Last 7 days' : 'Last 30 days'} · active burn
            </Text>
          </View>
        </View>
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionBadgeText}>
            {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* 2. 3 Impactful Habit Metric Pods */}
      {hasWorkouts ? (
        <View style={styles.statsRow}>
          {/* Total Burn */}
          <View style={styles.statBox}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue} numberOfLines={1}>
                {totalBurn.toLocaleString()}
              </Text>
              <Text style={styles.statUnit}>kcal</Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={1}>
              burned
            </Text>
          </View>

          <View style={styles.statDivider} />

          {/* Active Duration */}
          <View style={styles.statBox}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue} numberOfLines={1}>
                {formatDuration(totalDuration)}
              </Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={1}>
              active time
            </Text>
          </View>

          <View style={styles.statDivider} />

          {/* Consistency */}
          <View style={styles.statBox}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue} numberOfLines={1}>
                {activeDaysCount}
              </Text>
              <Text style={styles.statUnit}>/{days}d</Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={1}>
              active days
            </Text>
          </View>
        </View>
      ) : null}

      {/* 3. Activity Rows with Dynamic Iconography */}
      {hasWorkouts ? (
        <View style={styles.listContainer}>
          {displayedEntries.map((item, index) => (
            <WorkoutRow
              key={item.id}
              item={item}
              isLast={index === displayedEntries.length - 1}
            />
          ))}

          {/* Progressive Disclosure Expand / Collapse Button */}
          {entries.length > 4 ? (
            <Pressable
              style={({ pressed }) => [
                styles.expandToggleBtn,
                pressed ? styles.btnPressed : null,
              ]}
              onPress={() => setIsExpanded((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? 'Show fewer workouts' : `View all ${entries.length} activities`}
            >
              <Text style={styles.expandToggleText}>
                {isExpanded
                  ? 'Show fewer'
                  : `View all ${entries.length} activities`}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#F47551"
              />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="fitness-outline" size={24} color="#F47551" />
          </View>
          <Text style={styles.emptyTitle} numberOfLines={1}>
            No workouts logged yet
          </Text>
          <Text style={styles.emptyDesc}>
            Log your walks, runs, gym sessions, and yoga on the Today screen to track your active burn here.
          </Text>
        </View>
      )}
    </View>
  );
};

export const WorkoutHistoryCard = React.memo(WorkoutHistoryCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#FFF1EE',
    borderWidth: 1,
    borderColor: '#FFE4DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  sessionBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#475569',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  statValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  statUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#94A3B8',
  },
  statLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
  listContainer: {
    paddingTop: 2,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 4,
  },
  expandToggleText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#F47551',
  },
  btnPressed: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFF1EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
    color: '#334155',
  },
  emptyDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 260,
  },
});
