import { DailyLog } from '@/types';
import {
  MONTH_NAMES,
  SHORT_MONTHS,
  FULL_DAY_NAMES,
  parseDateString,
  toDateString,
} from '@/utils/dateUtils';

export type ReportTimeframe = 'weekly' | 'monthly' | 'yearly';

/** One chart bucket: a day (weekly, monthly) or a calendar month (yearly). */
export interface PeriodDay {
  dateStr: string;
  /** Day of month (weekly, monthly) or month number 1-12 (yearly) */
  dayNum: number;
  /** Spoken by screen readers on the chart columns */
  dayName: string;
  /** Axis text: 'M', '18' or 'J' */
  axisLabel: string;
  /** Short label used in the chart tooltip: 'Wed', 'Nov 18' or 'Nov' */
  tooltipLabel: string;
  /** Tooltip title: 'Wed, 18 Nov' (daily) or 'November' (yearly) */
  tooltipTitle: string;
  /** Daily buckets carry their log (the analytics services key off the 'log' property) */
  log?: DailyLog;
  /** Yearly buckets list every date of the month */
  monthDates?: string[];
}

export interface PeriodRange {
  timeframe: ReportTimeframe;
  /** 'November 2026', '2026' or '16–22 Nov' */
  label: string;
  /** Wording for "vs ..." comparisons against the preceding period */
  comparisonLabel: string;
  days: PeriodDay[];
  allDates: string[];
  canGoForward: boolean;
}

const dayNameOf = (d: Date) => FULL_DAY_NAMES[d.getDay()];

/**
 * Builds the buckets for a report period.
 * Weekly: Mon-Sun. Monthly: one bucket per calendar day. Yearly: 12 months (carry monthDates).
 * periodOffset 0 is the period containing today, -1 the one before, and so on.
 */
export function buildPeriodRange(
  timeframe: ReportTimeframe,
  periodOffset: number,
  todayStr: string,
  dailyLogs: Record<string, DailyLog>
): PeriodRange {
  const now = parseDateString(todayStr);
  const canGoForward = periodOffset < 0;

  if (timeframe === 'weekly') {
    const diffToMonday = now.getDay() === 0 ? -6 : 1 - now.getDay();
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday + periodOffset * 7
    );
    const days: PeriodDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dateStr = toDateString(d);
      const name = dayNameOf(d);
      return {
        dateStr,
        dayNum: d.getDate(),
        dayName: `${name} ${d.getDate()}`,
        axisLabel: name[0],
        tooltipLabel: name.slice(0, 3),
        tooltipTitle: `${name.slice(0, 3)}, ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`,
        log: dailyLogs[dateStr],
      };
    });
    const first = parseDateString(days[0].dateStr);
    const last = parseDateString(days[6].dateStr);
    const label =
      first.getMonth() === last.getMonth()
        ? `${first.getDate()}–${last.getDate()} ${SHORT_MONTHS[last.getMonth()]}`
        : `${first.getDate()} ${SHORT_MONTHS[first.getMonth()]} – ${last.getDate()} ${SHORT_MONTHS[last.getMonth()]}`;
    return {
      timeframe,
      label,
      comparisonLabel: 'previous week',
      days,
      allDates: days.map(d => d.dateStr),
      canGoForward,
    };
  }

  if (timeframe === 'monthly') {
    const target = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
    const year = target.getFullYear();
    const monthIdx = target.getMonth();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const days: PeriodDay[] = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, monthIdx, i + 1);
      const dateStr = toDateString(d);
      return {
        dateStr,
        dayNum: i + 1,
        dayName: `${dayNameOf(d)} ${i + 1}`,
        axisLabel: String(i + 1),
        tooltipLabel: `${SHORT_MONTHS[monthIdx]} ${i + 1}`,
        tooltipTitle: `${dayNameOf(d).slice(0, 3)}, ${i + 1} ${SHORT_MONTHS[monthIdx]}`,
        log: dailyLogs[dateStr],
      };
    });
    const prev = new Date(year, monthIdx - 1, 1);
    return {
      timeframe,
      label: `${MONTH_NAMES[monthIdx]} ${year}`,
      comparisonLabel: MONTH_NAMES[prev.getMonth()],
      days,
      allDates: days.map(d => d.dateStr),
      canGoForward,
    };
  }

  const year = now.getFullYear() + periodOffset;
  const allDates: string[] = [];
  const days: PeriodDay[] = Array.from({ length: 12 }, (_, monthIdx) => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const monthDates = Array.from({ length: daysInMonth }, (_, i) =>
      toDateString(new Date(year, monthIdx, i + 1))
    );
    allDates.push(...monthDates);
    return {
      dateStr: monthDates[0],
      dayNum: monthIdx + 1,
      dayName: MONTH_NAMES[monthIdx],
      axisLabel: SHORT_MONTHS[monthIdx][0],
      tooltipLabel: SHORT_MONTHS[monthIdx],
      tooltipTitle: MONTH_NAMES[monthIdx],
      monthDates,
    };
  });
  return {
    timeframe,
    label: String(year),
    comparisonLabel: String(year - 1),
    days,
    allDates,
    canGoForward,
  };
}

/**
 * The bucket selected by default: the one holding today, otherwise the last bucket of a past
 * period (or the first of a future one).
 */
export function defaultSelectedIndex(range: PeriodRange, todayStr: string): number {
  const idx = range.days.findIndex(d =>
    d.monthDates ? d.monthDates.includes(todayStr) : d.dateStr === todayStr
  );
  if (idx >= 0) return idx;
  return range.allDates[0] > todayStr ? 0 : range.days.length - 1;
}
