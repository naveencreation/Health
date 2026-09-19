import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
import { Header } from '@/components';

type TimeRange = '7d' | '30d';
type ActiveMetric = 'calories' | 'hydration' | 'movement';

interface WeeklyCluster {
  id: string;
  label: string;
  avgCalories: number;
  avgWaterMl: number;
  avgSteps: number;
  totalBurn: number;
}

interface AnalyticsScreenProps {
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  onSearchPress,
  onNotificationsPress,
  onAvatarPress,
  onSignInPress,
  onSignOutPress,
  scrollRef,
}) => {
  const {
    weeklyLogs,
    userGoals,
    totalCarbs,
    totalProtein,
    totalFat,
    totalFiber,
    dailyLogs,
    selectedDate,
    mealCalories,
  } = useHealth();

  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>('calories');

  // Interactive Selected Bar Indexes
  const [selectedCalIdx, setSelectedCalIdx] = useState<number>(6);
  const [selectedClusterIdx, setSelectedClusterIdx] = useState<number>(3);

  const budget = userGoals.dailyCalorieBudget || 2200;
  const waterGoal = userGoals.waterGoalMl || 2000;
  const stepGoal = userGoals.stepGoal || 10000;
  const targetProtein = userGoals.targetProtein || 90;
  const targetCarbs = userGoals.targetCarbs || 110;
  const targetFat = userGoals.targetFat || 70;
  const targetFiber = userGoals.targetFiber || 30;

  const getDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 30-Day Dataset: 4 Weekly Clusters computed dynamically from actual dailyLogs
  const thirtyDayClusters = useMemo((): WeeklyCluster[] => {
    const parts = (selectedDate || '').split('-');
    const curr = parts.length === 3
      ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      : new Date();

    const clusters: WeeklyCluster[] = [];
    for (let w = 3; w >= 0; w--) {
      let sumCals = 0;
      let sumWater = 0;
      let sumSteps = 0;
      let sumBurn = 0;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date(curr);
        d.setDate(curr.getDate() - (w * 7 + dayOffset));
        const dateStr = getDateString(d);
        const log = dailyLogs[dateStr];
        if (log) {
          const cals = Array.isArray(log.meals) ? log.meals.reduce((sum, m) => sum + m.calories, 0) : 0;
          sumCals += cals;
          sumWater += log.waterMl || 0;
          sumSteps += log.steps || 0;
          const workoutBurn = Array.isArray(log.activities) ? log.activities.reduce((sum, a) => sum + a.caloriesBurned, 0) : 0;
          sumBurn += Math.round((log.steps || 0) * 0.04) + workoutBurn;
        }
      }

      clusters.push({
        id: `w_${4 - w}`,
        label: `Week ${4 - w}`,
        avgCalories: Math.round(sumCals / 7),
        avgWaterMl: Math.round(sumWater / 7),
        avgSteps: Math.round(sumSteps / 7),
        totalBurn: sumBurn,
      });
    }
    return clusters;
  }, [dailyLogs, selectedDate]);

  // Summary Metrics calculated with mathematical & statistical integrity
  const analyticsSummary = useMemo(() => {
    let dataset: { calories: number; waterMl: number; steps: number; burned: number }[] = [];
    let dayCount = 7;

    if (timeRange === '7d') {
      dataset = weeklyLogs;
      dayCount = 7;
    } else {
      dataset = thirtyDayClusters.map((c) => ({
        calories: c.avgCalories,
        waterMl: c.avgWaterMl,
        steps: c.avgSteps,
        burned: Math.round(c.totalBurn / 7),
      }));
      dayCount = 30;
    }

    const totalCals = dataset.reduce((acc, l) => acc + l.calories, 0);
    const totalWater = dataset.reduce((acc, l) => acc + l.waterMl, 0);
    const totalSteps = dataset.reduce((acc, l) => acc + l.steps, 0);
    const totalBurn = dataset.reduce((acc, l) => acc + l.burned, 0);

    const daysWithCals = dataset.filter((l) => l.calories > 0).length;
    const daysWithWater = dataset.filter((l) => l.waterMl > 0).length;
    const daysWithSteps = dataset.filter((l) => l.steps > 0).length;

    const avgCals = daysWithCals > 0 ? Math.round(totalCals / daysWithCals) : 0;
    const avgWater = daysWithWater > 0 ? Math.round(totalWater / daysWithWater) : 0;
    const avgSteps = daysWithSteps > 0 ? Math.round(totalSteps / daysWithSteps) : 0;

    // Scientifically honest energetic balance: (Budget * logged days + Active Burn) - Consumed
    const effectiveBudget = (budget * (daysWithCals > 0 ? daysWithCals : 1)) + totalBurn;
    const netBalance = effectiveBudget - totalCals;
    const isDeficit = netBalance >= 0;
    const netDiff = Math.abs(netBalance);

    // Only project weekly fat loss if at least 3 days are logged in window
    const hasSufficientTrendData = daysWithCals >= 3;
    const projectedFatLoss = hasSufficientTrendData ? (netDiff / 7700).toFixed(2) : null;

    const budgetMetDays = dataset.filter((l) => l.calories > 0 && l.calories <= budget).length;
    const waterMetDays = dataset.filter((l) => l.waterMl >= waterGoal).length;
    const stepMetDays = dataset.filter((l) => l.steps >= stepGoal).length;

    const comparisonText = daysWithCals === 0
      ? 'Start logging meals to unlock personalized health trends!'
      : daysWithCals < 3
      ? `${daysWithCals} of ${dayCount} days logged • Track 3+ days for weekly fat loss trajectory`
      : budgetMetDays === daysWithCals
      ? `${budgetMetDays} of ${daysWithCals} logged days on budget — excellent adherence!`
      : `${budgetMetDays} of ${daysWithCals} logged days within your budget`;

    return {
      avgCals,
      avgWater,
      avgSteps,
      totalWaterL: (totalWater / 1000).toFixed(1),
      totalDistanceKm: ((totalSteps * 0.75) / 1000).toFixed(1),
      totalBurn,
      isDeficit,
      netDiff,
      hasSufficientTrendData,
      projectedFatLoss,
      daysWithCals,
      dayCount,
      adherenceText: `${budgetMetDays} of ${dayCount} Days`,
      waterAdherenceText: `${waterMetDays} of ${dayCount} Days`,
      stepAdherenceText: `${stepMetDays} of ${dayCount} Days`,
      comparisonText,
    };
  }, [timeRange, weeklyLogs, thirtyDayClusters, budget, waterGoal, stepGoal]);

  // Selected Inspect Item Helpers
  const activeItem = useMemo(() => {
    if (timeRange === '7d') return weeklyLogs[selectedCalIdx] || weeklyLogs[weeklyLogs.length - 1];
    return null;
  }, [timeRange, selectedCalIdx, weeklyLogs]);

  const activeCluster = useMemo(() => {
    return thirtyDayClusters[selectedClusterIdx] || thirtyDayClusters[thirtyDayClusters.length - 1];
  }, [selectedClusterIdx, thirtyDayClusters]);

  const getItemLabel = (item: any): string => {
    if (!item) return '';
    return item.dayName ? item.dayName : `Day ${item.label}`;
  };

  // Helper getters for Active Metric (Calories, Hydration, Movement)
  const getMetricValue = (item: any): number => {
    if (!item) return 0;
    if (activeMetric === 'calories') return item.calories ?? item.avgCalories ?? 0;
    if (activeMetric === 'hydration') return item.waterMl ?? item.avgWaterMl ?? 0;
    if (activeMetric === 'movement') return item.steps ?? item.avgSteps ?? 0;
    return 0;
  };

  const getMetricGoal = (): number => {
    if (activeMetric === 'calories') return budget;
    if (activeMetric === 'hydration') return waterGoal;
    if (activeMetric === 'movement') return stepGoal;
    return 2000;
  };

  const getMetricTopLabel = (val: number): string => {
    if (val <= 0) return '';
    if (activeMetric === 'calories') return `${val}`;
    if (activeMetric === 'hydration') return `${(val / 1000).toFixed(1)}L`;
    if (activeMetric === 'movement') return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;
    return `${val}`;
  };

  // Unified Hero Telemetry Display (Apple Health / WHOOP Model)
  const heroDisplay = useMemo(() => {
    if (timeRange === '7d') {
      const item = activeItem || weeklyLogs[weeklyLogs.length - 1];
      const val = getMetricValue(item);
      const isToday = selectedCalIdx === weeklyLogs.length - 1;
      const dayLabel = isToday ? 'Today' : item?.dayName || 'Day';

      if (activeMetric === 'calories') {
        const remaining = budget - val;
        let contextText = `${dayLabel} • `;
        if (val === 0) {
          contextText += 'No meals logged yet';
        } else if (remaining >= 0) {
          contextText += `${remaining.toLocaleString()} kcal under budget`;
        } else {
          contextText += `${Math.abs(remaining).toLocaleString()} kcal over budget`;
        }
        return {
          category: 'CALORIE INTAKE',
          value: val.toLocaleString(),
          unit: 'kcal',
          contextText,
          goalText: `${budget.toLocaleString()} kcal goal`,
        };
      }

      if (activeMetric === 'hydration') {
        const remaining = waterGoal - val;
        let contextText = `${dayLabel} • `;
        if (val === 0) {
          contextText += 'No water logged yet';
        } else if (remaining <= 0) {
          contextText += 'Daily goal achieved!';
        } else {
          contextText += `${remaining.toLocaleString()} ml remaining`;
        }
        return {
          category: 'HYDRATION',
          value: val.toLocaleString(),
          unit: 'ml',
          contextText,
          goalText: `${(waterGoal / 1000).toFixed(1)}L goal`,
        };
      }

      // Movement
      const burned = item?.burned || Math.round(val * 0.04);
      let contextText = `${dayLabel} • `;
      if (val === 0) {
        contextText += 'No movement logged yet';
      } else {
        contextText += `+${burned.toLocaleString()} kcal active burn`;
      }
      return {
        category: 'DAILY MOVEMENT',
        value: val.toLocaleString(),
        unit: 'steps',
        contextText,
        goalText: `${stepGoal.toLocaleString()} steps goal`,
      };
    } else {
      // 30-Day Cluster
      const cluster = activeCluster || thirtyDayClusters[thirtyDayClusters.length - 1];
      const val = getMetricValue(cluster);

      if (activeMetric === 'calories') {
        return {
          category: '30-DAY INTAKE',
          value: val.toLocaleString(),
          unit: 'kcal/day',
          contextText: `${cluster?.label} • 7-day rolling average`,
          goalText: `${budget.toLocaleString()} kcal goal`,
        };
      }
      if (activeMetric === 'hydration') {
        return {
          category: '30-DAY HYDRATION',
          value: (val / 1000).toFixed(1),
          unit: 'L/day',
          contextText: `${cluster?.label} • 7-day rolling average`,
          goalText: `${(waterGoal / 1000).toFixed(1)}L goal`,
        };
      }
      return {
        category: '30-DAY MOVEMENT',
        value: val.toLocaleString(),
        unit: 'steps/day',
        contextText: `${cluster?.label} • 7-day rolling average`,
        goalText: `${(stepGoal / 1000).toFixed(0)}k steps goal`,
      };
    }
  }, [timeRange, activeItem, activeCluster, activeMetric, weeklyLogs, thirtyDayClusters, budget, waterGoal, stepGoal]);

  const getBarColor = (val: number, isSelected: boolean): string => {
    const goal = getMetricGoal();
    if (activeMetric === 'calories') {
      const isOver = val > goal;
      if (isOver) return '#EF4444';
      return isSelected ? '#16A34A' : '#4ADE80';
    }
    if (activeMetric === 'hydration') {
      const isMet = val >= goal;
      if (isMet) return '#2563EB';
      return isSelected ? '#3B82F6' : '#93C5FD';
    }
    if (activeMetric === 'movement') {
      const isMet = val >= goal;
      if (isMet) return '#EA580C';
      return isSelected ? '#F97316' : '#FDBA74';
    }
    return '#16A34A';
  };

  const getMetricThemeColor = (): string => {
    if (activeMetric === 'calories') return '#16A34A';
    if (activeMetric === 'hydration') return '#2563EB';
    if (activeMetric === 'movement') return '#EA580C';
    return '#16A34A';
  };

  // Macro calorie contributions
  const carbCals = totalCarbs * 4;
  const proteinCals = totalProtein * 4;
  const fatCals = totalFat * 9;
  const macroCalTotal = carbCals + proteinCals + fatCals;
  const hasMacros = macroCalTotal > 0;

  const carbPct = hasMacros ? Math.round((carbCals / macroCalTotal) * 100) : 0;
  const proteinPct = hasMacros ? Math.round((proteinCals / macroCalTotal) * 100) : 0;
  const fatPct = hasMacros ? Math.max(0, 100 - carbPct - proteinPct) : 0;

  // Real Meal-Timing Distribution
  const mealTotal = (mealCalories?.breakfast || 0) + (mealCalories?.lunch || 0) + (mealCalories?.snacks || 0) + (mealCalories?.dinner || 0);
  const getSlotPct = (cals: number) => (mealTotal > 0 ? Math.round((cals / mealTotal) * 100) : 0);

  // Latest Day Habit Snapshots for Glance Pods
  const todayWater = weeklyLogs[weeklyLogs.length - 1]?.waterMl || 0;
  const waterPct = Math.min(100, Math.round((todayWater / waterGoal) * 100));
  const todaySteps = weeklyLogs[weeklyLogs.length - 1]?.steps || 0;
  const stepPct = Math.min(100, Math.round((todaySteps / stepGoal) * 100));

  const currentGoal = getMetricGoal();

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 0. Blended Natural-Scroll Header */}
      <Header
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
        onAvatarPress={onAvatarPress}
        onSignInPress={onSignInPress}
        onSignOutPress={onSignOutPress}
      />

      {/* 1. Screen Title & Horizon Switcher */}
      <View style={styles.topSection}>
        <Text style={styles.screenTitle}>Nutrition & Health Trends</Text>
        <Text style={styles.screenSubtitle}>Your weekly nutrition & habit consistency</Text>

        {/* Time-Horizon Segmented Switcher: 7D | 30D */}
        <View style={styles.timeFilterContainer}>
          {(['7d', '30d'] as TimeRange[]).map((r) => {
            const isSelected = timeRange === r;
            const labels: Record<TimeRange, string> = {
              '7d': '7 Days',
              '30d': '30 Days',
            };
            return (
              <Pressable
                key={r}
                style={({ pressed }) => [
                  styles.timeFilterBtn,
                  isSelected ? styles.timeFilterBtnSelected : null,
                  pressed ? styles.pressedSubtle : null,
                ]}
                onPress={() => {
                  setTimeRange(r);
                  if (r === '7d') setSelectedCalIdx(6);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Show ${labels[r]} analytics range`}
              >
                <Text
                  style={[
                    styles.timeFilterBtnText,
                    isSelected ? styles.timeFilterBtnTextSelected : null,
                  ]}
                >
                  {labels[r]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Executive Trajectory Callout Banner */}
      <View style={styles.trajectoryCard}>
        <Ionicons name="trending-up" size={15} color="#15803D" />
        <Text style={styles.trajectoryText}>{analyticsSummary.comparisonText}</Text>
      </View>

      {/* 3. PRIMARY HERO CHART WITH INTERACTIVE METRIC SELECTOR (Apple Health / WHOOP Model) */}
      <View style={styles.heroSection}>
        {/* Interactive Metric Switcher Tabs: Calories | Hydration | Movement */}
        <View style={styles.metricSwitcherRow}>
          <Pressable
            style={({ pressed }) => [
              styles.metricTab,
              activeMetric === 'calories' ? styles.metricTabActiveCalories : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => setActiveMetric('calories')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeMetric === 'calories' }}
            accessibilityLabel="Show Calorie trends"
          >
            <Ionicons
              name="flame"
              size={15}
              color={activeMetric === 'calories' ? '#16A34A' : '#64748B'}
            />
            <Text
              style={[
                styles.metricTabText,
                activeMetric === 'calories' ? styles.metricTabTextActiveCalories : null,
              ]}
            >
              Calories
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.metricTab,
              activeMetric === 'hydration' ? styles.metricTabActiveHydration : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => setActiveMetric('hydration')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeMetric === 'hydration' }}
            accessibilityLabel="Show Hydration trends"
          >
            <Ionicons
              name="water"
              size={15}
              color={activeMetric === 'hydration' ? '#2563EB' : '#64748B'}
            />
            <Text
              style={[
                styles.metricTabText,
                activeMetric === 'hydration' ? styles.metricTabTextActiveHydration : null,
              ]}
            >
              Hydration
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.metricTab,
              activeMetric === 'movement' ? styles.metricTabActiveMovement : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => setActiveMetric('movement')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeMetric === 'movement' }}
            accessibilityLabel="Show Movement trends"
          >
            <Ionicons
              name="footsteps"
              size={15}
              color={activeMetric === 'movement' ? '#EA580C' : '#64748B'}
            />
            <Text
              style={[
                styles.metricTabText,
                activeMetric === 'movement' ? styles.metricTabTextActiveMovement : null,
              ]}
            >
              Movement
            </Text>
          </Pressable>
        </View>

        {/* Dynamic Hero Telemetry Display (Apple Health / WHOOP Model) */}
        <View style={styles.heroTelemetryBox}>
          <View style={styles.heroTelemetryTopRow}>
            <Text style={styles.heroCategoryText}>{heroDisplay.category}</Text>
            <View style={styles.heroGoalBadge}>
              <View style={[styles.heroGoalDot, { backgroundColor: getMetricThemeColor() }]} />
              <Text style={styles.heroGoalText}>{heroDisplay.goalText}</Text>
            </View>
          </View>

          <View style={styles.heroMainValueRow}>
            <Text style={styles.heroMainValue}>{heroDisplay.value}</Text>
            <Text style={styles.heroUnit}>{heroDisplay.unit}</Text>
          </View>

          <Text style={styles.heroContextText}>{heroDisplay.contextText}</Text>
        </View>

        {/* Chart View with Dynamic Horizontal Goal Benchmark Line */}
        <View style={styles.chartWrapper}>
          {/* Subtle Horizontal Dashed Goal Benchmark Line */}
          <View style={styles.benchmarkLineContainer}>
            <View style={[styles.benchmarkDashedLine, { borderColor: `${getMetricThemeColor()}35` }]} />
          </View>

          {/* 7-Day Chart */}
          {timeRange === '7d' ? (
            <View style={styles.chartContainer}>
              {weeklyLogs.map((item, index) => {
                const isSelected = selectedCalIdx === index;
                const val = getMetricValue(item);
                const hasData = val > 0;
                const heightPct = hasData
                  ? Math.min(100, Math.round((val / (currentGoal * 1.25)) * 100))
                  : 0;

                return (
                  <Pressable
                    key={item.date}
                    style={styles.barCol}
                    onPress={() => setSelectedCalIdx(index)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${item.dayName}: ${val} ${heroDisplay.unit}`}
                  >
                    <Text style={[styles.barTopText, isSelected ? styles.barTopTextActive : null]}>
                      {getMetricTopLabel(val)}
                    </Text>
                    <View
                      style={[
                        styles.barTrack,
                        !hasData ? styles.barTrackEmpty : null,
                        isSelected
                          ? {
                              borderColor: getMetricThemeColor(),
                              borderWidth: 1.5,
                              shadowColor: getMetricThemeColor(),
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.25,
                              shadowRadius: 5,
                              elevation: 3,
                            }
                          : null,
                      ]}
                    >
                      {hasData ? (
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${Math.max(10, heightPct)}%`,
                              backgroundColor: getBarColor(val, isSelected),
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <Text style={[styles.barBottomText, isSelected ? styles.barDayActive : null]}>
                      {index === weeklyLogs.length - 1 ? 'Today' : item.dayName}
                    </Text>
                    {isSelected ? (
                      <View style={[styles.activeDayDot, { backgroundColor: getMetricThemeColor() }]} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* 30-Day Cluster Chart */}
          {timeRange === '30d' ? (
            <View style={styles.chartContainer}>
              {thirtyDayClusters.map((cluster, index) => {
                const isSelected = selectedClusterIdx === index;
                const val = getMetricValue(cluster);
                const hasData = val > 0;
                const heightPct = hasData
                  ? Math.min(100, Math.round((val / (currentGoal * 1.25)) * 100))
                  : 0;

                return (
                  <Pressable
                    key={cluster.id}
                    style={styles.barCol30}
                    onPress={() => setSelectedClusterIdx(index)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${cluster.label}: ${val} ${heroDisplay.unit}`}
                  >
                    <Text style={[styles.barTopText, isSelected ? styles.barTopTextActive : null]}>
                      {getMetricTopLabel(val)}
                    </Text>
                    <View
                      style={[
                        styles.barTrack30,
                        !hasData ? styles.barTrackEmpty : null,
                        isSelected
                          ? {
                              borderColor: getMetricThemeColor(),
                              borderWidth: 1.5,
                              shadowColor: getMetricThemeColor(),
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.25,
                              shadowRadius: 5,
                              elevation: 3,
                            }
                          : null,
                      ]}
                    >
                      {hasData ? (
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${Math.max(10, heightPct)}%`,
                              backgroundColor: getBarColor(val, isSelected),
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <Text style={[styles.barBottomText30, isSelected ? styles.barDayActive : null]}>
                      {cluster.label}
                    </Text>
                    {isSelected ? (
                      <View style={[styles.activeDayDot, { backgroundColor: getMetricThemeColor() }]} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Dynamic Context-Aware KPIs for Active Metric */}
        {activeMetric === 'calories' ? (
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
                {analyticsSummary.hasSufficientTrendData
                  ? `${analyticsSummary.netDiff.toLocaleString()}`
                  : `${Math.max(0, budget - (weeklyLogs[weeklyLogs.length - 1]?.calories || 0)).toLocaleString()}`}
              </Text>
              <Text style={styles.kpiLabel}>
                {analyticsSummary.hasSufficientTrendData
                  ? (analyticsSummary.isDeficit ? 'Weekly Deficit (kcal)' : 'Weekly Surplus (kcal)')
                  : 'Remaining Today (kcal)'}
              </Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
                +{analyticsSummary.totalBurn.toLocaleString()}
              </Text>
              <Text style={styles.kpiLabel}>Active Burn (kcal)</Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={styles.kpiValue}>
                {analyticsSummary.hasSufficientTrendData
                  ? `~${analyticsSummary.projectedFatLoss} kg`
                  : `${analyticsSummary.daysWithCals} of ${analyticsSummary.dayCount}`}
              </Text>
              <Text style={styles.kpiLabel}>
                {analyticsSummary.hasSufficientTrendData ? 'Est. Fat Loss' : 'Logged Days'}
              </Text>
            </View>
          </View>
        ) : null}

        {activeMetric === 'hydration' ? (
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#2563EB' }]}>
                {analyticsSummary.avgWater.toLocaleString()} ml
              </Text>
              <Text style={styles.kpiLabel}>Daily Average</Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#2563EB' }]}>
                {analyticsSummary.totalWaterL} L
              </Text>
              <Text style={styles.kpiLabel}>Total Volume</Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#2563EB' }]}>
                {analyticsSummary.waterAdherenceText}
              </Text>
              <Text style={styles.kpiLabel}>Goal Consistency</Text>
            </View>
          </View>
        ) : null}

        {activeMetric === 'movement' ? (
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#EA580C' }]}>
                {analyticsSummary.avgSteps.toLocaleString()}
              </Text>
              <Text style={styles.kpiLabel}>Daily Avg Steps</Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#EA580C' }]}>
                {analyticsSummary.totalDistanceKm} km
              </Text>
              <Text style={styles.kpiLabel}>Total Distance</Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#EA580C' }]}>
                +{analyticsSummary.totalBurn.toLocaleString()} kcal
              </Text>
              <Text style={styles.kpiLabel}>Active Energy Burn</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* 4. VITALITY HABIT GLANCE ROW (Tap either to switch the main graph instantly) */}
      <View style={styles.dualPodRow}>
        {/* Hydration Glance Card */}
        <Pressable
          style={({ pressed }) => [
            styles.habitPod,
            activeMetric === 'hydration' ? styles.habitPodActiveHydration : null,
            pressed ? styles.pressedSubtle : null,
          ]}
          onPress={() => setActiveMetric('hydration')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeMetric === 'hydration' }}
          accessibilityLabel={`Hydration glance: ${todayWater > 0 ? todayWater : 0} ml of ${waterGoal} ml goal`}
        >
          <View style={styles.habitHeader}>
            <View style={[styles.habitIconCircle, styles.habitIconCircleHydration]}>
              <Ionicons name="water" size={16} color="#2563EB" />
            </View>
            <Text style={[styles.habitTitle, styles.habitTitleHydration]}>HYDRATION</Text>
          </View>

          <Text style={styles.habitMainVal}>
            {todayWater > 0 ? `${todayWater.toLocaleString()} ml` : '0 ml'}
          </Text>
          <Text style={styles.habitGoalSub}>Goal: {waterGoal} ml</Text>

          {/* Micro Progress Bar */}
          <View style={styles.habitTrack}>
            <View style={[styles.habitFill, styles.habitFillHydration, { width: `${waterPct}%` }]} />
          </View>

          <View style={styles.habitFooterRow}>
            <Text style={styles.habitFooterText}>
              Avg: {(analyticsSummary.avgWater / 1000).toFixed(1)}L/day
            </Text>
            <Text style={styles.habitFooterHighlight}>{waterPct}%</Text>
          </View>
        </Pressable>

        {/* Movement Glance Card */}
        <Pressable
          style={({ pressed }) => [
            styles.habitPod,
            activeMetric === 'movement' ? styles.habitPodActiveMovement : null,
            pressed ? styles.pressedSubtle : null,
          ]}
          onPress={() => setActiveMetric('movement')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeMetric === 'movement' }}
          accessibilityLabel={`Movement glance: ${todaySteps > 0 ? todaySteps : 0} of ${stepGoal} steps goal`}
        >
          <View style={styles.habitHeader}>
            <View style={[styles.habitIconCircle, styles.habitIconCircleMovement]}>
              <Ionicons name="footsteps" size={16} color="#EA580C" />
            </View>
            <Text style={[styles.habitTitle, styles.habitTitleMovement]}>MOVEMENT</Text>
          </View>

          <Text style={styles.habitMainVal}>
            {todaySteps > 0 ? todaySteps.toLocaleString() : '0'}
          </Text>
          <Text style={styles.habitGoalSub}>Goal: {stepGoal.toLocaleString()} steps</Text>

          {/* Micro Progress Bar */}
          <View style={styles.habitTrack}>
            <View style={[styles.habitFill, styles.habitFillMovement, { width: `${stepPct}%` }]} />
          </View>

          <View style={styles.habitFooterRow}>
            <Text style={styles.habitFooterText}>
              Avg: {(analyticsSummary.avgSteps / 1000).toFixed(1)}k/day
            </Text>
            <Text style={[styles.habitFooterHighlight, styles.habitHighlightMovement]}>{stepPct}%</Text>
          </View>
        </Pressable>
      </View>

      {/* 5. MACRONUTRIENT & DIETARY FIBER QUALITY (Blended Section) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Macronutrient & Fiber Quality</Text>
        <Text style={styles.sectionSubtitle}>Nutrient balance vs daily targets</Text>
      </View>

      {/* Proportional Split Bar Card */}
      <View style={styles.splitBarCard}>
        <View style={styles.splitBar}>
          {hasMacros ? (
            <>
              <View style={[styles.splitSegment, styles.splitSegmentCarb, { width: `${carbPct}%` }]} />
              <View style={[styles.splitSegment, styles.splitSegmentProtein, { width: `${proteinPct}%` }]} />
              <View style={[styles.splitSegment, styles.splitSegmentFat, { width: `${fatPct}%` }]} />
            </>
          ) : (
            <View style={[styles.splitSegment, styles.splitSegmentEmpty]} />
          )}
        </View>

        {/* Proportional Split Legend */}
        <View style={styles.splitLegendRow}>
          <Text style={styles.splitLegendText}>
            <Text style={styles.legendCarbText}>● {carbPct}%</Text> Carbs
          </Text>
          <Text style={styles.splitLegendText}>
            <Text style={styles.legendProteinText}>● {proteinPct}%</Text> Protein
          </Text>
          <Text style={styles.splitLegendText}>
            <Text style={styles.legendFatText}>● {fatPct}%</Text> Fat
          </Text>
        </View>
      </View>

      {/* 4 Floating Pastel Macro Pods */}
      <View style={styles.macroGrid}>
        {/* Protein Pod */}
        <View
          style={[styles.macroPod, styles.proteinPod]}
          accessible={true}
          accessibilityLabel={`Protein: ${Math.round(totalProtein)} grams of ${targetProtein} grams goal`}
        >
          <View style={styles.macroPodHeader}>
            <View style={[styles.macroDot, styles.dotProtein]} />
            <Text style={[styles.macroPodLabel, styles.labelProtein]}>PROTEIN</Text>
          </View>
          <Text style={styles.macroPodVal}>{Math.round(totalProtein)}g</Text>
          <View style={[styles.podTrack, styles.trackProtein]}>
            <View
              style={[
                styles.podFill,
                styles.fillProtein,
                {
                  width: `${Math.min(100, Math.round((totalProtein / targetProtein) * 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.macroPodSub}>of {targetProtein}g</Text>
        </View>

        {/* Carbs Pod */}
        <View
          style={[styles.macroPod, styles.carbsPod]}
          accessible={true}
          accessibilityLabel={`Carbohydrates: ${Math.round(totalCarbs)} grams of ${targetCarbs} grams goal`}
        >
          <View style={styles.macroPodHeader}>
            <View style={[styles.macroDot, styles.dotCarbs]} />
            <Text style={[styles.macroPodLabel, styles.labelCarbs]}>CARBS</Text>
          </View>
          <Text style={styles.macroPodVal}>{Math.round(totalCarbs)}g</Text>
          <View style={[styles.podTrack, styles.trackCarbs]}>
            <View
              style={[
                styles.podFill,
                styles.fillCarbs,
                {
                  width: `${Math.min(100, Math.round((totalCarbs / targetCarbs) * 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.macroPodSub}>of {targetCarbs}g</Text>
        </View>

        {/* Fat Pod */}
        <View
          style={[styles.macroPod, styles.fatPod]}
          accessible={true}
          accessibilityLabel={`Fat: ${Math.round(totalFat)} grams of ${targetFat} grams goal`}
        >
          <View style={styles.macroPodHeader}>
            <View style={[styles.macroDot, styles.dotFat]} />
            <Text style={[styles.macroPodLabel, styles.labelFat]}>FAT</Text>
          </View>
          <Text style={styles.macroPodVal}>{Math.round(totalFat)}g</Text>
          <View style={[styles.podTrack, styles.trackFat]}>
            <View
              style={[
                styles.podFill,
                styles.fillFat,
                {
                  width: `${Math.min(100, Math.round((totalFat / targetFat) * 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.macroPodSub}>of {targetFat}g</Text>
        </View>

        {/* Fiber Pod */}
        <View
          style={[styles.macroPod, styles.fiberPod]}
          accessible={true}
          accessibilityLabel={`Fiber: ${Math.round(totalFiber)} grams of ${targetFiber} grams goal`}
        >
          <View style={styles.macroPodHeader}>
            <View style={[styles.macroDot, styles.dotFiber]} />
            <Text style={[styles.macroPodLabel, styles.labelFiber]}>FIBER</Text>
          </View>
          <Text style={styles.macroPodVal}>{Math.round(totalFiber)}g</Text>
          <View style={[styles.podTrack, styles.trackFiber]}>
            <View
              style={[
                styles.podFill,
                styles.fillFiber,
                {
                  width: `${Math.min(100, Math.round((totalFiber / targetFiber) * 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.macroPodSub}>of {targetFiber}g</Text>
        </View>
      </View>

      {/* 6. MEAL-TIMING CALORIE DISTRIBUTION (Blended Section) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Calorie Intake by Meal Slot</Text>
        <Text style={styles.sectionSubtitle}>Chronological energy distribution</Text>
      </View>

      <View style={styles.mealDistRow}>
        <View style={styles.mealDistItem}>
          <Text style={styles.mealDistEmoji}>🍳</Text>
          <Text style={styles.mealDistName}>Breakfast</Text>
          <Text style={styles.mealDistPct}>{getSlotPct(mealCalories?.breakfast || 0)}%</Text>
          <Text style={styles.mealDistCals}>{mealCalories?.breakfast || 0} kcal</Text>
        </View>

        <View style={styles.mealDistItem}>
          <Text style={styles.mealDistEmoji}>🥗</Text>
          <Text style={styles.mealDistName}>Lunch</Text>
          <Text style={styles.mealDistPct}>{getSlotPct(mealCalories?.lunch || 0)}%</Text>
          <Text style={styles.mealDistCals}>{mealCalories?.lunch || 0} kcal</Text>
        </View>

        <View style={styles.mealDistItem}>
          <Text style={styles.mealDistEmoji}>🍵</Text>
          <Text style={styles.mealDistName}>Snacks</Text>
          <Text style={styles.mealDistPct}>{getSlotPct(mealCalories?.snacks || 0)}%</Text>
          <Text style={styles.mealDistCals}>{mealCalories?.snacks || 0} kcal</Text>
        </View>

        <View style={styles.mealDistItem}>
          <Text style={styles.mealDistEmoji}>🍲</Text>
          <Text style={styles.mealDistName}>Dinner</Text>
          <Text style={styles.mealDistPct}>{getSlotPct(mealCalories?.dinner || 0)}%</Text>
          <Text style={styles.mealDistCals}>{mealCalories?.dinner || 0} kcal</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDFAF6',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120, // Full clearance above floating bottom navigation bar
  },
  topSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  screenTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 21,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  timeFilterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 14,
    padding: 3,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  timeFilterBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  timeFilterBtnSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  timeFilterBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  timeFilterBtnTextSelected: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
    fontWeight: '700',
  },
  trajectoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 8,
  },
  trajectoryText: {
    flex: 1,
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#15803D',
    lineHeight: 15,
    fontWeight: '500',
  },
  heroSection: {
    marginBottom: 16,
  },
  metricSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  metricTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 11,
  },
  metricTabActiveCalories: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  metricTabActiveHydration: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricTabActiveMovement: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricTabText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  metricTabTextActiveCalories: {
    fontFamily: Fonts.poppins.bold,
    color: '#16A34A',
    fontWeight: '700',
  },
  metricTabTextActiveHydration: {
    fontFamily: Fonts.poppins.bold,
    color: '#2563EB',
    fontWeight: '700',
  },
  metricTabTextActiveMovement: {
    fontFamily: Fonts.poppins.bold,
    color: '#EA580C',
    fontWeight: '700',
  },
  heroTelemetryBox: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  heroTelemetryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroCategoryText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.8,
  },
  heroGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  heroGoalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroGoalText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#475569',
  },
  heroMainValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroMainValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  heroUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  heroContextText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#475569',
    marginTop: 2,
  },
  activeDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  chartWrapper: {
    position: 'relative',
    height: 142,
    marginBottom: 16,
  },
  benchmarkLineContainer: {
    position: 'absolute',
    top: 28, // Corresponds to ~100% budget mark
    left: 0,
    right: 0,
    zIndex: 1,
  },
  benchmarkDashedLine: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    zIndex: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9.5,
    color: '#94A3B8',
    marginBottom: 4,
  },
  barTopTextActive: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
    fontWeight: '700',
  },
  barTrack: {
    width: 26,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  barTrackEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0,
    elevation: 0,
  },
  barFill: {
    width: '100%',
    borderRadius: 13,
  },
  barBottomText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 6,
  },
  barDayActive: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
    fontWeight: '700',
  },
  barCol30: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  barTrack30: {
    width: 44,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  barBottomText30: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
  },
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  kpiLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  dualPodRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  habitPod: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  habitPodActiveHydration: {
    borderColor: '#93C5FD',
    backgroundColor: '#F0F9FF',
  },
  habitPodActiveMovement: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  habitIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  habitMainVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  habitGoalSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
    marginBottom: 10,
  },
  habitTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  habitFill: {
    height: '100%',
    borderRadius: 3,
  },
  habitFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitFooterText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#64748B',
  },
  habitFooterHighlight: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  splitBarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  splitBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  splitSegment: {
    height: '100%',
  },
  splitLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  splitLegendText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  macroPod: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  proteinPod: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  carbsPod: {
    backgroundColor: '#F0F9FF',
    borderColor: '#E0F2FE',
  },
  fatPod: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  fiberPod: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  macroPodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  macroDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  macroPodLabel: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  macroPodVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  podTrack: {
    height: 3.5,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  podFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroPodSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9,
    color: '#94A3B8',
  },
  mealDistRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealDistItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mealDistEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  mealDistName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#64748B',
  },
  mealDistPct: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  mealDistCals: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  pressedSubtle: {
    opacity: 0.85,
  },
  habitIconCircleHydration: {
    backgroundColor: '#EFF6FF',
  },
  habitTitleHydration: {
    color: '#2563EB',
  },
  habitFillHydration: {
    backgroundColor: '#2563EB',
  },
  habitIconCircleMovement: {
    backgroundColor: '#FFF7ED',
  },
  habitTitleMovement: {
    color: '#EA580C',
  },
  habitFillMovement: {
    backgroundColor: '#EA580C',
  },
  habitHighlightMovement: {
    color: '#EA580C',
  },
  splitSegmentCarb: {
    backgroundColor: '#0284C7',
  },
  splitSegmentProtein: {
    backgroundColor: '#16A34A',
  },
  splitSegmentFat: {
    backgroundColor: '#EA580C',
  },
  splitSegmentEmpty: {
    width: '100%',
    backgroundColor: '#E2E8F0',
  },
  legendCarbText: {
    color: '#0284C7',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  legendProteinText: {
    color: '#16A34A',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  legendFatText: {
    color: '#EA580C',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  dotProtein: {
    backgroundColor: '#16A34A',
  },
  labelProtein: {
    color: '#16A34A',
  },
  trackProtein: {
    backgroundColor: '#DCFCE7',
  },
  fillProtein: {
    backgroundColor: '#16A34A',
  },
  dotCarbs: {
    backgroundColor: '#0284C7',
  },
  labelCarbs: {
    color: '#0284C7',
  },
  trackCarbs: {
    backgroundColor: '#E0F2FE',
  },
  fillCarbs: {
    backgroundColor: '#0284C7',
  },
  dotFat: {
    backgroundColor: '#EA580C',
  },
  labelFat: {
    color: '#EA580C',
  },
  trackFat: {
    backgroundColor: '#FFEDD5',
  },
  fillFat: {
    backgroundColor: '#EA580C',
  },
  dotFiber: {
    backgroundColor: '#059669',
  },
  labelFiber: {
    color: '#059669',
  },
  trackFiber: {
    backgroundColor: '#D1FAE5',
  },
  fillFiber: {
    backgroundColor: '#059669',
  },
});

export const AnalyticsTab = AnalyticsScreen;
