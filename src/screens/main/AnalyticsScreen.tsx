import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

type TimeRange = '7d' | '14d' | '30d';

interface DailyDataPoint {
  id: string;
  label: string;
  calories: number;
  waterMl: number;
  steps: number;
  burned: number;
  isToday?: boolean;
}

interface WeeklyCluster {
  id: string;
  label: string;
  avgCalories: number;
  avgWaterMl: number;
  avgSteps: number;
  totalBurn: number;
}

export const AnalyticsScreen: React.FC = () => {
  const {
    weeklyLogs,
    userGoals,
    totalCarbs,
    totalProtein,
    totalFat,
    totalFiber,
    dailyLogs,
    selectedDate,
  } = useHealth();

  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // Interactive Selected Bar Indexes
  const [selectedCalIdx, setSelectedCalIdx] = useState<number>(6);
  const [selectedWaterIdx, setSelectedWaterIdx] = useState<number>(6);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(6);
  const [selectedClusterIdx, setSelectedClusterIdx] = useState<number>(3); // 30-day week cluster index (0: W1, 1: W2, 2: W3, 3: W4)

  const budget = userGoals.dailyCalorieBudget;
  const waterGoal = userGoals.waterGoalMl || 2000;
  const stepGoal = userGoals.stepGoal || 10000;

  const getDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 14-Day Dataset: dynamically built from actual dailyLogs
  const fourteenDayData = useMemo((): DailyDataPoint[] => {
    const parts = (selectedDate || '').split('-');
    const curr = parts.length === 3
      ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      : new Date();

    const points: DailyDataPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(curr);
      d.setDate(curr.getDate() - i);
      const dateStr = getDateString(d);
      const log = dailyLogs[dateStr];

      const cals = log && Array.isArray(log.meals) ? log.meals.reduce((sum, m) => sum + m.calories, 0) : 0;
      const waterMl = log?.waterMl || 0;
      const steps = log?.steps || 0;
      const workoutBurn = log && Array.isArray(log.activities) ? log.activities.reduce((sum, a) => sum + a.caloriesBurned, 0) : 0;
      const burned = Math.round(steps * 0.04) + workoutBurn;

      points.push({
        id: dateStr,
        label: String(14 - i),
        calories: cals,
        waterMl,
        steps,
        burned,
        isToday: i === 0,
      });
    }
    return points;
  }, [dailyLogs, selectedDate]);

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

  // Summary Metrics calculated honestly on actual tracked data
  const analyticsSummary = useMemo(() => {
    let dataset: { calories: number; waterMl: number; steps: number; burned: number }[] = [];
    let dayCount = 7;

    if (timeRange === '7d') {
      dataset = weeklyLogs;
      dayCount = 7;
    } else if (timeRange === '14d') {
      dataset = fourteenDayData;
      dayCount = 14;
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

    const loggedDays = dataset.filter((l) => l.calories > 0);
    const loggedCount = loggedDays.length;

    const avgCals = loggedCount > 0 ? Math.round(totalCals / loggedCount) : 0;
    const avgWater = loggedCount > 0 ? Math.round(totalWater / loggedCount) : (totalWater > 0 ? Math.round(totalWater / dayCount) : 0);
    const avgSteps = loggedCount > 0 ? Math.round(totalSteps / loggedCount) : (totalSteps > 0 ? Math.round(totalSteps / dayCount) : 0);

    // Deficit only calculated on days meals were actively logged
    const netDeficit = loggedCount > 0 ? Math.max(0, (budget * loggedCount) - totalCals) : 0;
    const projectedFatLoss = (netDeficit / 7700).toFixed(2);
    const budgetMetDays = dataset.filter((l) => l.calories > 0 && l.calories <= budget).length;
    const waterMetDays = dataset.filter((l) => l.waterMl >= waterGoal).length;
    const stepMetDays = dataset.filter((l) => l.steps >= stepGoal).length;

    const comparisonText = loggedCount === 0
      ? 'Start logging meals to unlock personalized health trends!'
      : budgetMetDays === loggedCount
      ? 'Consistent discipline — on track with your calorie targets!'
      : `${budgetMetDays} of ${loggedCount} logged days within your budget`;

    return {
      avgCals,
      avgWater,
      avgSteps,
      totalWaterL: (totalWater / 1000).toFixed(1),
      totalDistanceKm: ((totalSteps * 0.75) / 1000).toFixed(1),
      totalBurn,
      netDeficit,
      projectedFatLoss,
      adherenceText: `${budgetMetDays}/${loggedCount > 0 ? loggedCount : dayCount} Days`,
      waterAdherenceText: `${waterMetDays}/${dayCount} Days`,
      stepAdherenceText: `${stepMetDays}/${dayCount} Days`,
      comparisonText,
    };
  }, [timeRange, weeklyLogs, fourteenDayData, thirtyDayClusters, budget, waterGoal, stepGoal]);

  // Selected Inspect Item Helpers
  const activeCalItem = useMemo(() => {
    if (timeRange === '7d') return weeklyLogs[selectedCalIdx] || weeklyLogs[weeklyLogs.length - 1];
    if (timeRange === '14d') return fourteenDayData[selectedCalIdx] || fourteenDayData[fourteenDayData.length - 1];
    return null;
  }, [timeRange, selectedCalIdx, weeklyLogs, fourteenDayData]);

  const activeWaterItem = useMemo(() => {
    if (timeRange === '7d') return weeklyLogs[selectedWaterIdx] || weeklyLogs[weeklyLogs.length - 1];
    if (timeRange === '14d') return fourteenDayData[selectedWaterIdx] || fourteenDayData[fourteenDayData.length - 1];
    return null;
  }, [timeRange, selectedWaterIdx, weeklyLogs, fourteenDayData]);

  const activeStepItem = useMemo(() => {
    if (timeRange === '7d') return weeklyLogs[selectedStepIdx] || weeklyLogs[weeklyLogs.length - 1];
    if (timeRange === '14d') return fourteenDayData[selectedStepIdx] || fourteenDayData[fourteenDayData.length - 1];
    return null;
  }, [timeRange, selectedStepIdx, weeklyLogs, fourteenDayData]);

  const activeCluster = useMemo(() => {
    return thirtyDayClusters[selectedClusterIdx] || thirtyDayClusters[thirtyDayClusters.length - 1];
  }, [selectedClusterIdx, thirtyDayClusters]);

  const getItemLabel = (item: any): string => {
    if (!item) return '';
    return item.dayName ? item.dayName : `Day ${item.label}`;
  };

  // Macro calorie contributions
  const carbCals = totalCarbs * 4;
  const proteinCals = totalProtein * 4;
  const fatCals = totalFat * 9;
  const macroCalTotal = carbCals + proteinCals + fatCals || 1;

  const carbPct = Math.round((carbCals / macroCalTotal) * 100);
  const proteinPct = Math.round((proteinCals / macroCalTotal) * 100);
  const fatPct = Math.max(0, 100 - carbPct - proteinPct);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition & Health Trends</Text>
        <Text style={styles.headerSubtitle}>Multi-horizon health & habit analysis</Text>

        {/* Time-Horizon Switcher: 7D | 14D | 30D */}
        <View style={styles.timeFilterRow}>
          {(['7d', '14d', '30d'] as TimeRange[]).map((r) => {
            const isSelected = timeRange === r;
            const labels: Record<TimeRange, string> = {
              '7d': '7 Days',
              '14d': '14 Days',
              '30d': '30 Days',
            };
            return (
              <TouchableOpacity
                key={r}
                style={[styles.timeFilterBtn, isSelected && styles.timeFilterBtnSelected]}
                onPress={() => {
                  setTimeRange(r);
                  setSelectedCalIdx(r === '14d' ? 13 : 6);
                  setSelectedWaterIdx(r === '14d' ? 13 : 6);
                  setSelectedStepIdx(r === '14d' ? 13 : 6);
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.timeFilterBtnText,
                    isSelected && styles.timeFilterBtnTextSelected,
                  ]}
                >
                  {labels[r]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Trajectory Callout Banner */}
      <View style={styles.trajectoryBanner}>
        <Ionicons name="trending-up" size={18} color="#EA580C" />
        <Text style={styles.trajectoryText}>{analyticsSummary.comparisonText}</Text>
      </View>

      {/* 1. CALORIE INTAKE & DEFICIT TRENDS */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>
              {timeRange === '7d'
                ? '7-Day Calorie Intake'
                : timeRange === '14d'
                ? '14-Day Intake Trajectory'
                : '30-Day Weekly Intake Average'}
            </Text>
            <Text style={styles.cardSubtitle}>
              Avg: {analyticsSummary.avgCals} kcal/day • Budget: {budget}
            </Text>
          </View>
          <View style={styles.targetLegend}>
            <View style={styles.targetLineDot} />
            <Text style={styles.targetLegendText}>{budget} goal</Text>
          </View>
        </View>

        {/* Interactive Tap-to-Inspect Tooltip Banner */}
        {timeRange !== '30d' && activeCalItem && (
          <View style={styles.inspectPill}>
            <Text style={styles.inspectPillText}>
              📅 {getItemLabel(activeCalItem)}:{' '}
              <Text style={styles.inspectBoldText}>{activeCalItem.calories} kcal</Text>
              {' • '}
              {activeCalItem.calories <= budget ? (
                <Text style={{ color: '#10B981' }}>{budget - activeCalItem.calories} under budget 🎯</Text>
              ) : (
                <Text style={{ color: '#EF4444' }}>{activeCalItem.calories - budget} over budget ⚠️</Text>
              )}
            </Text>
          </View>
        )}

        {timeRange === '30d' && activeCluster && (
          <View style={styles.inspectPill}>
            <Text style={styles.inspectPillText}>
              📊 <Text style={styles.inspectBoldText}>{activeCluster.label}:</Text>{' '}
              {activeCluster.avgCalories} kcal/day avg •{' '}
              {activeCluster.avgCalories <= budget ? (
                <Text style={{ color: '#10B981' }}>{budget - activeCluster.avgCalories} under budget 🎯</Text>
              ) : (
                <Text style={{ color: '#EF4444' }}>{activeCluster.avgCalories - budget} over budget ⚠️</Text>
              )}
            </Text>
          </View>
        )}

        {/* Chart View */}
        {timeRange === '7d' && (
          <View style={styles.chartContainer}>
            {weeklyLogs.map((item, index) => {
              const heightPct = Math.min(100, Math.round((item.calories / (budget * 1.25)) * 100));
              const isSelected = selectedCalIdx === index;
              const isOver = item.calories > budget;
              return (
                <TouchableOpacity
                  key={item.date}
                  style={styles.barCol}
                  onPress={() => setSelectedCalIdx(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.barTopText, isSelected && styles.barTopTextActive]}>
                    {item.calories > 0 ? item.calories : '-'}
                  </Text>
                  <View style={[styles.barTrack, isSelected && styles.barTrackActive]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isOver ? Colors.danger : isSelected ? Colors.primary : '#94A3B8',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText, isSelected && styles.barDayToday]}>
                    {item.dayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {timeRange === '14d' && (
          <View style={styles.chartContainer}>
            {fourteenDayData.map((item, index) => {
              const heightPct = Math.min(100, Math.round((item.calories / (budget * 1.25)) * 100));
              const isSelected = selectedCalIdx === index;
              const isOver = item.calories > budget;
              const showLabel = index % 2 === 0 || item.isToday;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.barCol14}
                  onPress={() => setSelectedCalIdx(index)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.barTrack14, isSelected && styles.barTrackActive]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isOver ? Colors.danger : isSelected ? Colors.primary : '#94A3B8',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText14, isSelected && styles.barDayToday]}>
                    {showLabel ? (item.isToday ? 'Now' : `D${item.label}`) : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {timeRange === '30d' && (
          <View style={styles.chartContainer}>
            {thirtyDayClusters.map((cluster, index) => {
              const heightPct = Math.min(100, Math.round((cluster.avgCalories / (budget * 1.25)) * 100));
              const isSelected = selectedClusterIdx === index;
              const isOver = cluster.avgCalories > budget;
              return (
                <TouchableOpacity
                  key={cluster.id}
                  style={styles.barCol30}
                  onPress={() => setSelectedClusterIdx(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.barTopText, isSelected && styles.barTopTextActive]}>
                    {cluster.avgCalories}
                  </Text>
                  <View style={[styles.barTrack30, isSelected && styles.barTrackActive]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isOver ? Colors.danger : isSelected ? Colors.primary : '#94A3B8',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText30, isSelected && styles.barDayToday]}>
                    {cluster.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Dynamic Energy & Weight Loss KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>-{analyticsSummary.netDeficit.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Net Deficit (kcal)</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>
              ~{analyticsSummary.projectedFatLoss} kg
            </Text>
            <Text style={styles.kpiLabel}>Est. Fat Loss</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{analyticsSummary.adherenceText}</Text>
            <Text style={styles.kpiLabel}>Budget Adherence</Text>
          </View>
        </View>
      </View>

      {/* 2. DEDICATED HYDRATION TRENDS (WATER 💧) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWithIcon}>
            <View style={[styles.iconBadge, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="water" size={16} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.cardTitle}>
                {timeRange === '7d'
                  ? 'Hydration Trends'
                  : timeRange === '14d'
                  ? '14-Day Hydration Trajectory'
                  : '30-Day Weekly Hydration'}
              </Text>
              <Text style={styles.cardSubtitle}>
                Avg: {(analyticsSummary.avgWater / 1000).toFixed(1)} L/day • Goal: {(waterGoal / 1000).toFixed(1)} L
              </Text>
            </View>
          </View>
          <View style={styles.targetLegend}>
            <View style={[styles.targetLineDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.targetLegendText}>{waterGoal} ml</Text>
          </View>
        </View>

        {/* Interactive Tap-to-Inspect Tooltip Banner for Water */}
        {timeRange !== '30d' && activeWaterItem && (
          <View style={[styles.inspectPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Text style={[styles.inspectPillText, { color: '#1D4ED8' }]}>
              💧 {getItemLabel(activeWaterItem)}:{' '}
              <Text style={styles.inspectBoldText}>{activeWaterItem.waterMl.toLocaleString()} ml</Text>
              {' • '}
              {activeWaterItem.waterMl >= waterGoal ? (
                <Text style={{ color: '#10B981' }}>Target Achieved! 🎉</Text>
              ) : (
                <Text style={{ color: '#64748B' }}>{waterGoal - activeWaterItem.waterMl} ml remaining</Text>
              )}
            </Text>
          </View>
        )}

        {timeRange === '30d' && activeCluster && (
          <View style={[styles.inspectPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Text style={[styles.inspectPillText, { color: '#1D4ED8' }]}>
              💧 <Text style={styles.inspectBoldText}>{activeCluster.label}:</Text>{' '}
              {(activeCluster.avgWaterMl / 1000).toFixed(1)} L/day avg •{' '}
              {activeCluster.avgWaterMl >= waterGoal ? (
                <Text style={{ color: '#10B981' }}>Hydration Target Met 🎉</Text>
              ) : (
                <Text style={{ color: '#64748B' }}>{waterGoal - activeCluster.avgWaterMl} ml/day gap</Text>
              )}
            </Text>
          </View>
        )}

        {/* Water Chart View */}
        {timeRange === '7d' && (
          <View style={styles.chartContainer}>
            {weeklyLogs.map((item, index) => {
              const heightPct = Math.min(100, Math.round((item.waterMl / (waterGoal * 1.25)) * 100));
              const isSelected = selectedWaterIdx === index;
              const isMet = item.waterMl >= waterGoal;
              return (
                <TouchableOpacity
                  key={item.date}
                  style={styles.barCol}
                  onPress={() => setSelectedWaterIdx(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.barTopText, isSelected && { color: '#2563EB', fontWeight: '700' }]}>
                    {item.waterMl > 0 ? (item.waterMl / 1000).toFixed(1) + 'L' : '-'}
                  </Text>
                  <View style={[styles.barTrack, isSelected && { borderColor: '#2563EB', borderWidth: 1 }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isMet ? '#2563EB' : isSelected ? '#3B82F6' : '#BFDBFE',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText, isSelected && { color: '#2563EB', fontWeight: '700' }]}>
                    {item.dayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {timeRange === '14d' && (
          <View style={styles.chartContainer}>
            {fourteenDayData.map((item, index) => {
              const heightPct = Math.min(100, Math.round((item.waterMl / (waterGoal * 1.25)) * 100));
              const isSelected = selectedWaterIdx === index;
              const isMet = item.waterMl >= waterGoal;
              const showLabel = index % 2 === 0 || item.isToday;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.barCol14}
                  onPress={() => setSelectedWaterIdx(index)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.barTrack14, isSelected && { borderColor: '#2563EB', borderWidth: 1 }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isMet ? '#2563EB' : isSelected ? '#3B82F6' : '#BFDBFE',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText14, isSelected && { color: '#2563EB', fontWeight: '700' }]}>
                    {showLabel ? (item.isToday ? 'Now' : `D${item.label}`) : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {timeRange === '30d' && (
          <View style={styles.chartContainer}>
            {thirtyDayClusters.map((cluster, index) => {
              const heightPct = Math.min(100, Math.round((cluster.avgWaterMl / (waterGoal * 1.25)) * 100));
              const isSelected = selectedClusterIdx === index;
              return (
                <TouchableOpacity
                  key={cluster.id}
                  style={styles.barCol30}
                  onPress={() => setSelectedClusterIdx(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.barTopText, isSelected && { color: '#2563EB', fontWeight: '700' }]}>
                    {(cluster.avgWaterMl / 1000).toFixed(1)}L
                  </Text>
                  <View style={[styles.barTrack30, isSelected && { borderColor: '#2563EB', borderWidth: 1 }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isSelected ? '#2563EB' : '#BFDBFE',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText30, isSelected && { color: '#2563EB', fontWeight: '700' }]}>
                    {cluster.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Dynamic Water KPIs */}
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
      </View>

      {/* 3. DEDICATED STEPS & ACTIVITY TRENDS (🔥) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWithIcon}>
            <View style={[styles.iconBadge, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="footsteps" size={16} color="#EA580C" />
            </View>
            <View>
              <Text style={styles.cardTitle}>
                {timeRange === '7d'
                  ? 'Activity & Steps Trends'
                  : timeRange === '14d'
                  ? '14-Day Steps Trajectory'
                  : '30-Day Weekly Movement'}
              </Text>
              <Text style={styles.cardSubtitle}>
                Avg: {analyticsSummary.avgSteps.toLocaleString()} steps/day • Goal: 10k
              </Text>
            </View>
          </View>
          <View style={styles.targetLegend}>
            <View style={[styles.targetLineDot, { backgroundColor: '#EA580C' }]} />
            <Text style={styles.targetLegendText}>10k goal</Text>
          </View>
        </View>

        {/* Interactive Tap-to-Inspect Tooltip Banner for Steps */}
        {timeRange !== '30d' && activeStepItem && (
          <View style={[styles.inspectPill, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <Text style={[styles.inspectPillText, { color: '#C2410C' }]}>
              🔥 {getItemLabel(activeStepItem)}:{' '}
              <Text style={styles.inspectBoldText}>{activeStepItem.steps.toLocaleString()} steps</Text>
              {' • '}
              +{activeStepItem.burned} kcal burned
            </Text>
          </View>
        )}

        {timeRange === '30d' && activeCluster && (
          <View style={[styles.inspectPill, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <Text style={[styles.inspectPillText, { color: '#C2410C' }]}>
              🔥 <Text style={styles.inspectBoldText}>{activeCluster.label}:</Text>{' '}
              {activeCluster.avgSteps.toLocaleString()} steps/day avg •{' '}
              <Text style={styles.inspectBoldText}>{activeCluster.totalBurn.toLocaleString()} kcal</Text> active burn
            </Text>
          </View>
        )}

        {/* Steps Chart View */}
        {timeRange === '7d' && (
          <View style={styles.chartContainer}>
            {weeklyLogs.map((item, index) => {
              const heightPct = Math.min(100, Math.round((item.steps / (stepGoal * 1.25)) * 100));
              const isSelected = selectedStepIdx === index;
              const isMet = item.steps >= stepGoal;
              return (
                <TouchableOpacity
                  key={item.date}
                  style={styles.barCol}
                  onPress={() => setSelectedStepIdx(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.barTopText, isSelected && { color: '#EA580C', fontWeight: '700' }]}>
                    {item.steps > 0 ? (item.steps / 1000).toFixed(1) + 'k' : '-'}
                  </Text>
                  <View style={[styles.barTrack, isSelected && { borderColor: '#EA580C', borderWidth: 1 }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isMet ? '#EA580C' : isSelected ? '#FB923C' : '#FED7AA',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText, isSelected && { color: '#EA580C', fontWeight: '700' }]}>
                    {item.dayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {timeRange === '14d' && (
          <View style={styles.chartContainer}>
            {fourteenDayData.map((item, index) => {
              const heightPct = Math.min(100, Math.round((item.steps / (stepGoal * 1.25)) * 100));
              const isSelected = selectedStepIdx === index;
              const isMet = item.steps >= stepGoal;
              const showLabel = index % 2 === 0 || item.isToday;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.barCol14}
                  onPress={() => setSelectedStepIdx(index)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.barTrack14, isSelected && { borderColor: '#EA580C', borderWidth: 1 }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isMet ? '#EA580C' : isSelected ? '#FB923C' : '#FED7AA',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText14, isSelected && { color: '#EA580C', fontWeight: '700' }]}>
                    {showLabel ? (item.isToday ? 'Now' : `D${item.label}`) : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {timeRange === '30d' && (
          <View style={styles.chartContainer}>
            {thirtyDayClusters.map((cluster, index) => {
              const heightPct = Math.min(100, Math.round((cluster.avgSteps / (stepGoal * 1.25)) * 100));
              const isSelected = selectedClusterIdx === index;
              return (
                <TouchableOpacity
                  key={cluster.id}
                  style={styles.barCol30}
                  onPress={() => setSelectedClusterIdx(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.barTopText, isSelected && { color: '#EA580C', fontWeight: '700' }]}>
                    {(cluster.avgSteps / 1000).toFixed(1)}k
                  </Text>
                  <View style={[styles.barTrack30, isSelected && { borderColor: '#EA580C', borderWidth: 1 }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, heightPct)}%`,
                          backgroundColor: isSelected ? '#EA580C' : '#FED7AA',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barBottomText30, isSelected && { color: '#EA580C', fontWeight: '700' }]}>
                    {cluster.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Dynamic Activity KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: '#EA580C' }]}>
              {analyticsSummary.avgSteps.toLocaleString()}
            </Text>
            <Text style={styles.kpiLabel}>Avg Steps/Day</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: '#EA580C' }]}>
              {analyticsSummary.totalDistanceKm} km
            </Text>
            <Text style={styles.kpiLabel}>Total Distance</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: '#EA580C' }]}>
              {analyticsSummary.totalBurn.toLocaleString()} kcal
            </Text>
            <Text style={styles.kpiLabel}>Active Burn</Text>
          </View>
        </View>
      </View>

      {/* 4. MACRONUTRIENT & DIETARY FIBER BALANCE */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Macronutrient & Fiber Quality</Text>
        <Text style={styles.cardSubtitle}>Daily average intake vs target goals</Text>

        <View style={styles.splitBar}>
          <View style={[styles.splitSegment, { width: `${carbPct}%`, backgroundColor: Colors.carbs }]} />
          <View style={[styles.splitSegment, { width: `${proteinPct}%`, backgroundColor: Colors.protein }]} />
          <View style={[styles.splitSegment, { width: `${fatPct}%`, backgroundColor: Colors.fat }]} />
        </View>

        <View style={styles.macroGrid}>
          <View style={styles.macroBox}>
            <View style={styles.macroBoxHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.protein }]} />
              <Text style={styles.macroName}>Protein</Text>
            </View>
            <Text style={styles.macroGramsVal}>{totalProtein}g</Text>
            <Text style={styles.macroGoalVal}>Goal: {userGoals.targetProtein}g</Text>
          </View>

          <View style={styles.macroBox}>
            <View style={styles.macroBoxHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.carbs }]} />
              <Text style={styles.macroName}>Carbs</Text>
            </View>
            <Text style={styles.macroGramsVal}>{totalCarbs}g</Text>
            <Text style={styles.macroGoalVal}>Goal: {userGoals.targetCarbs}g</Text>
          </View>

          <View style={styles.macroBox}>
            <View style={styles.macroBoxHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.fat }]} />
              <Text style={styles.macroName}>Fats</Text>
            </View>
            <Text style={styles.macroGramsVal}>{totalFat}g</Text>
            <Text style={styles.macroGoalVal}>Goal: {userGoals.targetFat}g</Text>
          </View>

          <View style={styles.macroBox}>
            <View style={styles.macroBoxHeader}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.macroName}>Fiber</Text>
            </View>
            <Text style={styles.macroGramsVal}>{totalFiber || 24}g</Text>
            <Text style={styles.macroGoalVal}>Goal: {userGoals.targetFiber || 30}g</Text>
          </View>
        </View>
      </View>

      {/* 5. MEAL-TIMING CALORIE DISTRIBUTION */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Calorie Intake by Meal Slot</Text>
        <Text style={styles.cardSubtitle}>Distribution across the day</Text>

        <View style={styles.mealDistRow}>
          <View style={styles.mealDistItem}>
            <Text style={styles.mealDistEmoji}>🍳</Text>
            <Text style={styles.mealDistName}>Breakfast</Text>
            <Text style={styles.mealDistPct}>25%</Text>
            <Text style={styles.mealDistCals}>~450 kcal</Text>
          </View>

          <View style={styles.mealDistItem}>
            <Text style={styles.mealDistEmoji}>🥗</Text>
            <Text style={styles.mealDistName}>Lunch</Text>
            <Text style={styles.mealDistPct}>35%</Text>
            <Text style={styles.mealDistCals}>~630 kcal</Text>
          </View>

          <View style={styles.mealDistItem}>
            <Text style={styles.mealDistEmoji}>🍵</Text>
            <Text style={styles.mealDistName}>Snacks</Text>
            <Text style={styles.mealDistPct}>12%</Text>
            <Text style={styles.mealDistCals}>~220 kcal</Text>
          </View>

          <View style={styles.mealDistItem}>
            <Text style={styles.mealDistEmoji}>🍲</Text>
            <Text style={styles.mealDistName}>Dinner</Text>
            <Text style={styles.mealDistPct}>28%</Text>
            <Text style={styles.mealDistCals}>~500 kcal</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  // Time Filter Switcher
  timeFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginTop: 12,
  },
  timeFilterBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  timeFilterBtnSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  timeFilterBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  timeFilterBtnTextSelected: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#0F172A',
    fontWeight: '600',
  },
  // Trajectory Callout Banner
  trajectoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },
  trajectoryText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#C2410C',
    flex: 1,
  },
  // Card Common Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  targetLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  targetLineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
  targetLegendText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#64748B',
  },
  // Inspect Pill Banner
  inspectPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  inspectPillText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#475569',
  },
  inspectBoldText: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    color: '#0F172A',
  },
  // 7-Day Chart Elements
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 145,
    paddingTop: 12,
    paddingHorizontal: 4,
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
    color: '#64748B',
    marginBottom: 4,
  },
  barTopTextActive: {
    fontFamily: Fonts.poppins.bold,
    color: Colors.primary,
  },
  barTrack: {
    width: 18,
    height: 105,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barTrackActive: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barBottomText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  barDayToday: {
    color: Colors.primary,
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  // 14-Day Slim Bar Elements
  barCol14: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack14: {
    width: 10,
    height: 105,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barBottomText14: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 6,
    height: 14,
  },
  // 30-Day 4-Cluster Bar Elements
  barCol30: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  barTrack30: {
    width: '85%',
    maxWidth: 38,
    height: 105,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barBottomText30: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#334155',
    marginTop: 6,
  },
  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 12,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  kpiValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
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
  // Macro Elements
  splitBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 14,
  },
  splitSegment: {
    height: '100%',
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  macroBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  macroGramsVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  macroGoalVal: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  // Meal Timing Distribution
  mealDistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 6,
  },
  mealDistItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  mealDistEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  mealDistName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#64748B',
  },
  mealDistPct: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  mealDistCals: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },
});

export const AnalyticsTab = AnalyticsScreen;
