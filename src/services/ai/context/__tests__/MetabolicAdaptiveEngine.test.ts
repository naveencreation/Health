import { MetabolicAdaptiveEngine } from '../MetabolicAdaptiveEngine';
import { DailyLog, UserGoals } from '@/types';

describe('MetabolicAdaptiveEngine (Slow-Loop Empirical Energy Balance)', () => {
  const mockUserGoals: Partial<UserGoals> = {
    dailyCalorieBudget: 1800,
    currentWeightKg: 80,
    heightCm: 175,
    age: 30,
    gender: 'male',
  };

  it('calculates standard Mifflin-St Jeor TDEE with activity multiplier', () => {
    // Male: 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75 BMR
    // Moderate activity (1.35x): 1748.75 * 1.35 = ~2361 kcal
    const tdee = MetabolicAdaptiveEngine.calculateStandardTdee(mockUserGoals);
    expect(tdee).toBeGreaterThanOrEqual(2300);
    expect(tdee).toBeLessThanOrEqual(2450);
  });

  it('returns preliminary confidence when logged days are insufficient (< 4 days)', () => {
    const logs: DailyLog[] = [
      {
        date: '2026-10-01',
        meals: [{ id: '1', foodId: 'f1', name: 'Meal', mealType: 'lunch', servingUnit: 'plate', quantity: 1, calories: 600, protein: 30, carbs: 50, fat: 15, fiber: 5, loggedAt: '2026-10-01T12:00:00Z' }],
        waterMl: 2000,
        steps: 8000,
        activities: [],
      },
    ];

    const result = MetabolicAdaptiveEngine.analyzeMetabolism(logs, mockUserGoals);
    expect(result.confidence).toBe('preliminary');
    expect(result.status).toBe('maintenance');
  });

  it('calculates empirical observed TDEE from 7-day caloric intake and weight loss', () => {
    // 7 days eating ~1800 kcal/day
    // Weight goes from 80.0 kg on Day 1 to 79.5 kg on Day 7 (-0.5 kg)
    // 0.5 kg loss * 7700 kcal / 7 days = 550 kcal/day empirical deficit
    // Observed TDEE = 1800 + 550 = 2350 kcal/day
    const logs: DailyLog[] = [];
    for (let i = 1; i <= 7; i++) {
      const dayStr = `2026-10-0${i}`;
      logs.push({
        date: dayStr,
        meals: [
          { id: `m_${i}`, foodId: 'f1', name: 'Meal', mealType: 'lunch', servingUnit: 'plate', quantity: 1, calories: 1800, protein: 120, carbs: 180, fat: 50, fiber: 25, loggedAt: `${dayStr}T12:00:00Z` },
        ],
        waterMl: 2500,
        steps: 8000,
        activities: [],
        weightKg: i === 1 ? 80.0 : i === 7 ? 79.5 : 79.8,
      });
    }

    const result = MetabolicAdaptiveEngine.analyzeMetabolism(logs, mockUserGoals);

    expect(result.confidence).toBe('moderate');
    expect(result.observedTdee).toBeGreaterThanOrEqual(2300);
    expect(result.observedTdee).toBeLessThanOrEqual(2460);
    expect(result.status).toBe('healthy_progress');
  });

  it('detects a metabolic plateau when weight stalls over 7+ logged days at deficit', () => {
    // 8 days eating 1700 kcal, weight completely flat at 80.0 kg
    const logs: DailyLog[] = [];
    for (let i = 1; i <= 8; i++) {
      const dayStr = `2026-10-0${i}`;
      logs.push({
        date: dayStr,
        meals: [
          { id: `m_${i}`, foodId: 'f1', name: 'Meal', mealType: 'lunch', servingUnit: 'plate', quantity: 1, calories: 1700, protein: 120, carbs: 160, fat: 50, fiber: 25, loggedAt: `${dayStr}T12:00:00Z` },
        ],
        waterMl: 2500,
        steps: 7000,
        activities: [],
        weightKg: 80.0,
      });
    }

    const result = MetabolicAdaptiveEngine.analyzeMetabolism(logs, mockUserGoals);

    expect(result.status).toBe('plateau');
    expect(result.recommendedCalorieBudget).toBe(1800 - 120); // 1680 kcal
    expect(result.recommendationReason).toContain('Metabolic plateau detected');
  });

  it('detects rapid loss (>1.2% bodyweight/week) and proposes caloric protection', () => {
    // 70kg user drops 1.4kg in 7 days (2% body mass)
    const femaleGoals: Partial<UserGoals> = {
      currentWeightKg: 70,
      dailyCalorieBudget: 1400,
      heightCm: 165,
      age: 26,
      gender: 'female',
    };

    const logs: DailyLog[] = [];
    for (let i = 1; i <= 7; i++) {
      const dayStr = `2026-10-0${i}`;
      logs.push({
        date: dayStr,
        meals: [
          { id: `m_${i}`, foodId: 'f1', name: 'Meal', mealType: 'lunch', servingUnit: 'plate', quantity: 1, calories: 1250, protein: 90, carbs: 120, fat: 35, fiber: 20, loggedAt: `${dayStr}T12:00:00Z` },
        ],
        waterMl: 2000,
        steps: 10000,
        activities: [],
        weightKg: i === 1 ? 70.0 : i === 7 ? 68.6 : 69.3,
      });
    }

    const result = MetabolicAdaptiveEngine.analyzeMetabolism(logs, femaleGoals);

    expect(result.status).toBe('rapid_loss');
    expect(result.recommendedCalorieBudget).toBe(1400 + 180); // 1580 kcal
    expect(result.recommendationReason).toContain('Weight is dropping faster than 1.2%/week');
  });

  it('respects clinical safety floor (1200 kcal for female) during plateaus', () => {
    const femaleFloorGoals: Partial<UserGoals> = {
      currentWeightKg: 58,
      dailyCalorieBudget: 1250,
      heightCm: 160,
      age: 32,
      gender: 'female',
    };

    const logs: DailyLog[] = [];
    for (let i = 1; i <= 8; i++) {
      const dayStr = `2026-10-0${i}`;
      logs.push({
        date: dayStr,
        meals: [
          { id: `m_${i}`, foodId: 'f1', name: 'Meal', mealType: 'lunch', servingUnit: 'plate', quantity: 1, calories: 1250, protein: 80, carbs: 120, fat: 30, fiber: 20, loggedAt: `${dayStr}T12:00:00Z` },
        ],
        waterMl: 2000,
        steps: 6000,
        activities: [],
        weightKg: 58.0,
      });
    }

    const result = MetabolicAdaptiveEngine.analyzeMetabolism(logs, femaleFloorGoals);

    expect(result.status).toBe('plateau');
    // Math.max(1200, 1250 - 120) = Math.max(1200, 1130) = 1200 kcal floor!
    expect(result.recommendedCalorieBudget).toBe(1200);
    expect(result.recommendationReason).toContain('clinical safety floor (1200 kcal)');
  });
});
