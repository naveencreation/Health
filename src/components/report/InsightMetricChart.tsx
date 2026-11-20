import React from 'react';
import { Colors } from '@/theme/colors';
import { MetricSeries, InsightMetric } from '@/services/insights/metricSeries';
import { PeriodDay, ReportTimeframe } from '@/services/insights/periodRange';
import {
  StackedMacroChart,
  GoalBarChart,
  WaterAreaChart,
  TrendLineChart,
  TooltipSpec,
} from './InsightCharts';

export const METRIC_COLOR: Record<InsightMetric, string> = {
  calories: Colors.primary,
  steps: Colors.steps,
  water: Colors.water,
  weight: Colors.weight,
};

const METRIC_NAME: Record<InsightMetric, string> = {
  calories: 'Calories',
  steps: 'Steps',
  water: 'Water',
  weight: 'Weight',
};

export const fmtInt = (n: number) => Math.round(n).toLocaleString();
/** Litres with up to `digits` decimals, trailing zeros trimmed (2.50 -> 2.5) */
export const fmtLitres = (ml: number, digits = 1) => `${+(ml / 1000).toFixed(digits)}`;
const fmtK = (n: number) => `${+(n / 1000).toFixed(1)}k`;

const MONTH_AXIS_DAYS = [1, 8, 15, 22, 29];

const valueText = (metric: InsightMetric, v: number | null, unit: string): string => {
  if (v === null || v <= 0) {
    return metric === 'calories'
      ? 'No meals'
      : metric === 'steps'
        ? 'No steps'
        : metric === 'water'
          ? 'No drinks'
          : 'No weigh-in';
  }
  if (metric === 'water') return `${fmtLitres(v, 2)} L`;
  if (metric === 'weight') return `${v.toFixed(1)} ${unit}`;
  if (metric === 'calories') return `${fmtInt(v)} kcal`;
  return `${fmtInt(v)} steps`;
};

export interface InsightMetricChartProps {
  series: MetricSeries;
  days: PeriodDay[];
  timeframe: ReportTimeframe;
  selectedIndex: number | null;
  onSelect?: (index: number) => void;
  entranceKey: string;
}

/** Picks and feeds the right chart for a metric and timeframe (shared by overview and detail). */
export const InsightMetricChart: React.FC<InsightMetricChartProps> = ({
  series,
  days,
  timeframe,
  selectedIndex,
  onSelect,
  entranceKey,
}) => {
  const { metric, values, goal } = series;
  const unit = series.weight?.unit ?? '';
  const isWeek = timeframe === 'weekly';
  const isMonth = timeframe === 'monthly';
  const labels = days.map(d =>
    isMonth && !MONTH_AXIS_DAYS.includes(d.dayNum) ? '' : d.tooltipLabel
  );
  const a11yLabels = days.map((d, i) => `${d.dayName}, ${valueText(metric, values[i], unit)}`);
  const nums = values.map(v => v ?? 0);
  const goalValue = goal ?? 0;

  const single = (i: number): TooltipSpec | null => {
    const v = values[i];
    if (v === null || v <= 0) return null;
    return {
      title: days[i].tooltipTitle,
      rows: [
        {
          label: METRIC_NAME[metric],
          value: valueText(metric, v, unit),
          color: METRIC_COLOR[metric],
        },
      ],
    };
  };

  const common = { labels, a11yLabels, selectedIndex, onSelect, entranceKey };

  if (metric === 'weight') {
    const target = series.weight?.targetKg;
    const factor = series.weight?.unitFactor ?? 1;
    return (
      <TrendLineChart
        {...common}
        tooltip={isWeek ? undefined : single}
        values={values}
        variant={isWeek ? 'week' : 'month'}
        goal={
          target !== undefined
            ? { value: target * factor, label: `GOAL ${(target * factor).toFixed(1)}` }
            : null
        }
      />
    );
  }

  if (isWeek && metric === 'calories') {
    const macros = series.macroKcal ?? [];
    return (
      <StackedMacroChart
        {...common}
        totals={nums}
        macroKcal={nums.map((_, i) => macros[i] ?? null)}
        goal={goalValue}
        tooltip={i => {
          const total = nums[i];
          if (!(total > 0)) return null;
          const m = macros[i];
          const sum = m ? m.protein + m.carbs + m.fat : 0;
          if (!m || sum <= 0) return single(i);
          const part = (k: number) => `${fmtInt((k / sum) * total)} kcal`;
          return {
            title: days[i].tooltipTitle,
            rows: [
              { label: 'Protein', value: part(m.protein), color: Colors.protein },
              { label: 'Carbs', value: part(m.carbs), color: Colors.carbs },
              { label: 'Fat', value: part(m.fat), color: Colors.fat },
            ],
            total: `${fmtInt(total)} kcal`,
          };
        }}
      />
    );
  }

  if (isWeek && metric === 'water') {
    const split = series.waterSplit ?? [];
    return (
      <WaterAreaChart
        {...common}
        values={nums}
        goal={goalValue}
        goalLabel={`GOAL ${fmtLitres(goalValue, 2)} L`}
        tooltip={i => {
          if (!(nums[i] > 0)) return null;
          const s = split[i];
          if (!s || s.otherMl <= 0) return single(i);
          return {
            title: days[i].tooltipTitle,
            rows: [
              { label: 'Water', value: `${fmtLitres(s.waterMl, 2)} L`, color: Colors.water },
              {
                label: 'Other drinks',
                value: `${fmtLitres(s.otherMl, 2)} L`,
                color: Colors.waterOther,
              },
            ],
            total: `${fmtLitres(nums[i], 2)} L`,
          };
        }}
      />
    );
  }

  const goalLabel =
    metric === 'water'
      ? `GOAL ${fmtLitres(goalValue, 2)} L`
      : metric === 'calories'
        ? ''
        : `GOAL ${goalValue >= 1000 ? `${+(goalValue / 1000).toFixed(1)}K` : goalValue}`;
  return (
    <GoalBarChart
      {...common}
      values={nums}
      goal={goalValue}
      goalLabel={goalLabel}
      color={METRIC_COLOR[metric]}
      tones={
        metric === 'steps'
          ? { selected: Colors.steps, met: Colors.stepsMet, missed: Colors.stepsTrack }
          : undefined
      }
      variant={isWeek ? 'week' : 'month'}
      band={metric === 'calories'}
      formatLabel={isWeek && metric === 'steps' ? fmtK : undefined}
      tooltip={isWeek && metric === 'steps' ? undefined : single}
    />
  );
};
