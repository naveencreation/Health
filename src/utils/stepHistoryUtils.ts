import { StepLogEntry } from '@/types';
import { KCAL_PER_STEP } from '@/constants/biometricDefaults';
import { pad2, toDateString } from '@/utils/dateUtils';

/**
 * Format a YYYY-MM-DD date string into the friendly date header matching the reference:
 * e.g., "Today, Oct 2, 2026" or "Yesterday, Dec 21, 2024" or "Friday, Dec 19, 2024"
 */
export function formatHistoryDateHeader(dateStr: string): string {
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    const targetDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const targetZero = new Date(year, month, day);
    targetZero.setHours(0, 0, 0, 0);

    const monthNames = [
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
    ];
    const monthName = monthNames[month] || 'Jan';

    if (targetZero.getTime() === today.getTime()) {
      return `Today, ${monthName} ${day}, ${year}`;
    }

    if (targetZero.getTime() === yesterday.getTime()) {
      return `Yesterday, ${monthName} ${day}, ${year}`;
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[targetDate.getDay()] || '';

    return `${dayName}, ${monthName} ${day}, ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format timestamp (ISO string) into AM/PM time
 */
export function formatTimeAmPm(isoString?: string): string {
  if (!isoString) return '12:00 PM';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '12:00 PM';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  } catch {
    return '12:00 PM';
  }
}

/**
 * Format interval time range (e.g. "08:15 AM - 08:24 AM")
 */
export function formatIntervalRange(startTime?: string, endTime?: string): string {
  if (!startTime) return 'Session Walk';
  const startFmt = formatTimeAmPm(startTime);
  if (!endTime) return startFmt;
  const endFmt = formatTimeAmPm(endTime);
  return `${startFmt} - ${endFmt}`;
}

/**
 * Calculate calories and distance from step count
 */
export function calculateStepMetrics(steps: number, durationMinutes?: number) {
  const calories = Math.round(steps * KCAL_PER_STEP);
  const distanceKm = Math.round(steps * 0.00076 * 10) / 10;
  // Estimate ~100 steps per minute if duration not provided
  const duration = durationMinutes ?? Math.max(1, Math.round(steps / 100));

  return {
    calories,
    distanceKm,
    durationMinutes: duration,
  };
}

/**
 * Buckets raw Health Connect records into one StepLogEntry per local hour (max 24 a day):
 * Samsung Health / Google Fit write hundreds of records a day, and a day with more than 200
 * entries is rejected by firestore.rules. Ids are deterministic per date+hour.
 */
export function mapHealthConnectRecordsToStepEntries(records: any[]): StepLogEntry[] {
  if (!records || records.length === 0) return [];

  const buckets = new Map<number, { hourStart: Date; steps: number; minutes: number }>();
  for (const record of records) {
    if (!record || typeof record.count !== 'number' || record.count <= 0) continue;
    const start = new Date(record.startTime ?? Date.now());
    if (isNaN(start.getTime())) continue;
    const hourStart = new Date(start);
    hourStart.setMinutes(0, 0, 0);

    let minutes = Math.max(1, Math.round(record.count / 100));
    const endMs = new Date(record.endTime).getTime();
    if (record.endTime && endMs > start.getTime()) {
      minutes = Math.max(1, Math.round((endMs - start.getTime()) / 60000));
    }

    const key = hourStart.getTime();
    const bucket = buckets.get(key) ?? { hourStart, steps: 0, minutes: 0 };
    bucket.steps += record.count;
    bucket.minutes += minutes;
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .sort((a, b) => b.hourStart.getTime() - a.hourStart.getTime()) // newest first
    .map(({ hourStart, steps, minutes }) => {
      const metrics = calculateStepMetrics(steps, Math.min(60, minutes));
      const startTime = hourStart.toISOString();
      return {
        id: `hc_${toDateString(hourStart)}_${pad2(hourStart.getHours())}`,
        steps,
        durationMinutes: metrics.durationMinutes,
        caloriesBurned: metrics.calories,
        distanceKm: metrics.distanceKm,
        loggedAt: startTime,
        startTime,
        endTime: new Date(hourStart.getTime() + 3600000).toISOString(),
        source: 'health_connect' as const,
      };
    });
}

/**
 * When the app has an aggregate step count (e.g. 1269 steps) but no raw interval records,
 * intelligently segments the day's steps into realistic chronological sessions so
 * the user always sees their steps reflected cleanly in the History table!
 */
export function synthesizeSessionsFromTotal(totalSteps: number, dateStr: string): StepLogEntry[] {
  if (!totalSteps || totalSteps <= 0) return [];

  // If small step count (< 200), keep as 1 single session
  if (totalSteps <= 200) {
    const metrics = calculateStepMetrics(totalSteps);
    return [
      {
        id: `synth_${dateStr}_1`,
        steps: totalSteps,
        durationMinutes: metrics.durationMinutes,
        caloriesBurned: metrics.calories,
        distanceKm: metrics.distanceKm,
        loggedAt: `${dateStr}T10:00:00.000Z`,
        source: 'synthetic' as const,
      },
    ];
  }

  // Segment proportions: e.g. 35%, 40%, 25% or 4 segments if larger
  const chunks: number[] = [];
  if (totalSteps <= 1000) {
    const part1 = Math.round(totalSteps * 0.45);
    const part2 = totalSteps - part1;
    chunks.push(part1, part2);
  } else if (totalSteps <= 2500) {
    const part1 = Math.round(totalSteps * 0.35);
    const part2 = Math.round(totalSteps * 0.4);
    const part3 = totalSteps - (part1 + part2);
    chunks.push(part1, part2, part3);
  } else {
    const part1 = Math.round(totalSteps * 0.25);
    const part2 = Math.round(totalSteps * 0.3);
    const part3 = Math.round(totalSteps * 0.25);
    const part4 = totalSteps - (part1 + part2 + part3);
    chunks.push(part1, part2, part3, part4);
  }

  const times = ['08:30:00', '12:45:00', '16:20:00', '19:15:00'];

  return chunks.map((chunkSteps, idx) => {
    const metrics = calculateStepMetrics(chunkSteps);
    const time = times[idx % times.length];
    return {
      id: `synth_${dateStr}_${idx + 1}`,
      steps: chunkSteps,
      durationMinutes: metrics.durationMinutes,
      caloriesBurned: metrics.calories,
      distanceKm: metrics.distanceKm,
      loggedAt: `${dateStr}T${time}.000Z`,
      source: 'synthetic' as const,
    };
  });
}
