import { NormalizedFoodItem, normalizedFoodToFoodItem, servingGrams } from '../barcode';

const base: NormalizedFoodItem = {
  id: '123',
  name: 'Crackers',
  caloriesPer100g: 500,
  proteinGrams: 10,
  carbsGrams: 60,
  fatGrams: 25,
  source: 'barcode',
};

describe('normalizedFoodToFoodItem (TD-H19)', () => {
  it('scales per-100 g values to one labelled serving', () => {
    const food = normalizedFoodToFoodItem({ ...base, servingSize: '30 g', servingSizeGrams: 30 });
    expect(food.calories).toBe(150);
    expect(food.protein).toBe(3);
    expect(food.carbs).toBe(18);
    expect(food.fat).toBe(7.5);
    expect(food.servingUnit).toBe('30 g');
  });

  it('falls back to a 100 g serving when the label has no gram weight', () => {
    const food = normalizedFoodToFoodItem({ ...base, servingSize: '1 cup' });
    expect(servingGrams({ ...base, servingSize: '1 cup' })).toBe(100);
    expect(food.calories).toBe(500);
    expect(food.servingUnit).toBe('100 g');
  });
});
