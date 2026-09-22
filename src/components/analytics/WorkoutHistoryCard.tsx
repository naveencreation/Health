import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
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

interface WorkoutRowProps {
  item: WorkoutEntry;
}

const WorkoutRow = React.memo<WorkoutRowProps>(({ item }) => (
  <View style={rowStyles.row}>
    <View style={rowStyles.dayBadge}>
      <Text style={rowStyles.dayText} numberOfLines={1}>
        {item.dayLabel}
      </Text>
    </View>
    <View style={rowStyles.iconWrap}>
      <Ionicons name="barbell-outline" size={14} color="#8B5CF6" />
    </View>
    <View style={rowStyles.info}>
      <Text style={rowStyles.name} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={rowStyles.meta} numberOfLines={1}>
        {item.durationMinutes} min
      </Text>
    </View>
    <Text style={rowStyles.burn} numberOfLines={1}>
      {item.caloriesBurned} kcal
    </Text>
  </View>
));

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  dayBadge: {
    width: 36,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#7C3AED',
    letterSpacing: 0.2,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  burn: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#EA580C',
  },
});

const WorkoutHistoryCardComponent: React.FC<WorkoutHistoryCardProps> = ({
  timeRange,
}) => {
  const { dailyLogs } = useHealth();
  const days = timeRange === '7d' ? 7 : 30;
  const todayStr = getTodayString();

  const { entries, totalBurn, totalDuration, sessionCount } = useMemo(() => {
    const result: WorkoutEntry[] = [];
    let burn = 0;
    let duration = 0;
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getDateString(d);
      const log = dailyLogs[dateStr];
      if (!log || !Array.isArray(log.activities)) continue;
      const dayLabel = dateStr === todayStr ? 'Today' : DAY_LABELS[d.getDay()];
      for (const act of log.activities) {
        result.push({ ...act, date: dateStr, dayLabel });
        burn += act.caloriesBurned || 0;
        duration += act.durationMinutes || 0;
      }
    }
    result.sort((a, b) => (a.date < b.date ? 1 : -1));
    return { entries: result, totalBurn: burn, totalDuration: duration, sessionCount: result.length };
  }, [dailyLogs, days, todayStr]);

  const avgDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;
  const hasWorkouts = sessionCount > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="barbell" size={14} color="#8B5CF6" />
          </View>
          <View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Workout History
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {timeRange === '7d' ? 'Last 7 days' : 'Last 30 days'} · logged activities
            </Text>
          </View>
        </View>
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionBadgeText}>
            {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {hasWorkouts ? (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue} numberOfLines={1}>{totalBurn.toLocaleString()}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>kcal burned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue} numberOfLines={1}>{avgDuration}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>avg min / session</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue} numberOfLines={1}>{totalDuration}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>total minutes</Text>
          </View>
        </View>
      ) : null}

      {hasWorkouts ? (
        <View style={styles.listContainer}>
          {entries.slice(0, 8).map((item) => (
            <WorkoutRow key={item.id} item={item} />
          ))}
          {entries.length > 8 ? (
            <Text style={styles.moreLabel} numberOfLines={1}>
              +{entries.length - 8} more sessions this period
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={28} color="#CBD5E1" />
          <Text style={styles.emptyTitle} numberOfLines={1}>
            No workouts logged yet
          </Text>
          <Text style={styles.emptyDesc}>
            Add activities from the Today screen to track your workout history here.
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
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  sessionBadge: {
    backgroundColor: '#F3F0FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sessionBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#7C3AED',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  statValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
    textAlign: 'center',
  },
  listContainer: {
    gap: 0,
  },
  moreLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#CBD5E1',
    marginTop: 4,
  },
  emptyDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 240,
  },
});
