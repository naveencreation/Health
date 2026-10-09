/**
 * Canonical Date Utilities for Calorify
 * Timezone-safe local date math and rolling window generation.
 */

export const SHORT_DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Returns YYYY-MM-DD for a given Date object in local time.
 */
export const toDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

/**
 * Parses YYYY-MM-DD into a local Date object.
 */
export const parseDateString = (dateStr: string): Date => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return new Date();
};

/**
 * Checks if targetDate is strictly in the future relative to today.
 */
export const isFutureDate = (targetDate: string, todayStr: string = toDateString()): boolean => {
  if (!targetDate) return false;
  return targetDate > todayStr;
};

/**
 * Shifts a date string by N days, with an optional upper bound ceiling.
 */
export const shiftDateClamped = (
  currentDateStr: string,
  days: number,
  maxDateStr: string = toDateString()
): string => {
  const curr = parseDateString(currentDateStr);
  curr.setDate(curr.getDate() + days);
  const resultStr = toDateString(curr);
  return resultStr > maxDateStr ? maxDateStr : resultStr;
};

/**
 * Generates a 7-day rolling window of YYYY-MM-DD strings ending at endDateStr.
 * Automatically clamps endDateStr so it never exceeds todayStr.
 */
export const getRollingSevenDays = (
  endDateStr: string,
  todayStr: string = toDateString()
): string[] => {
  const effectiveEndStr = endDateStr > todayStr ? todayStr : endDateStr;
  const end = parseDateString(effectiveEndStr);
  const days: string[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    days.push(toDateString(d));
  }

  return days;
};

/**
 * Generates a human-friendly header title for a range of dates.
 * e.g. "October 2026" or "Sep – Oct 2026" or "Dec 2026 – Jan 2027"
 */
export const formatRangeMonthTitle = (startStr: string, endStr: string): string => {
  const start = parseDateString(startStr);
  const end = parseDateString(endStr);

  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${MONTH_NAMES[startMonth]} ${startYear}`;
    }
    return `${SHORT_MONTHS[startMonth]} – ${SHORT_MONTHS[endMonth]} ${startYear}`;
  }

  return `${SHORT_MONTHS[startMonth]} ${startYear} – ${SHORT_MONTHS[endMonth]} ${endYear}`;
};
