import { UserGoals } from '@/types';

export interface GoalsContextValue {
  userGoals: UserGoals;
  updateGoals: (goals: Partial<UserGoals>) => void;
}
