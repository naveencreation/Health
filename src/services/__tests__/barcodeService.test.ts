import { BarcodeService } from '../barcodeService';

describe('BarcodeService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('fetchProductByBarcode', () => {
    it('returns error for empty or invalid length barcode', async () => {
      const emptyResult = await BarcodeService.fetchProductByBarcode('');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toBe('INVALID_BARCODE');

      const shortResult = await BarcodeService.fetchProductByBarcode('123');
      expect(shortResult.success).toBe(false);
      expect(shortResult.error).toBe('INVALID_BARCODE');
    });

    it('successfully fetches and normalizes product data from Open Food Facts', async () => {
      const mockApiResponse = {
        status: 1,
        code: '8901030383748',
        product: {
          product_name: 'Greek Yogurt Plain',
          brands: 'Epigamia',
          serving_size: '100 g',
          image_url: 'https://images.openfoodfacts.org/yogurt.jpg',
          nutriments: {
            'energy-kcal': 85,
            proteins: 6,
            carbohydrates: 7.5,
            fat: 3.2,
            fiber: 1.2,
            sodium: 0.04,
            sugars: 4.5,
          },
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });

      const result = await BarcodeService.fetchProductByBarcode('8901030383748');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v2/product/8901030383748.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('CalorifyApp'),
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Greek Yogurt Plain');
      expect(result.data?.brand).toBe('Epigamia');
      expect(result.data?.id).toBe('8901030383748');
      expect(result.data?.servingSize).toBe('100 g');
      expect(result.data?.servingSizeGrams).toBe(100);
      expect(result.data?.caloriesPer100g).toBe(85);
      expect(result.data?.proteinGrams).toBe(6);
      expect(result.data?.carbsGrams).toBe(7.5);
      expect(result.data?.fatGrams).toBe(3.2);
      expect(result.data?.fiberGrams).toBe(1.2);
      expect(result.data?.sodiumGrams).toBe(0.04);
      expect(result.data?.sugarGrams).toBe(4.5);
      expect(result.data?.imageUrl).toBe('https://images.openfoodfacts.org/yogurt.jpg');
    });

    it('falls back to 100g nutriments when serving nutriments are not present', async () => {
      const mockApiResponse = {
        status: 1,
        code: '7622210449283',
        product: {
          product_name: 'Dark Chocolate 70%',
          nutriments: {
            'energy-kcal_100g': 570,
            proteins_100g: 8.5,
            carbohydrates_100g: 34,
            fat_100g: 42,
          },
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });

      const result = await BarcodeService.fetchProductByBarcode('7622210449283');

      expect(result.success).toBe(true);
      expect(result.data?.caloriesPer100g).toBe(570);
      expect(result.data?.proteinGrams).toBe(8.5);
      expect(result.data?.carbsGrams).toBe(34);
      expect(result.data?.fatGrams).toBe(42);
    });

    it('converts kJ to kcal if kcal is missing', async () => {
      const mockApiResponse = {
        status: 1,
        code: '1234567890',
        product: {
          product_name: 'Sparkling Energy',
          nutriments: {
            energy_100g: 418.4, // ~100 kcal
            proteins_100g: 0,
            carbohydrates_100g: 25,
            fat_100g: 0,
          },
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });

      const result = await BarcodeService.fetchProductByBarcode('1234567890');

      expect(result.success).toBe(true);
      expect(result.data?.caloriesPer100g).toBe(100);
    });

    it('handles status 0 (product not found)', async () => {
      const mockApiResponse = {
        status: 0,
        code: '9999999999999',
        status_verbose: 'product not found',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });

      const result = await BarcodeService.fetchProductByBarcode('9999999999999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NOT_FOUND');
      expect(result.message).toContain('Product details are unavailable');
    });

    it('handles 404 HTTP response status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await BarcodeService.fetchProductByBarcode('12345678');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NOT_FOUND');
      expect(result.message).toContain('Product not found in Open Food Facts database');
    });

    it('handles network failure or timeout', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));

      const result = await BarcodeService.fetchProductByBarcode('8901030383748');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NETWORK_ERROR');
      expect(result.message).toContain('Network request failed');
    });

    it('estimates nutrition from category when Open Food Facts has missing or all-zero nutriments', async () => {
      const mockApiResponse = {
        status: 1,
        code: '8904057396784',
        product: {
          product_name: 'Spiced Buttermilk',
          brands: 'Hatsun',
          categories: 'en:buttermilks',
          serving_size: '200 ml',
          nutriments: {}, // Open Food Facts has no nutrition data uploaded
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });

      const result = await BarcodeService.fetchProductByBarcode('8904057396784');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Spiced Buttermilk');
      expect(result.data?.brand).toBe('Hatsun');
      expect(result.data?.isEstimated).toBe(true);
      expect(result.data?.estimatedCategory).toBe('Spiced Buttermilk');
      expect(result.data?.caloriesPer100g).toBe(28);
      expect(result.data?.proteinGrams).toBe(1.8);
      expect(result.data?.carbsGrams).toBe(2.5);
      expect(result.data?.fatGrams).toBe(1.2);
    });

    it('flags isEstimated as true when product nutriments are missing and category is unknown', async () => {
      const mockApiResponse = {
        status: 1,
        code: '9991234567890',
        product: {
          product_name: 'Unknown Raw Mineral',
          brands: 'ObscureBrand',
          nutriments: {},
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });

      const result = await BarcodeService.fetchProductByBarcode('9991234567890');

      expect(result.success).toBe(true);
      expect(result.data?.isEstimated).toBe(true);
      expect(result.data?.caloriesPer100g).toBe(0);
    });
  });
});
