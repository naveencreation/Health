import { NutritionContextBuilder } from '../NutritionContextBuilder';
import { UserNutritionContext } from '../../types/ai.types';
import { DailyLog, UserGoals } from '@/types';

describe('NutritionContextBuilder', () => {
  const mockCurrentLog: DailyLog = {
    date: '2026-10-06',
    meals: [
      {
        id: 'm1',
        foodId: 'f1',
        name: 'Masala Oats with Milk',
        calories: 320,
        protein: 14,
        carbs: 45,
        fat: 8,
        fiber: 5,
        mealType: 'breakfast',
        loggedAt: '08:30 AM',
        servingUnit: 'bowl',
        quantity: 1,
      },
      {
        id: 'm2',
        foodId: 'f2',
        name: 'Grilled Paneer Salad',
        calories: 450,
        protein: 26,
        carbs: 18,
        fat: 22,
        fiber: 12,
        mealType: 'lunch',
        loggedAt: '01:15 PM',
        servingUnit: 'g',
        quantity: 200,
      },
      {
        id: 'm3',
        foodId: 'f3',
        name: 'Roasted Almonds',
        calories: 160,
        protein: 6,
        carbs: 6,
        fat: 14,
        fiber: 5,
        mealType: 'snacks',
        loggedAt: '04:45 PM',
        servingUnit: 'handful',
        quantity: 1,
      },
    ],
    waterMl: 1750,
    steps: 7200,
    activities: [],
    fiberG: 22,
  };

  const mockUserGoals: UserGoals = {
    name: 'Ananya Sharma',
    dailyCalorieBudget: 1800,
    targetProtein: 110,
    targetCarbs: 190,
    targetFat: 55,
    targetFiber: 28,
    waterGoalMl: 2500,
    stepGoal: 10000,
    currentWeightKg: 64.5,
    targetWeightKg: 58.0,
    startWeightKg: 68.0,
    heightCm: 162,
    age: 26,
    gender: 'female',
    riaTone: 'supportive',
    struggles: ['late_snacking', 'portions', 'protein'],
    foodStyle: 'vegetarian',
    skipsBreakfast: false,
    snacks: true,
    goal: 'Weight Loss',
    pace: 'steady',
    streakDays: 14,
  };

  describe('sanitizeText', () => {
    it('handles null, undefined, empty, and non-string values', () => {
      expect(NutritionContextBuilder.sanitizeText(null as any)).toBe('');
      expect(NutritionContextBuilder.sanitizeText(undefined)).toBe('');
      expect(NutritionContextBuilder.sanitizeText('')).toBe('');
      expect(NutritionContextBuilder.sanitizeText(123 as any)).toBe('');
    });

    it('strips newlines and XML angle brackets', () => {
      const malicious = '<script>alert("hack")</script>\nLine 2\rLine 3';
      const clean = NutritionContextBuilder.sanitizeText(malicious);
      expect(clean).toBe('scriptalert("hack")/script Line 2 Line 3');
      expect(clean).not.toContain('<');
      expect(clean).not.toContain('>');
      expect(clean).not.toContain('\n');
    });

    it('caps length at maxLen', () => {
      const longText = 'A'.repeat(100);
      expect(NutritionContextBuilder.sanitizeText(longText, 25)).toHaveLength(25);
    });
  });

  describe('translateStruggle', () => {
    it('maps known struggle keys to coaching topics', () => {
      expect(NutritionContextBuilder.translateStruggle('portions')).toBe(
        'Portion control & plate distribution'
      );
      expect(NutritionContextBuilder.translateStruggle('late_snacking')).toBe(
        'Late-night snacking & post-dinner cravings'
      );
      expect(NutritionContextBuilder.translateStruggle('eating_out')).toBe(
        'Dining out & social gatherings'
      );
      expect(NutritionContextBuilder.translateStruggle('consistency')).toBe(
        'Weekend consistency & habit tracking'
      );
      expect(NutritionContextBuilder.translateStruggle('protein')).toBe(
        'Hitting daily protein target with whole foods'
      );
      expect(NutritionContextBuilder.translateStruggle('home_cooked')).toBe(
        'Estimating calories in home-cooked meals'
      );
      expect(NutritionContextBuilder.translateStruggle('not_sure')).toBe(
        'General nutrition literacy & balance'
      );
    });

    it('replaces underscores in unlisted keys', () => {
      expect(NutritionContextBuilder.translateStruggle('sugar_craving')).toBe('sugar craving');
    });
  });

  describe('translateFoodStyle', () => {
    it('translates dietary preferences to descriptive labels', () => {
      expect(NutritionContextBuilder.translateFoodStyle('vegetarian')).toBe(
        'Vegetarian (Lacto/Ovo-Lacto)'
      );
      expect(NutritionContextBuilder.translateFoodStyle('eggetarian')).toBe(
        'Eggetarian (Vegetarian + Eggs)'
      );
      expect(NutritionContextBuilder.translateFoodStyle('non_veg')).toBe(
        'Non-Vegetarian (Poultry, Fish, Meat)'
      );
      expect(NutritionContextBuilder.translateFoodStyle('vegan')).toBe('Vegan (100% Plant-Based)');
      expect(NutritionContextBuilder.translateFoodStyle('no_preference')).toBe(
        'Omnivore / No dietary restrictions'
      );
      expect(NutritionContextBuilder.translateFoodStyle(undefined)).toBe(
        'Omnivore / No preference'
      );
      expect(NutritionContextBuilder.translateFoodStyle('keto')).toBe('keto');
    });
  });

  describe('translateGoalPace', () => {
    it('translates pace levels accurately', () => {
      expect(NutritionContextBuilder.translateGoalPace('steady')).toBe(
        'Steady (~0.5 kg / week deficit)'
      );
      expect(NutritionContextBuilder.translateGoalPace('moderate')).toBe(
        'Moderate (~0.25 kg / week deficit)'
      );
      expect(NutritionContextBuilder.translateGoalPace('aggressive')).toBe(
        'Challenging (~0.75 kg / week deficit)'
      );
      expect(NutritionContextBuilder.translateGoalPace(undefined)).toBe('Steady');
      expect(NutritionContextBuilder.translateGoalPace('relaxed')).toBe('relaxed');
    });
  });

  describe('createContext', () => {
    it('calculates totals, remaining calories, deficit status, deltas, and percentages correctly', () => {
      const context = NutritionContextBuilder.createContext({
        userGoals: mockUserGoals,
        currentLog: mockCurrentLog,
      });

      // Calorie calculations: 320 + 450 + 160 = 930 consumed
      expect(context.dailyCalorieBudget).toBe(1800);
      expect(context.consumedCalories).toBe(930);
      expect(context.remainingCalories).toBe(870);
      expect(context.calorieStatus).toBe('deficit');
      expect(context.calorieDeficitOrSurplus).toBe(870);

      // Macros: 14 + 26 + 6 = 46g P; 45 + 18 + 6 = 69g C; 8 + 22 + 14 = 44g F
      expect(context.targetProtein).toBe(110);
      expect(context.consumedProtein).toBe(46);
      expect(context.targetCarbs).toBe(190);
      expect(context.consumedCarbs).toBe(69);
      expect(context.targetFat).toBe(55);
      expect(context.consumedFat).toBe(44);
      expect(context.consumedFiber).toBe(22);

      // Hydration: 2500 - 1750 = 750 ml delta, 70%
      expect(context.targetWaterMl).toBe(2500);
      expect(context.consumedWaterMl).toBe(1750);
      expect(context.waterDeltaMl).toBe(750);
      expect(context.waterPercent).toBe(70);

      // Movement: 10000 - 7200 = 2800 step delta, 72%
      expect(context.stepGoal).toBe(10000);
      expect(context.currentSteps).toBe(7200);
      expect(context.stepDelta).toBe(2800);
      expect(context.stepPercent).toBe(72);

      // Weight delta: 64.5 - 58.0 = 6.5 kg to lose
      expect(context.currentWeightKg).toBe(64.5);
      expect(context.targetWeightKg).toBe(58.0);
      expect(context.weightDeltaToGoalKg).toBe(6.5);

      // Profile & safety
      expect(context.name).toBe('Ananya');
      expect(context.isMinor).toBe(false);
      expect(context.riaTone).toBe('supportive');
      expect(context.struggles).toEqual(['late_snacking', 'portions', 'protein']);
      expect(context.loggedMealsToday).toHaveLength(3);
      expect(context.loggedMealsToday[0].name).toBe('Masala Oats with Milk');
      expect(context.loggedMealsToday[0].quantity).toBe(1);
      expect(context.loggedMealsToday[0].unit).toBe('bowl');
    });

    it('identifies surplus and on_track calorie status', () => {
      // Surplus: consumed > budget + 50
      const surplusCtx = NutritionContextBuilder.createContext({
        userGoals: { dailyCalorieBudget: 1500 },
        currentLog: { ...mockCurrentLog, meals: [] },
        totalCalories: 1600,
        remainingCalories: -100,
      });
      expect(surplusCtx.calorieStatus).toBe('surplus');

      // On track: remaining within -50 to 100
      const onTrackCtx = NutritionContextBuilder.createContext({
        userGoals: { dailyCalorieBudget: 1500 },
        currentLog: { ...mockCurrentLog, meals: [] },
        totalCalories: 1450,
        remainingCalories: 50,
      });
      expect(onTrackCtx.calorieStatus).toBe('on_track');
    });

    it('identifies minor users correctly (ages 13 to 17 inclusive)', () => {
      const minor13 = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, age: 13 },
        currentLog: mockCurrentLog,
      });
      expect(minor13.isMinor).toBe(true);

      const minor17 = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, age: 17 },
        currentLog: mockCurrentLog,
      });
      expect(minor17.isMinor).toBe(true);

      const adult18 = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, age: 18 },
        currentLog: mockCurrentLog,
      });
      expect(adult18.isMinor).toBe(false);

      const child12 = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, age: 12 },
        currentLog: mockCurrentLog,
      });
      expect(child12.isMinor).toBe(false);

      const noAge = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, age: undefined },
        currentLog: mockCurrentLog,
      });
      expect(noAge.isMinor).toBe(false);
    });

    it('passes through Pro rolling memory summary when provided', () => {
      const ctx = NutritionContextBuilder.createContext({
        userGoals: mockUserGoals,
        currentLog: mockCurrentLog,
        memorySummary: 'User prefers high protein vegetarian breakfasts and trains in the evening.',
      });
      expect(ctx.memorySummary).toBe(
        'User prefers high protein vegetarian breakfasts and trains in the evening.'
      );
    });

    it('gracefully handles empty logs and missing user goal fields', () => {
      const emptyLog: DailyLog = { date: '2026-10-06', meals: [], waterMl: 0, steps: 0, activities: [] };
      const emptyGoals: Partial<UserGoals> = {};

      const ctx = NutritionContextBuilder.createContext({
        userGoals: emptyGoals,
        currentLog: emptyLog,
      });

      expect(ctx.name).toBe('Friend');
      expect(ctx.dailyCalorieBudget).toBe(2000);
      expect(ctx.consumedCalories).toBe(0);
      expect(ctx.remainingCalories).toBe(2000);
      expect(ctx.targetProtein).toBe(120);
      expect(ctx.consumedProtein).toBe(0);
      expect(ctx.targetWaterMl).toBe(2500);
      expect(ctx.waterPercent).toBe(0);
      expect(ctx.stepGoal).toBe(10000);
      expect(ctx.stepPercent).toBe(0);
      expect(ctx.isMinor).toBe(false);
      expect(ctx.loggedMealsToday).toEqual([]);
    });
  });

  describe('Section Builders', () => {
    let context: UserNutritionContext;

    beforeEach(() => {
      context = NutritionContextBuilder.createContext({
        userGoals: mockUserGoals,
        currentLog: mockCurrentLog,
        memorySummary: 'Prefers intermittent fasting on weekends.',
      });
    });

    it('buildNutritionSnapshot produces accurate macro and budget lines', () => {
      const snapshot = NutritionContextBuilder.buildNutritionSnapshot(context);

      expect(snapshot).toContain('<nutrition_snapshot>');
      expect(snapshot).toContain('• Daily Budget: 1800 kcal');
      expect(snapshot).toContain('• Consumed Today: 930 kcal');
      expect(snapshot).toContain('• Remaining Today: 870 kcal (870 kcal deficit buffer remaining)');
      expect(snapshot).toContain('• Protein Target: 46g / 110g');
      expect(snapshot).toContain('• Carbs Target: 69g / 190g');
      expect(snapshot).toContain('• Fat Target: 44g / 55g');
      expect(snapshot).toContain('• Fiber: 22g / 28g target');
      expect(snapshot).toContain('</nutrition_snapshot>');
    });

    it('buildRecentMealsSection groups meals by slot with item macros', () => {
      const mealsSection = NutritionContextBuilder.buildRecentMealsSection(context);

      expect(mealsSection).toContain('<recent_meals_today>');
      expect(mealsSection).toContain('[Breakfast] (320 kcal, 14g P):');
      expect(mealsSection).toContain('• Masala Oats with Milk, 1 bowl (~320 kcal, 14g P, 45g C, 8g F) at 08:30 AM');
      expect(mealsSection).toContain('[Lunch] (450 kcal, 26g P):');
      expect(mealsSection).toContain('• Grilled Paneer Salad, 200 g (~450 kcal, 26g P, 18g C, 22g F) at 01:15 PM');
      expect(mealsSection).toContain('[Snacks] (160 kcal, 6g P):');
      expect(mealsSection).toContain('• Roasted Almonds, 1 handful (~160 kcal, 6g P, 6g C, 14g F) at 04:45 PM');
      expect(mealsSection).toContain('</recent_meals_today>');
    });

    it('buildRecentMealsSection handles empty meals list', () => {
      const emptyMealsCtx = { ...context, loggedMealsToday: [] };
      const output = NutritionContextBuilder.buildRecentMealsSection(emptyMealsCtx);
      expect(output).toContain('No meals logged yet today.');
    });

    it('buildStrugglesAndDietarySection translates struggles and preferences', () => {
      const strugglesSection = NutritionContextBuilder.buildStrugglesAndDietarySection(context);

      expect(strugglesSection).toContain('<dietary_profile_and_struggles>');
      expect(strugglesSection).toContain('• Food Style / Diet: Vegetarian (Lacto/Ovo-Lacto)');
      expect(strugglesSection).toContain('• Late-night snacking & post-dinner cravings');
      expect(strugglesSection).toContain('• Portion control & plate distribution');
      expect(strugglesSection).toContain('• Hitting daily protein target with whole foods');
      expect(strugglesSection).toContain('• Skips Breakfast: No');
      expect(strugglesSection).toContain('</dietary_profile_and_struggles>');
    });

    it('buildGoalAndPaceSection outputs goal, pace, and weight delta to lose/gain', () => {
      const goalSection = NutritionContextBuilder.buildGoalAndPaceSection(context);

      expect(goalSection).toContain('<goal_plan_and_pace>');
      expect(goalSection).toContain('• Primary Goal: Weight Loss');
      expect(goalSection).toContain('• Target Rate / Pace: Steady (~0.5 kg / week deficit)');
      expect(goalSection).toContain('• Current Weight: 64.5 kg (Target: 58.0 kg) • 6.5 kg to lose');
      expect(goalSection).toContain('• Height: 162 cm');
      expect(goalSection).toContain('• Streak: 14 consecutive days logged');
      expect(goalSection).toContain('</goal_plan_and_pace>');
    });

    it('buildGoalAndPaceSection handles weight gain delta and at-target states', () => {
      // Gain state
      const gainCtx = { ...context, currentWeightKg: 55.0, targetWeightKg: 60.0, weightDeltaToGoalKg: -5.0 };
      expect(NutritionContextBuilder.buildGoalAndPaceSection(gainCtx)).toContain('5.0 kg to gain');

      // At target state
      const atTargetCtx = { ...context, currentWeightKg: 60.0, targetWeightKg: 60.0, weightDeltaToGoalKg: 0 };
      expect(NutritionContextBuilder.buildGoalAndPaceSection(atTargetCtx)).toContain('At target weight!');
    });

    it('buildHydrationAndMovementSection shows deltas and percentages', () => {
      const section = NutritionContextBuilder.buildHydrationAndMovementSection(context);

      expect(section).toContain('<hydration_and_movement>');
      expect(section).toContain('• Water Intake: 1750 / 2500 ml (70% achieved, 750 ml remaining)');
      expect(section).toContain('• Step Activity: 7,200 / 10,000 steps (72% achieved, 2,800 steps remaining)');
      expect(section).toContain('</hydration_and_movement>');
    });

    it('buildHydrationAndMovementSection shows Goal reached when exceeded', () => {
      const exceededCtx = {
        ...context,
        consumedWaterMl: 3000,
        waterDeltaMl: -500,
        currentSteps: 12000,
        stepDelta: -2000,
      };
      const section = NutritionContextBuilder.buildHydrationAndMovementSection(exceededCtx);

      expect(section).toContain('Goal reached!');
    });
  });

  describe('buildSystemInstruction', () => {
    it('generates complete instruction containing all XML blocks and safety rules', () => {
      const context = NutritionContextBuilder.createContext({
        userGoals: mockUserGoals,
        currentLog: mockCurrentLog,
        memorySummary: 'User loves south indian food.',
      });

      const instruction = NutritionContextBuilder.buildSystemInstruction(context);

      // Role and Persona
      expect(instruction).toContain('You are Ria, the personal AI food and wellness coach');
      expect(instruction).toContain('SUPPORTIVE coaching tone');
      expect(instruction).toContain('Default reply MUST be concise and mobile-friendly, under ~80 words');

      // Clinical safety floors
      expect(instruction).toContain('Calorie Safety Floor: Never recommend or validate a daily intake below 1,200 kcal/day for females or 1,500 kcal/day for males');
      expect(instruction).toContain('Disordered Eating');
      expect(instruction).toContain('Medical Scope: Never prescribe medications');

      // XML Boundaries and Prompt Injection Defense
      expect(instruction).toContain('=== INJECTION DEFENSE & UNTRUSTED DATA BOUNDARY ===');
      expect(instruction).toContain('<user_profile>');
      expect(instruction).toContain('<nutrition_snapshot>');
      expect(instruction).toContain('<recent_meals_today>');
      expect(instruction).toContain('<dietary_profile_and_struggles>');
      expect(instruction).toContain('<goal_plan_and_pace>');
      expect(instruction).toContain('<hydration_and_movement>');
      expect(instruction).toContain('<pro_memory_summary>');
      expect(instruction).toContain('User loves south indian food.');
    });

    it('omits pro_memory_summary block when no memorySummary is provided', () => {
      const context = NutritionContextBuilder.createContext({
        userGoals: mockUserGoals,
        currentLog: mockCurrentLog,
      });

      const instruction = NutritionContextBuilder.buildSystemInstruction(context);
      expect(instruction).not.toContain('<pro_memory_summary>');
    });

    it('injects minor clinical directive for teenage users (ages 13 to 17)', () => {
      const minorContext = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, age: 16 },
        currentLog: mockCurrentLog,
      });

      const instruction = NutritionContextBuilder.buildSystemInstruction(minorContext);
      expect(instruction).toContain('CLINICAL DIRECTIVE (MINOR / AGE 13-17): The user is under 18 (16 years old)');
      expect(instruction).toContain('Strictly maintain-only and growth-supportive nutrition');
      expect(instruction).toContain('FORBIDDEN: Any weight-loss encouragement');
    });

    it('omits minor directive for adult users', () => {
      const adultContext = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, age: 24 },
        currentLog: mockCurrentLog,
      });

      const instruction = NutritionContextBuilder.buildSystemInstruction(adultContext);
      expect(instruction).not.toContain('CLINICAL DIRECTIVE (MINOR');
    });

    it('adapts tone instructions for focused and scientific modes', () => {
      const focusedCtx = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, riaTone: 'focused' },
        currentLog: mockCurrentLog,
      });
      const focusedPrompt = NutritionContextBuilder.buildSystemInstruction(focusedCtx);
      expect(focusedPrompt).toContain('Focused & Direct Tone: Clear accountability');

      const scientificCtx = NutritionContextBuilder.createContext({
        userGoals: { ...mockUserGoals, riaTone: 'scientific' },
        currentLog: mockCurrentLog,
      });
      const scientificPrompt = NutritionContextBuilder.buildSystemInstruction(scientificCtx);
      expect(scientificPrompt).toContain('Nutritional Scientist Tone: Deep analytical focus');
    });
  });
});
