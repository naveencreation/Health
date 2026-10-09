import { getFoodImageSource, LOCAL_FOOD_IMAGES } from '../foodImages';

describe('foodImages - getFoodImageSource', () => {
  describe('Direct ID & Custom Image Resolution', () => {
    it('resolves directly by exact canonical ID', () => {
      const src = getFoodImageSource({ id: 'chapati', name: 'Random Text' });
      expect(src).toBe(LOCAL_FOOD_IMAGES.chapati);
    });

    it('resolves legacy alias IDs correctly', () => {
      const src1 = getFoodImageSource({ id: 'roti_chapati' });
      expect(src1).toBe(LOCAL_FOOD_IMAGES.chapati);

      const src2 = getFoodImageSource({ id: 'idli_steamed' });
      expect(src2).toBe(LOCAL_FOOD_IMAGES.idli);

      const src3 = getFoodImageSource({ id: 'raw_almonds' });
      expect(src3).toBe(LOCAL_FOOD_IMAGES.almonds);
    });

    it('prioritizes user custom image URL over name matching', () => {
      const customUrl = 'https://example.com/my-food.jpg';
      const src = getFoodImageSource({ name: 'apple', imageUrl: customUrl });
      expect(src).toEqual({ uri: customUrl });
    });

    it('handles numeric or object image sources passed via imageUrl', () => {
      const customObj = { uri: 'file:///photo.jpg', width: 100, height: 100 };
      const src = getFoodImageSource({ imageUrl: customObj as any });
      expect(src).toBe(customObj);
    });
  });

  describe('Word Boundary Substring Collision Prevention', () => {
    it('does NOT match "til" inside "lentil" or "tortilla"', () => {
      expect(getFoodImageSource({ name: 'Brown Lentil Soup' })).toBeUndefined();
      expect(getFoodImageSource({ name: 'Corn Tortilla' })).toBeUndefined();
      expect(getFoodImageSource({ name: 'Red Lentils' })).toBeUndefined();
    });

    it('does NOT match "pear" inside "pearl barley" or "spearmint tea"', () => {
      expect(getFoodImageSource({ name: 'Pearl Barley Salad' })).toBeUndefined();
      expect(getFoodImageSource({ name: 'Spearmint Tea' })).toBeUndefined();
    });

    it('does NOT match "grape" inside "grapefruit"', () => {
      expect(getFoodImageSource({ name: 'Pink Grapefruit' })).toBeUndefined();
      expect(getFoodImageSource({ name: 'Grapefruit Juice' })).toBeUndefined();
    });

    it('does NOT match "date" inside "update" or non-food words', () => {
      expect(getFoodImageSource({ name: 'Mandate Salad' })).toBeUndefined();
      expect(getFoodImageSource({ name: 'Update Special' })).toBeUndefined();
    });

    it('does NOT match "fig" inside "configuration" or "figment"', () => {
      expect(getFoodImageSource({ name: 'Configuration Meal' })).toBeUndefined();
    });

    it('matches "pineapple" as pineapple and NOT as apple', () => {
      const src = getFoodImageSource({ name: 'Fresh Pineapple Slice' });
      expect(src).toBe(LOCAL_FOOD_IMAGES.pineapple);
      expect(src).not.toBe(LOCAL_FOOD_IMAGES.apple);
    });
  });

  describe('True Positive Name Matches', () => {
    it('matches South Indian dishes', () => {
      expect(getFoodImageSource({ name: 'Hot Steamed Idli' })).toBe(LOCAL_FOOD_IMAGES.idli);
      expect(getFoodImageSource({ name: 'Crispy Plain Dosa' })).toBe(LOCAL_FOOD_IMAGES.dosa);
      expect(getFoodImageSource({ name: 'Onion Uttapam' })).toBe(LOCAL_FOOD_IMAGES.uttapam);
      expect(getFoodImageSource({ name: 'Rava Upma' })).toBe(LOCAL_FOOD_IMAGES.upma);
      expect(getFoodImageSource({ name: 'Ven Pongal' })).toBe(LOCAL_FOOD_IMAGES.pongal);
      expect(getFoodImageSource({ name: 'Curd Rice' })).toBe(LOCAL_FOOD_IMAGES.curd_rice);
      expect(getFoodImageSource({ name: 'Lemon Rice' })).toBe(LOCAL_FOOD_IMAGES.lemon_rice);
    });

    it('matches Breads & Rotis', () => {
      expect(getFoodImageSource({ name: 'Aloo Paratha with Butter' })).toBe(LOCAL_FOOD_IMAGES.aloo_paratha);
      expect(getFoodImageSource({ name: 'Malabar Parotta' })).toBe(LOCAL_FOOD_IMAGES.parotta);
      expect(getFoodImageSource({ name: 'Roti with Dal' })).toBe(LOCAL_FOOD_IMAGES.roti_with_dal);
      expect(getFoodImageSource({ name: 'Bread Omelette' })).toBe(LOCAL_FOOD_IMAGES.bread_omelette);
      expect(getFoodImageSource({ name: 'Chole Bhature' })).toBe(LOCAL_FOOD_IMAGES.chole_bhature);
      expect(getFoodImageSource({ name: 'Wheat Phulka' })).toBe(LOCAL_FOOD_IMAGES.chapati);
      expect(getFoodImageSource({ name: 'Chapati' })).toBe(LOCAL_FOOD_IMAGES.chapati);
    });

    it('matches Rice & Curries', () => {
      expect(getFoodImageSource({ name: 'Hyderabadi Chicken Biryani' })).toBe(LOCAL_FOOD_IMAGES.chicken_biryani);
      expect(getFoodImageSource({ name: 'Paneer Butter Masala' })).toBe(LOCAL_FOOD_IMAGES.paneer_butter_masala);
      expect(getFoodImageSource({ name: 'Spicy Chicken Curry' })).toBe(LOCAL_FOOD_IMAGES.chicken_curry);
      expect(getFoodImageSource({ name: 'South Veg Thali' })).toBe(LOCAL_FOOD_IMAGES.veg_thali);
      expect(getFoodImageSource({ name: 'Vegetable Fried Rice' })).toBe(LOCAL_FOOD_IMAGES.vegetable_fried_rice);
      expect(getFoodImageSource({ name: 'Moong Dal Khichdi' })).toBe(LOCAL_FOOD_IMAGES.khichdi);
    });

    it('matches Fruits and Dry Fruits with Hindi / alternate names', () => {
      expect(getFoodImageSource({ name: 'Green Grapes' })).toBe(LOCAL_FOOD_IMAGES.green_grapes);
      expect(getFoodImageSource({ name: 'Anar Seeds' })).toBe(LOCAL_FOOD_IMAGES.pomegranate);
      expect(getFoodImageSource({ name: 'Sweet Lime Juice' })).toBe(LOCAL_FOOD_IMAGES.sweet_lime);
      expect(getFoodImageSource({ name: 'Chikoo Shake' })).toBe(LOCAL_FOOD_IMAGES.sapota);
      expect(getFoodImageSource({ name: 'Til Ladoo' })).toBe(LOCAL_FOOD_IMAGES.sesame_seeds);
      expect(getFoodImageSource({ name: 'Roasted Badam' })).toBe(LOCAL_FOOD_IMAGES.almonds);
      expect(getFoodImageSource({ name: 'Kaju Katli' })).toBe(LOCAL_FOOD_IMAGES.cashews);
      expect(getFoodImageSource({ name: 'Medjool Dates' })).toBe(LOCAL_FOOD_IMAGES.dates);
      expect(getFoodImageSource({ name: 'Dried Anjeer' })).toBe(LOCAL_FOOD_IMAGES.dried_figs);
      expect(getFoodImageSource({ name: 'Golden Raisins' })).toBe(LOCAL_FOOD_IMAGES.raisins);
    });
  });

  describe('Edge cases and fallbacks', () => {
    it('returns undefined for empty, null, or undefined input', () => {
      expect(getFoodImageSource(null)).toBeUndefined();
      expect(getFoodImageSource(undefined)).toBeUndefined();
      expect(getFoodImageSource({})).toBeUndefined();
      expect(getFoodImageSource({ name: '' })).toBeUndefined();
      expect(getFoodImageSource({ name: '   ' })).toBeUndefined();
    });

    it('returns undefined for unrepresented dishes so fallback vector badge is shown', () => {
      expect(getFoodImageSource({ name: 'Kimchi Jjigae' })).toBeUndefined();
      expect(getFoodImageSource({ name: 'Miso Ramen' })).toBeUndefined();
      expect(getFoodImageSource({ name: 'Tacos Al Pastor' })).toBeUndefined();
    });
  });
});
