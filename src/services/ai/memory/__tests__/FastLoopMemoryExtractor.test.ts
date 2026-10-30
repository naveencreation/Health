import { FastLoopMemoryExtractor } from '../FastLoopMemoryExtractor';
import { RiaUserFacts } from '../../types/ai.types';

describe('FastLoopMemoryExtractor (Deterministic Fast-Loop Memory)', () => {
  it('extracts vegetarian dietary pattern', () => {
    const text = "I am strictly vegetarian, so please don't suggest any chicken or fish.";
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.dietaryPattern).toBe('vegetarian');
    expect(result.newlyDiscovered).toContain('Dietary pattern: Vegetarian');
  });

  it('extracts vegan dietary pattern', () => {
    const text = "I'm a vegan and I only eat plant-based whole foods.";
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.dietaryPattern).toBe('vegan');
    expect(result.newlyDiscovered).toContain('Dietary pattern: Vegan');
  });

  it('extracts jain dietary pattern (no onion no garlic)', () => {
    const text = 'I eat food with no onions and no garlic because I am jain.';
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.dietaryPattern).toBe('jain');
    expect(result.newlyDiscovered).toContain('Dietary pattern: Jain');
  });

  it('extracts keto dietary pattern', () => {
    const text = "I'm currently following the keto diet for fat loss.";
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.dietaryPattern).toBe('keto');
    expect(result.newlyDiscovered).toContain('Dietary pattern: Keto');
  });

  it('extracts specific allergies and intolerances', () => {
    const text = 'Just so you know, I am lactose intolerant and have a severe peanut allergy.';
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.allergies).toContain('lactose');
    expect(result.updatedFacts.allergies).toContain('peanuts');
    expect(result.newlyDiscovered.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts dynamic allergies from natural speech', () => {
    const text = "I'm allergic to strawberries and can't eat shellfish.";
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.allergies).toContain('shellfish');
    expect(result.updatedFacts.allergies).toContain('strawberries');
  });

  it('extracts food dislikes without polluting allergies', () => {
    const text = 'I really hate bitter gourd and I dislike mushrooms in curry.';
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.dislikes).toContain('bitter gourd');
    expect(result.updatedFacts.dislikes).toContain('mushrooms in curry');
  });

  it('extracts intermittent fasting protocol and custom window start', () => {
    const text = 'I do 16:8 intermittent fasting, fasting until 1:30 PM every day.';
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.fastingProtocol?.active).toBe(true);
    expect(result.updatedFacts.fastingProtocol?.type).toBe('16:8');
    expect(result.updatedFacts.fastingProtocol?.windowStart).toBe('1:30 PM');
  });

  it('extracts workout timing habits', () => {
    const text = 'I always go to the morning gym before work.';
    const result = FastLoopMemoryExtractor.extractFactsFromText(text);

    expect(result.updatedFacts.workoutTiming).toBe('morning');
    expect(result.newlyDiscovered).toContain('Workout timing: Morning');
  });

  it('merges new facts with existing facts without duplicates', () => {
    const existing: RiaUserFacts = {
      dietaryPattern: 'vegetarian',
      allergies: ['lactose'],
      dislikes: ['eggplant'],
    };

    const text = 'I also found out I am allergic to peanuts, and I hate bitter gourd.';
    const result = FastLoopMemoryExtractor.extractFactsFromText(text, existing);

    expect(result.updatedFacts.dietaryPattern).toBe('vegetarian');
    expect(result.updatedFacts.allergies).toEqual(['lactose', 'peanuts']);
    expect(result.updatedFacts.dislikes).toEqual(['eggplant', 'bitter gourd']);
  });
});
