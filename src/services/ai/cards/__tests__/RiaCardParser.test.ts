import { RiaCardParser } from '../RiaCardParser';
import { DailyLog, UserGoals } from '@/types';

describe('RiaCardParser', () => {
  const baseNow = 1700000000000;

  describe('propose_meal_log', () => {
    it('parses a valid propose_meal_log action block and strips it from clean text', () => {
      const raw = `I've prepared your lunch log with 2 idlis and sambar.

\`\`\`ria_action
{
  "type": "propose_meal_log",
  "slot": "lunch",
  "items": [
    { "name": "Steamed Idli", "qty": 2, "unit": "pieces", "kcal": 130, "protein": 4, "carbs": 26, "fat": 1 },
    { "name": "Vegetable Sambar", "qty": 1, "unit": "katori", "kcal": 120, "protein": 5, "carbs": 18, "fat": 3 }
  ],
  "assumption": "Standard homemade sambar (150 ml)"
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, undefined, undefined, baseNow);

      expect(result.cleanText).toBe("I've prepared your lunch log with 2 idlis and sambar.");
      expect(result.card).toBeDefined();
      expect(result.card?.type).toBe('meal');

      if (result.card?.type === 'meal') {
        expect(result.card.data.slot).toBe('lunch');
        expect(result.card.data.items).toHaveLength(2);
        expect(result.card.data.items[0].name).toBe('Steamed Idli');
        expect(result.card.data.items[0].qty).toBe(2);
        expect(result.card.data.assumption).toBe('Standard homemade sambar (150 ml)');
      }
    });

    it('enforces Atwater thermodynamic consistency if reported calories diverge', () => {
      // 10P + 20C + 5F = 40 + 80 + 45 = 165 kcal.
      // Reported kcal: 300 kcal (> 25% discrepancy)
      const raw = `Here is the nutritional breakdown.
\`\`\`ria_action
{
  "type": "propose_meal_log",
  "slot": "breakfast",
  "items": [
    { "name": "Protein Bar", "qty": 1, "unit": "bar", "kcal": 300, "protein": 10, "carbs": 20, "fat": 5 }
  ]
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, undefined, undefined, baseNow);

      expect(result.card?.type).toBe('meal');
      if (result.card?.type === 'meal') {
        // Corrected to thermodynamic sum (165 kcal)
        expect(result.card.data.items[0].kcal).toBe(165);
      }
    });

    it('detects 10-minute duplicate and sets duplicateWarning', () => {
      const currentLog: DailyLog = {
        date: '2026-10-06',
        meals: [
          {
            id: 'm1',
            foodId: 'f1',
            name: 'Poha',
            mealType: 'breakfast',
            servingUnit: 'plate',
            quantity: 1,
            calories: 220,
            protein: 4,
            carbs: 40,
            fat: 5,
            fiber: 2,
            loggedAt: new Date(baseNow - 3 * 60 * 1000).toISOString(), // 3 mins ago
          },
        ],
        waterMl: 0,
        steps: 0,
        activities: [],
      };

      const raw = `Adding your breakfast poha.
\`\`\`ria_action
{
  "type": "propose_meal_log",
  "slot": "breakfast",
  "items": [
    { "name": "Poha", "qty": 1, "unit": "plate", "kcal": 220, "protein": 4, "carbs": 40, "fat": 5 }
  ]
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, currentLog, undefined, baseNow);

      expect(result.card?.type).toBe('meal');
      if (result.card?.type === 'meal') {
        expect(result.card.data.duplicateWarning).toContain('You logged Poha 3m ago. Add again?');
      }
    });
  });

  describe('suggest_meals', () => {
    it('parses valid suggest_meals options', () => {
      const raw = `Here are two dinner ideas:
\`\`\`ria_action
{
  "type": "suggest_meals",
  "options": [
    { "name": "Grilled Paneer Salad", "kcal": 320, "protein": 22, "carbs": 12, "fat": 18, "portion": "1 bowl", "tag": "High Protein" },
    { "name": "Dal Tadka with 2 Phulkas", "kcal": 380, "protein": 14, "carbs": 60, "fat": 8, "portion": "1 set" }
  ]
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw);

      expect(result.cleanText).toBe('Here are two dinner ideas:');
      expect(result.card?.type).toBe('suggestion');
      if (result.card?.type === 'suggestion') {
        expect(result.card.data.options).toHaveLength(2);
        expect(result.card.data.options[0].name).toBe('Grilled Paneer Salad');
        expect(result.card.data.options[0].tag).toBe('High Protein');
      }
    });
  });

  describe('propose_water', () => {
    it('parses propose_water and clamps amount to safe range', () => {
      const raw = `Let's add a glass of water.
\`\`\`ria_action
{
  "type": "propose_water",
  "amountMl": 350
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw);

      expect(result.card?.type).toBe('water');
      if (result.card?.type === 'water') {
        expect(result.card.data.amountMl).toBe(350);
        expect(result.card.data.state).toBe('proposed');
      }
    });
  });

  describe('propose_weight', () => {
    it('parses weigh-in and computes delta and sanity warning if > 3 kg jump', () => {
      const userGoals: Partial<UserGoals> = {
        currentWeightKg: 70.0,
      };

      const raw = `Logging your new weigh-in.
\`\`\`ria_action
{
  "type": "propose_weight",
  "weightKg": 65.5
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, undefined, userGoals);

      expect(result.card?.type).toBe('weight');
      if (result.card?.type === 'weight') {
        expect(result.card.data.weightKg).toBe(65.5);
        expect(result.card.data.deltaKg).toBe(-4.5);
        expect(result.card.data.needsSanityConfirm).toBe(true);
      }
    });
  });

  describe('day_review', () => {
    it('builds day review card with actual totals from daily log and user goals', () => {
      const currentLog: DailyLog = {
        date: '2026-10-06',
        meals: [
          {
            id: 'm1',
            foodId: 'f1',
            name: 'Lunch',
            mealType: 'lunch',
            servingUnit: 'portion',
            quantity: 1,
            calories: 600,
            protein: 30,
            carbs: 70,
            fat: 20,
            fiber: 5,
            loggedAt: new Date().toISOString(),
          },
        ],
        waterMl: 1500,
        steps: 8000,
        activities: [],
      };

      const userGoals: Partial<UserGoals> = {
        dailyCalorieBudget: 1800,
        targetProtein: 100,
      };

      const raw = `Great job tracking today!
\`\`\`ria_action
{
  "type": "day_review",
  "win": "Hit 8,000 steps and consistent hydration.",
  "focus": "Add a protein source to dinner."
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, currentLog, userGoals);

      expect(result.card?.type).toBe('day_review');
      if (result.card?.type === 'day_review') {
        expect(result.card.data.caloriesConsumed).toBe(600);
        expect(result.card.data.calorieTarget).toBe(1800);
        expect(result.card.data.proteinConsumed).toBe(30);
        expect(result.card.data.win).toBe('Hit 8,000 steps and consistent hydration.');
      }
    });
  });

  describe('propose_plan_change (Clinical safety & minor protection)', () => {
    it('blocks plan changes for minors (age < 18)', () => {
      const userGoals: Partial<UserGoals> = {
        age: 16,
        gender: 'female',
        dailyCalorieBudget: 2000,
      };

      const raw = `\`\`\`ria_action
{
  "type": "propose_plan_change",
  "calories": 1700,
  "protein": 80,
  "carbs": 200,
  "fat": 50,
  "reason": "Cutting calories"
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, undefined, userGoals);

      // Minor protection: must reject plan change card completely
      expect(result.card).toBeUndefined();
    });

    it('rejects proposals below clinical safety floor (1200 kcal female)', () => {
      const userGoals: Partial<UserGoals> = {
        age: 26,
        gender: 'female',
        dailyCalorieBudget: 1500,
      };

      const raw = `\`\`\`ria_action
{
  "type": "propose_plan_change",
  "calories": 950,
  "protein": 70,
  "carbs": 90,
  "fat": 30,
  "reason": "Extreme cut"
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, undefined, userGoals);

      // Clinical floor violation: rejected completely
      expect(result.card).toBeUndefined();
    });

    it('caps proposed changes to a maximum 15% shift per adjustment', () => {
      const userGoals: Partial<UserGoals> = {
        age: 30,
        gender: 'female',
        dailyCalorieBudget: 2000,
        targetProtein: 120,
        targetCarbs: 220,
        targetFat: 65,
      };

      // 2000 kcal with 15% cap = 300 kcal max change.
      // Model proposes 1500 kcal (a 25% drop, above 1200 female floor).
      const raw = `\`\`\`ria_action
{
  "type": "propose_plan_change",
  "calories": 1500,
  "protein": 110,
  "carbs": 160,
  "fat": 50,
  "reason": "Aggressive deficit"
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, undefined, userGoals);

      expect(result.card?.type).toBe('plan_change');
      if (result.card?.type === 'plan_change') {
        // Clamped to 2000 - 15% (300) = 1700
        expect(result.card.data.calories).toBe(1700);
      }
    });
  });

  describe('error handling & fallback', () => {
    it('drops card and preserves text on malformed JSON', () => {
      const raw = `Here is your meal:
\`\`\`ria_action
{ "type": "propose_meal_log", "items": [ INVALID_JSON ...
\`\`\``;

      const result = RiaCardParser.parseMessage(raw);

      expect(result.cleanText).toBe('Here is your meal:');
      expect(result.card).toBeUndefined();
    });

    it('returns original text when no action blocks are present', () => {
      const raw = 'Drinking water before meals can support satiety and hydration.';
      const result = RiaCardParser.parseMessage(raw);

      expect(result.cleanText).toBe(raw);
      expect(result.card).toBeUndefined();
    });
  });
});
