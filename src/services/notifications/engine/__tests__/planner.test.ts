import { planNotifications, isInsideQuietHours } from '../planner';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../../defaults';
import { NotificationSettings } from '../../types';

describe('planNotifications Engine', () => {
  // Use a fixed reference time: 2026-10-10 06:00:00 (Saturday morning)
  const FIXED_NOW = new Date('2026-10-10T06:00:00');

  const baseSettings: NotificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    meals: {
      enabled: true,
      breakfast: '08:30',
      lunch: '13:00',
      dinner: '19:30',
      skipsBreakfast: false,
    },
    water: {
      enabled: true,
      intervalMinutes: 120,
    },
    steps: {
      enabled: true,
    },
    streak: {
      enabled: true,
    },
    quietHours: {
      start: '22:00',
      end: '07:00',
    },
  };

  it('drops lunch today if already logged, but schedules lunch tomorrow', () => {
    const planned = planNotifications({
      settings: baseSettings,
      now: FIXED_NOW,
      loggedMealsToday: ['lunch'],
      streakDays: 3,
    });

    const todayLunch = planned.find(p => p.id === 'calori_meal_lunch_2026-10-10');
    const tomorrowLunch = planned.find(p => p.id === 'calori_meal_lunch_2026-10-11');

    expect(todayLunch).toBeUndefined();
    expect(tomorrowLunch).toBeDefined();
    expect(tomorrowLunch?.type).toBe('meal_lunch');
  });

  it('never schedules breakfast when skipsBreakfast is true across horizon', () => {
    const settings: NotificationSettings = {
      ...baseSettings,
      meals: {
        ...baseSettings.meals,
        skipsBreakfast: true,
      },
    };

    const planned = planNotifications({
      settings,
      now: FIXED_NOW,
      streakDays: 3,
    });

    const breakfastReminders = planned.filter(p => p.type === 'meal_breakfast');
    expect(breakfastReminders.length).toBe(0);
  });

  it('schedules zero water today when water goal is met', () => {
    const planned = planNotifications({
      settings: baseSettings,
      now: FIXED_NOW,
      waterStats: {
        currentMl: 2500,
        targetMl: 2000,
      },
      streakDays: 3,
    });

    const todayWater = planned.filter(
      p => p.type === 'water' && p.id.includes('2026-10-10')
    );
    const tomorrowWater = planned.filter(
      p => p.type === 'water' && p.id.includes('2026-10-11')
    );

    expect(todayWater.length).toBe(0);
    expect(tomorrowWater.length).toBeGreaterThan(0);
  });

  it('handles quiet hours wraparound and drops meal times inside quiet hours', () => {
    // Quiet hours: 22:00 to 07:00
    // Breakfast set to 06:30 -> inside quiet hours -> should be dropped!
    const settings: NotificationSettings = {
      ...baseSettings,
      quietHours: {
        start: '22:00',
        end: '07:00',
      },
      meals: {
        ...baseSettings.meals,
        breakfast: '06:30', // falls in quiet hours
        lunch: '13:00',
        dinner: '22:30', // also falls in quiet hours
      },
    };

    const planned = planNotifications({
      settings,
      now: FIXED_NOW,
      streakDays: 3,
    });

    const breakfastReminders = planned.filter(p => p.type === 'meal_breakfast');
    const dinnerReminders = planned.filter(p => p.type === 'meal_dinner');
    const lunchReminders = planned.filter(p => p.type === 'meal_lunch');

    expect(breakfastReminders.length).toBe(0); // dropped due to quiet hours!
    expect(dinnerReminders.length).toBe(0); // dropped due to quiet hours!
    expect(lunchReminders.length).toBeGreaterThan(0); // kept
  });

  it('keeps higher priority notification on 30-min collision (streak > meal > steps > water)', () => {
    // Configure lunch at 13:00, and water check-ins that would produce 13:00 or 13:15
    const settings: NotificationSettings = {
      ...baseSettings,
      meals: {
        ...baseSettings.meals,
        lunch: '13:00',
      },
      water: {
        enabled: true,
        intervalMinutes: 60, // 09:00, 10:00, 11:00, 12:00, 13:00, 14:00...
      },
    };

    const planned = planNotifications({
      settings,
      now: FIXED_NOW,
      streakDays: 3,
    });

    const lunch = planned.find(p => p.id === 'calori_meal_lunch_2026-10-10');
    expect(lunch).toBeDefined();

    // Any water notification within 30 min of lunch (12:31 to 13:29) must be dropped
    const collidingWater = planned.filter(
      p =>
        p.type === 'water' &&
        Math.abs(p.fireAt - (lunch?.fireAt || 0)) < 30 * 60 * 1000
    );
    expect(collidingWater.length).toBe(0);
  });

  it('enforces 60 notification hard cap by keeping nearest notifications first', () => {
    // Generate lots of candidates
    const settings: NotificationSettings = {
      ...baseSettings,
      water: {
        enabled: true,
        intervalMinutes: 60,
      },
    };

    const planned = planNotifications({
      settings,
      now: FIXED_NOW,
      streakDays: 5,
    });

    expect(planned.length).toBeLessThanOrEqual(60);

    // Verify sorted ascending chronologically
    for (let i = 1; i < planned.length; i++) {
      expect(planned[i].fireAt).toBeGreaterThanOrEqual(planned[i - 1].fireAt);
    }
  });

  it('ensures 1h interval gives at most 8 water slots in a day', () => {
    const settings: NotificationSettings = {
      ...baseSettings,
      meals: {
        ...baseSettings.meals,
        enabled: false,
      },
      steps: { enabled: false },
      streak: { enabled: false },
      water: {
        enabled: true,
        intervalMinutes: 60,
      },
    };

    const planned = planNotifications({
      settings,
      now: FIXED_NOW,
    });

    const todayWater = planned.filter(
      p => p.type === 'water' && p.id.includes('2026-10-10')
    );
    expect(todayWater.length).toBeLessThanOrEqual(8);
  });

  it('delays water reminder if lastWaterLoggedAt is set recently', () => {
    // At 10:00, user logged water. Interval is 120 min (2h).
    // Next water reminder must not be before 12:00.
    const loggedAt = new Date('2026-10-10T10:00:00').getTime();

    const planned = planNotifications({
      settings: baseSettings,
      now: new Date('2026-10-10T10:15:00'),
      waterStats: {
        currentMl: 500,
        targetMl: 2500,
        lastLoggedAt: loggedAt,
      },
      streakDays: 2,
    });

    const todayWater = planned.filter(
      p => p.type === 'water' && p.id.includes('2026-10-10')
    );

    for (const waterNotif of todayWater) {
      expect(waterNotif.fireAt).toBeGreaterThanOrEqual(
        loggedAt + 120 * 60 * 1000
      );
    }
  });

  it('drops streak reminder today if user has already logged any meal', () => {
    const planned = planNotifications({
      settings: baseSettings,
      now: FIXED_NOW,
      loggedMealsToday: ['breakfast'],
      streakDays: 4,
    });

    const todayStreak = planned.find(p => p.id === 'calori_streak_2026-10-10');
    const tomorrowStreak = planned.find(p => p.id === 'calori_streak_2026-10-11');

    expect(todayStreak).toBeUndefined();
    expect(tomorrowStreak).toBeDefined();
  });

  it('does not schedule streak if streakDays is 0', () => {
    const planned = planNotifications({
      settings: baseSettings,
      now: FIXED_NOW,
      streakDays: 0,
    });

    const streakReminders = planned.filter(p => p.type === 'streak');
    expect(streakReminders.length).toBe(0);
  });

  it('schedules morning weigh-in when weight reminder is enabled and unlogged', () => {
    const settings: NotificationSettings = {
      ...baseSettings,
      weight: {
        enabled: true,
        time: '07:30',
      },
    };

    const planned = planNotifications({
      settings,
      now: FIXED_NOW,
      hasLoggedWeightToday: false,
    });

    const todayWeight = planned.find(p => p.id === 'calori_weight_2026-10-10');
    expect(todayWeight).toBeDefined();
    expect(todayWeight?.title).toBe('⚖️ Morning Weigh-In');
    expect(todayWeight?.data.route).toBe('weight');
  });

  it('suppresses today weigh-in if already logged today, but keeps tomorrow', () => {
    const settings: NotificationSettings = {
      ...baseSettings,
      weight: {
        enabled: true,
        time: '07:30',
      },
    };

    const planned = planNotifications({
      settings,
      now: FIXED_NOW,
      hasLoggedWeightToday: true,
    });

    const todayWeight = planned.find(p => p.id === 'calori_weight_2026-10-10');
    const tomorrowWeight = planned.find(p => p.id === 'calori_weight_2026-10-11');
    expect(todayWeight).toBeUndefined();
    expect(tomorrowWeight).toBeDefined();
  });

  it('customizes steps notification when daily step goal is already crushed', () => {
    const planned = planNotifications({
      settings: baseSettings,
      now: FIXED_NOW,
      stepStats: {
        currentSteps: 11200,
        targetSteps: 10000,
      },
    });

    const todaySteps = planned.find(p => p.id === 'calori_steps_2026-10-10');
    expect(todaySteps).toBeDefined();
    expect(todaySteps?.title).toBe('🎉 Step Goal Crushed!');
    expect(todaySteps?.body).toContain('hit your daily movement target');
  });

  describe('isInsideQuietHours helper', () => {
    it('accurately detects wraparound quiet hours', () => {
      // 22:00 to 07:00
      const d1 = new Date('2026-10-10T06:30:00'); // inside
      const d2 = new Date('2026-10-10T07:00:00'); // boundary (outside)
      const d3 = new Date('2026-10-10T12:00:00'); // outside
      const d4 = new Date('2026-10-10T22:00:00'); // boundary (inside)
      const d5 = new Date('2026-10-10T23:30:00'); // inside

      expect(isInsideQuietHours(d1, '22:00', '07:00')).toBe(true);
      expect(isInsideQuietHours(d2, '22:00', '07:00')).toBe(false);
      expect(isInsideQuietHours(d3, '22:00', '07:00')).toBe(false);
      expect(isInsideQuietHours(d4, '22:00', '07:00')).toBe(true);
      expect(isInsideQuietHours(d5, '22:00', '07:00')).toBe(true);
    });

    it('accurately detects daytime quiet hours', () => {
      // 01:00 to 06:00
      const d1 = new Date('2026-10-10T03:00:00'); // inside
      const d2 = new Date('2026-10-10T10:00:00'); // outside

      expect(isInsideQuietHours(d1, '01:00', '06:00')).toBe(true);
      expect(isInsideQuietHours(d2, '01:00', '06:00')).toBe(false);
    });
  });
});
