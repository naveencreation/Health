import { RiaCardParser, resolveContextualMealSlot } from '../RiaCardParser';
import { DailyLog, UserGoals } from '@/types';

describe('RiaCardParser (Deterministic Gates & Spec-Driven UI)', () => {
  const baseNow = 1700000000000;

  describe('resolveContextualMealSlot', () => {
    it('resolves breakfast in the morning (08:30)', () => {
      const morning = new Date('2026-10-31T08:30:00').getTime();
      expect(resolveContextualMealSlot(morning)).toBe('breakfast');
    });

    it('resolves lunch in early afternoon (13:15)', () => {
      const afternoon = new Date('2026-10-31T13:15:00').getTime();
      expect(resolveContextualMealSlot(afternoon)).toBe('lunch');
    });

    it('resolves snack in late afternoon (17:30)', () => {
      const teaTime = new Date('2026-10-31T17:30:00').getTime();
      expect(resolveContextualMealSlot(teaTime)).toBe('snack');
    });

    it('resolves dinner at night (20:45)', () => {
      const night = new Date('2026-10-31T20:45:00').getTime();
      expect(resolveContextualMealSlot(night)).toBe('dinner');
    });
  });

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
            loggedAt: new Date(baseNow - 3 * 60 * 1000).toISOString(),
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

  describe('visual_macro_split & plate_distribution (Spec-Driven Generative UI)', () => {
    it('parses visual_macro_split and applies thermodynamic checks', () => {
      const raw = `Here is your current macro split:
\`\`\`ria_action
{
  "type": "visual_macro_split",
  "title": "Daily Macronutrient Split",
  "proteinGrams": 140,
  "carbsGrams": 200,
  "fatGrams": 50,
  "totalKcal": 2500,
  "insight": "Protein is on target for lean mass retention."
}
\`\`\``;

      // 140*4 + 200*4 + 50*9 = 560 + 800 + 450 = 1810 kcal (reported 2500 is >15% off, should correct)
      const result = RiaCardParser.parseMessage(raw, undefined, undefined, baseNow);

      expect(result.card?.type).toBe('visual_macro_split');
      if (result.card?.type === 'visual_macro_split') {
        expect(result.card.data.title).toBe('Daily Macronutrient Split');
        expect(result.card.data.proteinGrams).toBe(140);
        expect(result.card.data.carbsGrams).toBe(200);
        expect(result.card.data.fatGrams).toBe(50);
        expect(result.card.data.totalKcal).toBe(1810);
      }
    });

    it('parses plate_distribution and normalizes quadrant percentages to 100%', () => {
      const raw = `Here is your ideal plate proportion:
\`\`\`ria_action
{
  "type": "plate_distribution",
  "mealName": "Post-Workout Nourish Bowl",
  "proteinPct": 30,
  "carbsPct": 40,
  "veggiesPct": 30,
  "fatsPct": 20,
  "totalKcal": 620,
  "balanceScore": 92,
  "recommendation": "Great complex carbohydrate to protein balance."
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, undefined, undefined, baseNow);

      expect(result.card?.type).toBe('plate_distribution');
      if (result.card?.type === 'plate_distribution') {
        expect(result.card.data.mealName).toBe('Post-Workout Nourish Bowl');
        const sum =
          result.card.data.proteinPct +
          result.card.data.carbsPct +
          result.card.data.veggiesPct +
          result.card.data.fatsPct;
        expect(sum).toBe(100);
        expect(result.card.data.balanceScore).toBe(92);
      }
    });
  });

  describe('clinical floors and gates', () => {
    it('rejects plan proposals below clinical safety floor (1200 kcal for female)', () => {
      const userGoals: Partial<UserGoals> = {
        gender: 'female',
        dailyCalorieBudget: 1500,
      };

      const raw = `\`\`\`ria_action
{
  "type": "propose_plan_change",
  "calories": 900,
  "protein": 80,
  "carbs": 90,
  "fat": 25,
  "reason": "Extreme crash diet"
}
\`\`\``;

      const result = RiaCardParser.parseMessage(raw, undefined, userGoals);
      expect(result.card).toBeUndefined();
    });
  });
});
