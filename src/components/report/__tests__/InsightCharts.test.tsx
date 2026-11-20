import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import {
  StackedMacroChart,
  GoalBarChart,
  WaterAreaChart,
  TrendLineChart,
  StatTiles,
  TooltipSpec,
} from '../InsightCharts';
import { RadarChart } from '../RadarChart';
import { MacroDonut } from '../MacroDonut';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIP: TooltipSpec = {
  title: 'Wed, 18 Nov',
  rows: [
    { label: 'Protein', value: '473 kcal', color: '#67BD6E' },
    { label: 'Fat', value: '510 kcal', color: '#E07A5F' },
  ],
  total: '983 kcal',
};
const shared = (n: number, onSelect = jest.fn()) => ({
  labels: DAYS.slice(0, n),
  a11yLabels: Array.from({ length: n }, (_, i) => `day ${i}`),
  tooltip: () => TIP,
  selectedIndex: 2,
  onSelect,
  entranceKey: 'k',
});

const measured = async (screen: { getByTestId: (id: string) => any }) => {
  await fireEvent(screen.getByTestId('insight-chart'), 'layout', {
    nativeEvent: { layout: { width: 306, height: 220 } },
  });
};

// SVG text renders as host TSpan nodes, so look for it in the serialised tree
const drawn = (screen: { toJSON: () => unknown }, text: string) =>
  JSON.stringify(screen.toJSON()).includes(text);

describe('Insight charts', () => {
  it('selects a day from its transparent slot', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <GoalBarChart
        {...shared(7, onSelect)}
        values={[6200, 9400, 11240, 7300, 4100, 0, 0]}
        goal={8000}
        goalLabel="GOAL 8K"
        color="#F97316"
      />
    );
    await fireEvent.press(screen.getByLabelText('day 4'));
    expect(onSelect).toHaveBeenCalledWith(4);
    expect(screen.getByLabelText('day 2').props.accessibilityState.selected).toBe(true);
  });

  it('draws the stacked calorie chart with zone, legend and a macro tooltip', async () => {
    const screen = await render(
      <StackedMacroChart
        {...shared(7)}
        totals={[1790, 2110, 1820, 1690, 1240, 0, 0]}
        macroKcal={[
          { protein: 400, carbs: 900, fat: 500 },
          null,
          { protein: 473, carbs: 837, fat: 510 },
          null,
          null,
          null,
          null,
        ]}
        goal={1850}
      />
    );
    await measured(screen);
    expect(drawn(screen, 'YOUR ZONE')).toBe(true);
    expect(drawn(screen, 'Wed, 18 Nov')).toBe(true);
    expect(drawn(screen, 'Total')).toBe(true);
    expect(screen.getByText('Protein')).toBeTruthy();
    expect(screen.getByText('Carbs')).toBeTruthy();
    expect(screen.getByText('Fat')).toBeTruthy();
  });

  it('labels step bars and the goal line', async () => {
    const screen = await render(
      <GoalBarChart
        {...shared(7)}
        tooltip={undefined}
        values={[6200, 9400, 11240, 7300, 4100, 0, 0]}
        goal={8000}
        goalLabel="GOAL 8K"
        color="#F97316"
        tones={{ selected: '#F97316', met: '#FDBA74', missed: '#FED7AA' }}
        formatLabel={v => `${+(v / 1000).toFixed(1)}k`}
      />
    );
    await measured(screen);
    expect(drawn(screen, 'GOAL 8K')).toBe(true);
    expect(drawn(screen, '11.2k')).toBe(true);
    expect(drawn(screen, 'Wed, 18 Nov')).toBe(false);
  });

  it('draws month bars with a tooltip beside the selected day', async () => {
    const screen = await render(
      <GoalBarChart
        {...shared(30)}
        values={Array.from({ length: 30 }, (_, i) => (i < 20 ? 6000 + i * 100 : 0))}
        goal={8000}
        goalLabel="GOAL 8K"
        color="#F97316"
        variant="month"
      />
    );
    await measured(screen);
    expect(drawn(screen, 'GOAL 8K')).toBe(true);
    expect(drawn(screen, 'Wed, 18 Nov')).toBe(true);
  });

  it('draws the water area with its goal label', async () => {
    const screen = await render(
      <WaterAreaChart
        {...shared(7)}
        values={[2250, 2600, 2750, 2500, 1500, 0, 0]}
        goal={2500}
        goalLabel="GOAL 2.5 L"
      />
    );
    await measured(screen);
    expect(drawn(screen, 'GOAL 2.5 L')).toBe(true);
    expect(drawn(screen, 'Wed, 18 Nov')).toBe(true);
  });

  it('draws weight value labels and the trend', async () => {
    const screen = await render(
      <TrendLineChart
        {...shared(7)}
        tooltip={undefined}
        values={[72.8, null, 72.5, null, 72.2, null, null]}
      />
    );
    await measured(screen);
    expect(drawn(screen, '72.5')).toBe(true);
    expect(drawn(screen, 'trend')).toBe(true);
  });

  it('survives empty data', async () => {
    const screen = await render(
      <TrendLineChart {...shared(7)} values={[null, null, null, null, null, null, null]} />
    );
    await measured(screen);
    expect(screen.getByLabelText('day 0')).toBeTruthy();

    const water = await render(
      <WaterAreaChart {...shared(7)} values={[0, 0, 0, 0, 0, 0, 0]} goal={2500} goalLabel="GOAL" />
    );
    await measured(water);
    expect(water.getByLabelText('day 0')).toBeTruthy();
  });

  it('renders the radar with a percentage under each axis', async () => {
    const screen = await render(
      <RadarChart
        axes={[
          { label: 'Calories', value: 0.92 },
          { label: 'Protein', value: 0.62 },
          { label: 'Water', value: 0.96 },
          { label: 'Steps', value: 0.8 },
          { label: 'Weigh-ins', value: 0.6 },
        ]}
      />
    );
    expect(screen.getByLabelText(/Week balance: Calories 92%/)).toBeTruthy();
    expect(drawn(screen, '62%')).toBe(true);
    expect(drawn(screen, 'Weigh-ins')).toBe(true);
  });

  it('renders the macro donut with progress rows', async () => {
    const screen = await render(
      <MacroDonut
        avgKcal={1853}
        macros={[
          { name: 'Protein', grams: 62, target: 90, color: '#67BD6E', kcalPerG: 4 },
          { name: 'Carbs', grams: 228, target: 230, color: '#F8D558', kcalPerG: 4 },
          { name: 'Fat', grams: 58, target: 62, color: '#E07A5F', kcalPerG: 9 },
        ]}
      />
    );
    expect(screen.getByLabelText('Protein: 62 of 90 grams')).toBeTruthy();
    expect(drawn(screen, 'kcal / day')).toBe(true);
  });

  it('renders stat tiles with units', async () => {
    const screen = await render(
      <StatTiles
        stats={[
          { label: 'Average', value: '7,214' },
          { label: 'Best day', value: '11,240' },
          { label: 'Goal days', value: '8', unit: '/20' },
        ]}
      />
    );
    expect(screen.getByLabelText('Goal days: 8 /20')).toBeTruthy();
  });
});
