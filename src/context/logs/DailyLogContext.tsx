import { createContext, useContext } from 'react';
import { DailyLogContextValue, AnalyticsContextValue } from './types';

export const DailyLogContext = createContext<DailyLogContextValue | undefined>(undefined);
export const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function useDailyLog(): DailyLogContextValue {
  const context = useContext(DailyLogContext);
  if (!context) {
    throw new Error('useDailyLog must be used within a DailyLogProvider or HealthProvider');
  }
  return context;
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider or HealthProvider');
  }
  return context;
}
