import { FoodItem } from './index';

export interface NormalizedFoodItem {
  id: string; // Barcode number (e.g. '012345678901')
  name: string;
  brand?: string;
  imageUrl?: string;
  servingSize?: string;
  servingSizeGrams?: number;
  caloriesPer100g: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  sodiumGrams?: number;
  sugarGrams?: number;
  source: 'barcode';
  isEstimated?: boolean;
  estimatedCategory?: string;
}

export type BarcodeScanErrorType =
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'INVALID_BARCODE';

export interface BarcodeScanResult {
  success: boolean;
  data?: NormalizedFoodItem;
  error?: BarcodeScanErrorType;
  message?: string;
}

/** Grams in one serving; 100 g when the label gives no gram weight. Nutrients are stored per 100 g. */
export function servingGrams(item: NormalizedFoodItem): number {
  return item.servingSizeGrams && item.servingSizeGrams > 0 ? item.servingSizeGrams : 100;
}

/**
 * Converts a scanned product into a FoodItem whose values are for ONE serving (TD-H19).
 */
export function normalizedFoodToFoodItem(item: NormalizedFoodItem): FoodItem {
  const factor = servingGrams(item) / 100;
  const per = (per100g: number) => Math.round(per100g * factor * 10) / 10;
  return {
    id: `barcode_${item.id}`,
    name: item.brand ? `${item.name} (${item.brand})` : item.name,
    category: 'snacks',
    categoryLabel: 'Packaged Food',
    // Without a gram weight the serving is 100 g, so a label like "1 cup" would mislead
    servingUnit: item.servingSizeGrams ? item.servingSize || `${item.servingSizeGrams} g` : '100 g',
    defaultServingSize: 1,
    calories: Math.round(item.caloriesPer100g * factor),
    protein: per(item.proteinGrams),
    carbs: per(item.carbsGrams),
    fat: per(item.fatGrams),
    fiber: per(item.fiberGrams || 0),
    imageUrl: item.imageUrl,
    icon: '🏷️',
    isCustom: true,
    description: item.brand ? `Brand: ${item.brand} • UPC: ${item.id}` : `UPC: ${item.id}`,
  };
}
