import { BarcodeScanResult, NormalizedFoodItem } from '@/types/barcode';

const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const USER_AGENT = 'CalorifyApp - Android - Version 1.0 - contact@calorify.app';
const TIMEOUT_MS = 10000;

export class BarcodeService {
  /**
   * Fetches and normalizes packaged food nutrition from Open Food Facts API
   */
  static async fetchProductByBarcode(barcode: string): Promise<BarcodeScanResult> {
    const cleanedBarcode = barcode?.trim();

    if (!cleanedBarcode || cleanedBarcode.length < 4) {
      return {
        success: false,
        error: 'INVALID_BARCODE',
        message: 'Invalid barcode format. Please re-align the scanner.',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${OPEN_FOOD_FACTS_BASE_URL}/${encodeURIComponent(cleanedBarcode)}.json`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Product not found in Open Food Facts database.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: `Open Food Facts service returned status ${response.status}`,
        };
      }

      const json = await response.json();

      if (!json || json.status !== 1 || !json.product) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Product details are unavailable for this barcode.',
        };
      }

      const product = json.product;
      const normalized = this.normalizeProductData(cleanedBarcode, product);

      return {
        success: true,
        data: normalized,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: 'Request timed out while contacting Open Food Facts.',
        };
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: err.message || 'Unable to connect to food database.',
      };
    }
  }

  /**
   * Normalizes raw Open Food Facts payload into a typed NormalizedFoodItem
   */
  private static normalizeProductData(barcode: string, product: any): NormalizedFoodItem {
    // 1. Resolve product name
    const rawName =
      product.product_name ||
      product.product_name_en ||
      product.generic_name ||
      product.generic_name_en ||
      '';

    const name = rawName.trim() || 'Unknown Packaged Food';

    // 2. Resolve brand name
    const rawBrand = product.brands || product.brand_owner || '';
    const brand = rawBrand.trim() ? rawBrand.split(',')[0].trim() : undefined;

    // 3. Resolve product image
    const rawImage =
      product.image_front_url ||
      product.image_front_small_url ||
      product.image_url ||
      product.image_small_url ||
      undefined;

    const imageUrl =
      typeof rawImage === 'string' && rawImage.startsWith('http') ? rawImage : undefined;

    // 4. Resolve serving size and parsed grams
    const rawServing = product.serving_size || product.serving_quantity || undefined;
    const servingSize = typeof rawServing === 'string' ? rawServing.trim() : undefined;
    const servingSizeGrams = this.parseServingGrams(servingSize);

    // 5. Nutriments parsing with fallback cascading
    const nutriments = product.nutriments || {};

    // Calories (kcal)
    let calories = this.parseNumeric(nutriments['energy-kcal_100g']);
    if (calories === 0) {
      calories = this.parseNumeric(nutriments['energy-kcal']);
    }
    if (calories === 0 && nutriments['energy_100g']) {
      // Convert kJ to kcal (1 kcal = 4.184 kJ)
      calories = Math.round(this.parseNumeric(nutriments['energy_100g']) / 4.184);
    }

    let protein = this.parseNumeric(nutriments['proteins_100g'] ?? nutriments['proteins']);
    let carbs = this.parseNumeric(
      nutriments['carbohydrates_100g'] ?? nutriments['carbohydrates']
    );
    let fat = this.parseNumeric(nutriments['fat_100g'] ?? nutriments['fat']);
    let fiber = this.parseNumeric(nutriments['fiber_100g'] ?? nutriments['fiber']);
    let sodium = this.parseNumeric(nutriments['sodium_100g'] ?? nutriments['sodium'], 3);
    let sugar = this.parseNumeric(nutriments['sugars_100g'] ?? nutriments['sugars']);

    // 6. Smart Fallback Estimation if nutrition facts are missing upstream in Open Food Facts
    let isEstimated = false;
    let estimatedCategory: string | undefined;

    const isAllZero = calories === 0 && protein === 0 && carbs === 0 && fat === 0;
    if (isAllZero) {
      const estimate = this.estimateNutrition(
        name,
        product.categories,
        product.categories_tags,
        product.generic_name
      );

      if (estimate) {
        calories = estimate.calories;
        protein = estimate.protein;
        carbs = estimate.carbs;
        fat = estimate.fat;
        fiber = estimate.fiber ?? 0;
        sugar = estimate.sugar ?? 0;
        isEstimated = true;
        estimatedCategory = estimate.category;
      } else {
        // Tag as estimated/unverified so UI warns user to input values
        isEstimated = true;
      }
    }

    return {
      id: barcode,
      name,
      brand,
      imageUrl,
      servingSize,
      servingSizeGrams: servingSizeGrams || undefined,
      caloriesPer100g: calories,
      proteinGrams: protein,
      carbsGrams: carbs,
      fatGrams: fat,
      fiberGrams: fiber > 0 ? fiber : undefined,
      sodiumGrams: sodium > 0 ? sodium : undefined,
      sugarGrams: sugar > 0 ? sugar : undefined,
      source: 'barcode',
      isEstimated,
      estimatedCategory,
    };
  }

  private static parseNumeric(val: any, decimals: number = 1): number {
    if (val === null || val === undefined) return 0;
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num) || num < 0) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  private static parseServingGrams(servingStr?: string): number | null {
    if (!servingStr) return null;
    const match = servingStr.match(/(\d+(?:\.\d+)?)\s*(?:g|ml|gram)/i);
    if (match && match[1]) {
      const g = parseFloat(match[1]);
      return isNaN(g) || g <= 0 ? null : g;
    }
    return null;
  }

  /**
   * Estimates nutrition for common packaged foods when Open Food Facts lacks nutrition tables
   */
  private static estimateNutrition(
    name: string,
    categories?: string,
    categoriesTags?: string[],
    genericName?: string
  ): { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; category: string } | null {
    const combined = `${name} ${categories || ''} ${(categoriesTags || []).join(' ')} ${genericName || ''}`.toLowerCase();

    // 1. Dairy & Fermented Beverages
    if (/buttermilk|chaas|sambharam|mor\b/i.test(combined)) {
      return { calories: 28, protein: 1.8, carbs: 2.5, fat: 1.2, category: 'Spiced Buttermilk' };
    }
    if (/lassi/i.test(combined)) {
      return { calories: 85, protein: 2.8, carbs: 14.0, fat: 2.2, sugar: 12.0, category: 'Lassi' };
    }
    if (/greek\s*yogurt/i.test(combined)) {
      return { calories: 95, protein: 8.0, carbs: 6.0, fat: 4.0, category: 'Greek Yogurt' };
    }
    if (/curd|dahi|yogurt|yoghurt/i.test(combined)) {
      return { calories: 60, protein: 3.5, carbs: 4.5, fat: 3.0, category: 'Curd / Yogurt' };
    }
    if (/toned\s*milk|cow\s*milk|milk/i.test(combined)) {
      return { calories: 60, protein: 3.2, carbs: 4.8, fat: 3.5, category: 'Milk' };
    }
    if (/paneer|cottage\s*cheese/i.test(combined)) {
      return { calories: 265, protein: 18.0, carbs: 3.5, fat: 20.0, category: 'Paneer' };
    }
    if (/cheese/i.test(combined)) {
      return { calories: 310, protein: 20.0, carbs: 2.0, fat: 25.0, category: 'Cheese' };
    }
    if (/butter\b/i.test(combined)) {
      return { calories: 717, protein: 0.8, carbs: 0.1, fat: 81.0, category: 'Butter' };
    }
    if (/ghee/i.test(combined)) {
      return { calories: 900, protein: 0, carbs: 0, fat: 99.5, category: 'Ghee' };
    }

    // 2. Snacks, Chips & Namkeen
    if (/chip|crisp|wafer|nacho/i.test(combined)) {
      return { calories: 540, protein: 6.5, carbs: 52.0, fat: 34.0, fiber: 4.0, category: 'Chips & Crisps' };
    }
    if (/bhujia|sev\b|namkeen|mixture|murukku|snack/i.test(combined)) {
      return { calories: 560, protein: 11.0, carbs: 42.0, fat: 38.0, fiber: 4.5, category: 'Namkeen' };
    }
    if (/biscuit|cookie|cracker|rusk|toast/i.test(combined)) {
      return { calories: 460, protein: 6.5, carbs: 68.0, fat: 18.0, sugar: 22.0, category: 'Biscuits & Cookies' };
    }

    // 3. Instant Foods & Grains
    if (/noodle|maggi|ramen/i.test(combined)) {
      return { calories: 430, protein: 8.5, carbs: 62.0, fat: 16.0, fiber: 3.0, category: 'Instant Noodles' };
    }
    if (/pasta|macaroni/i.test(combined)) {
      return { calories: 350, protein: 12.0, carbs: 72.0, fat: 1.5, fiber: 3.5, category: 'Pasta' };
    }
    if (/oat|oatmeal|muesli|granola/i.test(combined)) {
      return { calories: 389, protein: 13.0, carbs: 66.0, fat: 6.9, fiber: 10.0, category: 'Oats & Cereals' };
    }
    if (/corn\s*flakes|cereal/i.test(combined)) {
      return { calories: 370, protein: 7.0, carbs: 84.0, fat: 0.8, sugar: 8.0, category: 'Breakfast Cereal' };
    }
    if (/bread|bun\b|pav\b/i.test(combined)) {
      return { calories: 260, protein: 9.0, carbs: 48.0, fat: 3.0, fiber: 2.5, category: 'Bread' };
    }

    // 4. Sweets & Confectionery
    if (/dark\s*chocolate/i.test(combined)) {
      return { calories: 550, protein: 8.0, carbs: 35.0, fat: 40.0, fiber: 8.0, category: 'Dark Chocolate' };
    }
    if (/chocolate|candy|sweet/i.test(combined)) {
      return { calories: 535, protein: 7.5, carbs: 58.0, fat: 30.0, sugar: 50.0, category: 'Chocolate' };
    }
    if (/ice\s*cream|kulfi/i.test(combined)) {
      return { calories: 207, protein: 3.5, carbs: 24.0, fat: 11.0, sugar: 21.0, category: 'Ice Cream' };
    }

    // 5. Beverages
    if (/juice|nectar/i.test(combined)) {
      return { calories: 48, protein: 0.5, carbs: 11.5, fat: 0.1, sugar: 10.0, category: 'Fruit Juice' };
    }
    if (/cola|soda|carbonated|soft\s*drink/i.test(combined)) {
      return { calories: 42, protein: 0, carbs: 10.6, fat: 0, sugar: 10.6, category: 'Soft Drink' };
    }
    if (/energy\s*drink/i.test(combined)) {
      return { calories: 45, protein: 0.4, carbs: 11.0, fat: 0, sugar: 10.5, category: 'Energy Drink' };
    }

    // 6. Fitness & Spreads
    if (/protein\s*bar/i.test(combined)) {
      return { calories: 380, protein: 30.0, carbs: 35.0, fat: 12.0, fiber: 8.0, category: 'Protein Bar' };
    }
    if (/peanut\s*butter/i.test(combined)) {
      return { calories: 588, protein: 25.0, carbs: 20.0, fat: 50.0, category: 'Peanut Butter' };
    }

    return null;
  }
}
