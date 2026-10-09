import { AuthUser, RegisterData, OnboardingPlanPayload } from '@/types';

export interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  loginAnonymous: (guestName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  loginDemo: () => Promise<void>;
  applyOnboardingPlan: (data: OnboardingPlanPayload) => Promise<void>;
}
