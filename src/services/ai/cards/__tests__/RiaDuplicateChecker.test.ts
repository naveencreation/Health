import { RiaDuplicateChecker } from '../RiaDuplicateChecker';

describe('RiaDuplicateChecker', () => {
  const baseNow = 1700000000000; // Fixed timestamp in ms

  it('detects an exact duplicate meal logged within 10 minutes', () => {
    const recentMeals = [
      {
        id: 'meal_1',
        name: 'Masala Dosa',
        mealType: 'breakfast',
        loggedAt: new Date(baseNow - 4 * 60 * 1000).toISOString(), // 4 mins ago
      },
    ];

    const result = RiaDuplicateChecker.check('Masala Dosa', recentMeals, 'breakfast', baseNow);

    expect(result.isDuplicate).toBe(true);
    expect(result.minutesAgo).toBe(4);
    expect(result.matchedMealName).toBe('Masala Dosa');
  });

  it('normalizes case, punctuation, and whitespace for duplicate detection', () => {
    const recentMeals = [
      {
        id: 'meal_1',
        name: 'Paneer Butter Masala!',
        mealType: 'lunch',
        loggedAt: new Date(baseNow - 2 * 60 * 1000).toISOString(),
      },
    ];

    const result = RiaDuplicateChecker.check('paneer butter masala', recentMeals, 'lunch', baseNow);

    expect(result.isDuplicate).toBe(true);
    expect(result.minutesAgo).toBe(2);
  });

  it('does not flag duplicates logged outside the 10-minute threshold', () => {
    const recentMeals = [
      {
        id: 'meal_1',
        name: 'Idli Sambar',
        mealType: 'breakfast',
        loggedAt: new Date(baseNow - 15 * 60 * 1000).toISOString(), // 15 mins ago
      },
    ];

    const result = RiaDuplicateChecker.check('Idli Sambar', recentMeals, 'breakfast', baseNow);

    expect(result.isDuplicate).toBe(false);
  });

  it('does not flag duplicate if the slot does not match', () => {
    const recentMeals = [
      {
        id: 'meal_1',
        name: 'Filter Coffee',
        mealType: 'breakfast',
        loggedAt: new Date(baseNow - 3 * 60 * 1000).toISOString(),
      },
    ];

    // Same food name but proposed for dinner
    const result = RiaDuplicateChecker.check('Filter Coffee', recentMeals, 'dinner', baseNow);

    expect(result.isDuplicate).toBe(false);
  });

  it('matches plural and singular slot variations (snack vs snacks)', () => {
    const recentMeals = [
      {
        id: 'meal_1',
        name: 'Almonds and Walnuts',
        mealType: 'snacks',
        loggedAt: new Date(baseNow - 5 * 60 * 1000).toISOString(),
      },
    ];

    const result = RiaDuplicateChecker.check('Almonds and Walnuts', recentMeals, 'snack', baseNow);

    expect(result.isDuplicate).toBe(true);
    expect(result.minutesAgo).toBe(5);
  });

  it('handles numeric epoch timestamps and custom thresholdMinutes', () => {
    const recentMeals = [
      {
        id: 'meal_1',
        name: 'Curd Rice',
        mealType: 'lunch',
        time: baseNow - 8 * 60 * 1000, // 8 mins ago
      },
    ];

    // Within default 10 minutes
    const res1 = RiaDuplicateChecker.check('Curd Rice', recentMeals, 'lunch', baseNow, 10);
    expect(res1.isDuplicate).toBe(true);

    // Outside stricter 5 minutes threshold
    const res2 = RiaDuplicateChecker.check('Curd Rice', recentMeals, 'lunch', baseNow, 5);
    expect(res2.isDuplicate).toBe(false);
  });

  it('gracefully handles empty inputs or missing timestamps', () => {
    expect(RiaDuplicateChecker.check('', [], 'lunch').isDuplicate).toBe(false);
    expect(RiaDuplicateChecker.check('Apple', [], 'breakfast').isDuplicate).toBe(false);
    expect(
      RiaDuplicateChecker.check('Apple', [{ name: 'Apple' }], 'breakfast', baseNow).isDuplicate
    ).toBe(false);
  });
});
