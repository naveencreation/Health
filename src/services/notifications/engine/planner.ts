import { MealType } from '@/types';
import { NotificationSettings, PlannedNotification, ReminderType } from '../types';
import { NOTIFICATION_CHANNELS_MAP, REMINDER_PRIORITY } from '../defaults';

export interface PlannerInput {
  settings: NotificationSettings;
  now?: Date | number;
  loggedMealsToday?: Set<MealType> | MealType[];
  waterStats?: {
    currentMl: number;
    targetMl: number;
    lastLoggedAt?: number;
  };
  streakDays?: number;
  hasLoggedWeightToday?: boolean;
  stepStats?: {
    currentSteps: number;
    targetSteps: number;
  };
}

export function isInsideQuietHours(
  date: Date,
  startStr: string,
  endStr: string
): boolean {
  if (!startStr || !endStr) return false;
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  if (
    isNaN(startH) ||
    isNaN(startM) ||
    isNaN(endH) ||
    isNaN(endM)
  ) {
    return false;
  }

  const timeMin = date.getHours() * 60 + date.getMinutes();
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  if (startMin === endMin) {
    return false;
  }

  // Wraps past midnight (e.g., 22:00 to 07:00)
  if (startMin > endMin) {
    return timeMin >= startMin || timeMin < endMin;
  }

  // Same-day window (e.g., 01:00 to 06:00)
  return timeMin >= startMin && timeMin < endMin;
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTimeToDate(baseDate: Date, timeStr: string): Date {
  const [hours, minutes] = (timeStr || '12:00').split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

export function planNotifications(input: PlannerInput): PlannedNotification[] {
  const { settings } = input;
  if (!settings.enabled) {
    return [];
  }

  const now = input.now instanceof Date ? input.now : new Date(input.now ?? Date.now());
  const nowMs = now.getTime();

  const loggedMealsSet = new Set<MealType>(
    Array.isArray(input.loggedMealsToday)
      ? input.loggedMealsToday
      : input.loggedMealsToday
        ? Array.from(input.loggedMealsToday)
        : []
  );

  const streakDays = typeof input.streakDays === 'number' ? input.streakDays : 0;
  const waterStats = input.waterStats;
  const waterGoalMet =
    Boolean(waterStats && waterStats.targetMl > 0 && waterStats.currentMl >= waterStats.targetMl);
  const lastWaterLoggedAt = waterStats?.lastLoggedAt ?? settings.lastWaterLoggedAt;

  const candidates: PlannedNotification[] = [];

  // Horizon:
  // Meals & Steps: 7 days (day 0 to day 6)
  // Streak & Water: 2 days (day 0 to day 1)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() + dayOffset);
    const dateStr = formatDateString(dayDate);
    const isToday = dayOffset === 0;

    // 1. MEALS (7 days)
    if (settings.meals.enabled) {
      // Breakfast
      if (!settings.meals.skipsBreakfast) {
        const isLogged = isToday && loggedMealsSet.has('breakfast');
        if (!isLogged) {
          const fireDate = parseTimeToDate(dayDate, settings.meals.breakfast);
          const fireAt = fireDate.getTime();
          if (
            fireAt > nowMs &&
            !isInsideQuietHours(fireDate, settings.quietHours.start, settings.quietHours.end)
          ) {
            candidates.push({
              id: `calori_meal_breakfast_${dateStr}`,
              type: 'meal_breakfast',
              fireAt,
              channelId: NOTIFICATION_CHANNELS_MAP.meal_breakfast,
              title: '🍳 Breakfast Time',
              body: 'Good morning! Log your breakfast to jumpstart your daily energy.',
              data: {
                route: 'food_vision',
                reminderType: 'meal_breakfast',
                mealSlot: 'breakfast',
              },
            });
          }
        }
      }

      // Lunch
      const isLunchLogged = isToday && loggedMealsSet.has('lunch');
      if (!isLunchLogged) {
        const fireDate = parseTimeToDate(dayDate, settings.meals.lunch);
        const fireAt = fireDate.getTime();
        if (
          fireAt > nowMs &&
          !isInsideQuietHours(fireDate, settings.quietHours.start, settings.quietHours.end)
        ) {
          candidates.push({
            id: `calori_meal_lunch_${dateStr}`,
            type: 'meal_lunch',
            fireAt,
            channelId: NOTIFICATION_CHANNELS_MAP.meal_lunch,
            title: '🥗 Fuel Your Afternoon',
            body: 'Midday meal? Snap a quick photo with Ria AI for effortless macro tracking.',
            data: {
              route: 'food_vision',
              reminderType: 'meal_lunch',
              mealSlot: 'lunch',
            },
          });
        }
      }

      // Dinner
      const isDinnerLogged = isToday && loggedMealsSet.has('dinner');
      if (!isDinnerLogged) {
        const fireDate = parseTimeToDate(dayDate, settings.meals.dinner);
        const fireAt = fireDate.getTime();
        if (
          fireAt > nowMs &&
          !isInsideQuietHours(fireDate, settings.quietHours.start, settings.quietHours.end)
        ) {
          candidates.push({
            id: `calori_meal_dinner_${dateStr}`,
            type: 'meal_dinner',
            fireAt,
            channelId: NOTIFICATION_CHANNELS_MAP.meal_dinner,
            title: '🍽️ Dinner Time',
            body: 'Dinner is served. Wrap up your nutrition log to see your daily progress.',
            data: {
              route: 'food_vision',
              reminderType: 'meal_dinner',
              mealSlot: 'dinner',
            },
          });
        }
      }
    }

    // 2. WEIGHT (7 days)
    if (settings.weight?.enabled) {
      const isWeightLogged = isToday && Boolean(input.hasLoggedWeightToday);
      if (!isWeightLogged) {
        const fireDate = parseTimeToDate(dayDate, settings.weight.time || '07:30');
        const fireAt = fireDate.getTime();
        if (
          fireAt > nowMs &&
          !isInsideQuietHours(fireDate, settings.quietHours.start, settings.quietHours.end)
        ) {
          candidates.push({
            id: `calori_weight_${dateStr}`,
            type: 'weight',
            fireAt,
            channelId: NOTIFICATION_CHANNELS_MAP.weight,
            title: '⚖️ Morning Weigh-In',
            body: 'Step on the scale for a quick, consistent check-in to track your long-term trend.',
            data: {
              route: 'weight',
              reminderType: 'weight',
            },
          });
        }
      }
    }

    // 3. STEPS (7 days, fixed 17:30)
    if (settings.steps.enabled) {
      const fireDate = parseTimeToDate(dayDate, '17:30');
      const fireAt = fireDate.getTime();
      if (
        fireAt > nowMs &&
        !isInsideQuietHours(fireDate, settings.quietHours.start, settings.quietHours.end)
      ) {
        const stepStats = input.stepStats;
        const isGoalCrushed = Boolean(
          isToday &&
            stepStats &&
            stepStats.targetSteps > 0 &&
            stepStats.currentSteps >= stepStats.targetSteps
        );

        candidates.push({
          id: `calori_steps_${dateStr}`,
          type: 'steps',
          fireAt,
          channelId: NOTIFICATION_CHANNELS_MAP.steps,
          title: isGoalCrushed ? '🎉 Step Goal Crushed!' : '🚶 Afternoon Movement Check',
          body: isGoalCrushed
            ? "You've already hit your daily movement target. Fantastic job staying active today!"
            : 'Keep your momentum going! Take a quick walk to stay on pace for your daily step goal.',
          data: {
            route: 'today',
            reminderType: 'steps',
          },
        });
      }
    }

    // 3. STREAK (Today + Tomorrow: day 0 and day 1)
    if (settings.streak.enabled && dayOffset <= 1) {
      // If streakDays === 0, do not schedule
      if (streakDays > 0) {
        // If today and user has already logged a meal, drop today's streak reminder
        const loggedAnyMealToday = isToday && loggedMealsSet.size > 0;
        if (!loggedAnyMealToday) {
          const fireDate = parseTimeToDate(dayDate, '21:00');
          const fireAt = fireDate.getTime();
          if (
            fireAt > nowMs &&
            !isInsideQuietHours(fireDate, settings.quietHours.start, settings.quietHours.end)
          ) {
            candidates.push({
              id: `calori_streak_${dateStr}`,
              type: 'streak',
              fireAt,
              channelId: NOTIFICATION_CHANNELS_MAP.streak,
              title: '🔥 Keep Your Streak Alive',
              body: "Don't let today slip away. Log your nutrition to protect your streak!",
              data: {
                route: 'today',
                reminderType: 'streak',
              },
            });
          }
        }
      }
    }

    // 4. WATER (Today + Tomorrow: day 0 and day 1)
    if (settings.water.enabled && dayOffset <= 1) {
      // If today and water goal met, drop all water reminders today
      const shouldScheduleWater = !(isToday && waterGoalMet);
      if (shouldScheduleWater) {
        const intervalMinutes = settings.water.intervalMinutes || 120;
        const intervalMs = intervalMinutes * 60 * 1000;

        // Generate water check-in slots throughout waking hours (09:00 to 21:00)
        // Hard cap at 8 per day
        const dayWaterCandidates: PlannedNotification[] = [];
        let slotIndex = 0;

        // Base schedule starts at 09:00
        const waterStartTime = parseTimeToDate(dayDate, '09:00');
        const waterEndTime = parseTimeToDate(dayDate, '21:00');

        let currentSlot = waterStartTime.getTime();
        while (currentSlot <= waterEndTime.getTime() && dayWaterCandidates.length < 8) {
          const slotDate = new Date(currentSlot);

          const isFuture = currentSlot > nowMs;
          const notInQuiet = !isInsideQuietHours(
            slotDate,
            settings.quietHours.start,
            settings.quietHours.end
          );

          // If lastWaterLoggedAt is set, first reminder must be at least intervalMinutes after it
          const respectsLastLog =
            !isToday ||
            !lastWaterLoggedAt ||
            currentSlot >= lastWaterLoggedAt + intervalMs;

          if (isFuture && notInQuiet && respectsLastLog) {
            dayWaterCandidates.push({
              id: `calori_water_${dateStr}_${slotIndex}`,
              type: 'water',
              fireAt: currentSlot,
              channelId: NOTIFICATION_CHANNELS_MAP.water,
              title: '💧 Stay Hydrated',
              body: 'Time for a fresh glass of water to keep your body energized.',
              data: {
                route: 'water',
                reminderType: 'water',
              },
            });
          }

          slotIndex++;
          currentSlot += intervalMs;
        }

        candidates.push(...dayWaterCandidates);
      }
    }
  }

  // 5. 30-MINUTE COLLISION RESOLUTION
  // Rule: If two notifications fall within 30 min (< 30 min diff), keep the higher priority
  // Priority: streak (4) > meal (3) > steps (2) > water (1)
  const sortedByPriority = [...candidates].sort((a, b) => {
    const pDiff = REMINDER_PRIORITY[b.type] - REMINDER_PRIORITY[a.type];
    if (pDiff !== 0) return pDiff;
    return a.fireAt - b.fireAt;
  });

  const accepted: PlannedNotification[] = [];
  const COLLISION_WINDOW_MS = 30 * 60 * 1000;

  for (const candidate of sortedByPriority) {
    const hasCollision = accepted.some(
      existing => Math.abs(existing.fireAt - candidate.fireAt) < COLLISION_WINDOW_MS
    );
    if (!hasCollision) {
      accepted.push(candidate);
    }
  }

  // 6. SORT CHRONOLOGICALLY AND ENFORCE 60 NOTIFICATION HARD CAP
  accepted.sort((a, b) => a.fireAt - b.fireAt);

  if (accepted.length > 60) {
    return accepted.slice(0, 60);
  }

  return accepted;
}
