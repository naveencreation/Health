import { FoodItem } from '@/types';

export interface FoodContextValue {
  foodDatabase: FoodItem[];
  addCustomFood: (food: Omit<FoodItem, 'id'>) => FoodItem;
  deleteCustomFood: (foodId: string) => void;
}
