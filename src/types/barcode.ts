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

/**
 * Converts a NormalizedFoodItem from barcode scan into Calorify's internal FoodItem model
 */
export function normalizedFoodToFoodItem(item: NormalizedFoodItem): FoodItem {
  return {
    id: `barcode_${item.id}`,
    name: item.brand ? `${item.name} (${item.brand})` : item.name,
    category: 'snacks',
    categoryLabel: 'Packaged Food',
    servingUnit: item.servingSize || 'serving (100g)',
    defaultServingSize: 1,
    calories: Math.round(item.caloriesPer100g),
    protein: Math.round(item.proteinGrams * 10) / 10,
    carbs: Math.round(item.carbsGrams * 10) / 10,
    fat: Math.round(item.fatGrams * 10) / 10,
    fiber: Math.round((item.fiberGrams || 0) * 10) / 10,
    imageUrl: item.imageUrl,
    icon: '🏷️',
    isCustom: true,
    description: item.brand ? `Brand: ${item.brand} • UPC: ${item.id}` : `UPC: ${item.id}`,
  };
}
