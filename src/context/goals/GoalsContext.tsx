import { createContext, useContext } from 'react';
import { GoalsContextValue } from './types';

export const GoalsContext = createContext<GoalsContextValue | undefined>(undefined);

export function useGoals(): GoalsContextValue {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider or HealthProvider');
  }
  return context;
}
