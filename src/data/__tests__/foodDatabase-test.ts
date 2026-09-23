import { getFoodDescription, INITIAL_FOOD_DATABASE } from '../foodDatabase';

describe('getFoodDescription', () => {
  test('returns a default description for null/undefined items', () => {
    expect(getFoodDescription(null)).toContain('delicious');
    expect(getFoodDescription(undefined)).toContain('nutrient-packed');
  });

  test('returns an explicit description when present', () => {
    const item = { name: 'Paneer Butter Masala', description: 'Creamy tomato gravy.' };
    expect(getFoodDescription(item)).toBe('Creamy tomato gravy.');
  });

  test('falls back to keyword descriptions for common foods', () => {
    expect(getFoodDescription({ name: 'Steamed Idli' })).toContain('fermented');
    expect(getFoodDescription({ name: 'Chicken Biryani' })).toContain('basmati');
  });

  test('falls back to macro-based descriptions', () => {
    expect(getFoodDescription({ name: 'Protein Dish', protein: 15 })).toContain('15g of protein');
    expect(getFoodDescription({ name: 'Carb Dish', carbs: 25 })).toContain('25g of carbs');
  });

  test('returns a generic description as a last resort', () => {
    expect(getFoodDescription({ name: 'Mystery Food', protein: 1, carbs: 1 })).toContain(
      'wholesome'
    );
  });

  test('catalog contains a healthy number of foods', () => {
    expect(INITIAL_FOOD_DATABASE.length).toBeGreaterThan(50);
  });
});
