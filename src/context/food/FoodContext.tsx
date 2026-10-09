import { createContext, useContext } from 'react';
import { FoodContextValue } from './types';

export const FoodContext = createContext<FoodContextValue | undefined>(undefined);

export function useFoodData(): FoodContextValue {
  const context = useContext(FoodContext);
  if (!context) {
    throw new Error('useFoodData must be used within a FoodProvider or HealthProvider');
  }
  return context;
}
