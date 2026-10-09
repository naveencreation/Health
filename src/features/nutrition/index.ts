// Nutrition Feature Domain
export * from './components/HeroCalorieCard';
export * from './components/MealSection';
export * from './components/MealCard';
export * from './components/CalorieCompletionCard';
export * from './components/MacroDistributionCard';

export * from './modals/FoodLogModal';
export * from './modals/FoodVisionModal';

export * from './hooks/useNutrition';
export * from './services';
export { BarcodeScannerModal, ScannedProductCard } from '@/components/scanner';
export { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
export { BarcodeService } from '@/services/barcodeService';
