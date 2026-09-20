export type RiaTone = 'supportive' | 'focused' | 'scientific';

export interface ChatMessage {
  id: string;
  sender: 'ria' | 'user';
  text: string;
  timestamp: string;
  isError?: boolean;
  isStreaming?: boolean;
  isInterrupted?: boolean;
}

export type AIErrorType =
  | 'NO_KEY_CONFIGURED'
  | 'INVALID_KEY'
  | 'EXPIRED_OR_REVOKED_KEY'
  | 'MODEL_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'EMPTY_INPUT'
  | 'INPUT_TOO_LARGE'
  | 'CONTEXT_TOO_LARGE'
  | 'OUTPUT_LIMIT_REACHED'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'STREAM_INTERRUPTED'
  | 'STREAM_CANCELLED'
  | 'APP_BACKGROUNDED'
  | 'SERVER_ERROR'
  | 'SAFETY_BLOCK'
  | 'MALFORMED_RESPONSE'
  | 'INVALID_STRUCTURED_OUTPUT'
  | 'CLINICAL_SAFETY_INTERCEPT'
  | 'UNKNOWN';

export interface AIError {
  type: AIErrorType;
  message: string;
  userTitle?: string;
  userMessage?: string;
  actionLabel?: string;
  statusCode?: number;
  retryable: boolean;
  retryAfterSeconds?: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: AIError;
  model?: string;
  latencyMs?: number;
}

export interface InputValidationResult {
  isValid: boolean;
  sanitizedText: string;
  error?: AIError;
  clinicalSafetyWarning?: string;
  isEmergencyIntervention?: boolean;
}

export interface OutputValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  error?: AIError;
  wasCorrected?: boolean;
  correctionLog?: string[];
  disclaimerAppended?: boolean;
}

export interface TokenBudgetBreakdown {
  systemPromptTokens: number;
  telemetryTokens: number;
  summaryTokens: number;
  historyTokens: number;
  inputTokens: number;
  reservedOutputTokens: number;
  totalEstimatedTokens: number;
  maxBudgetCap: number;
  fitsBudget: boolean;
}

export interface ConversationSummary {
  text: string;
  lastSummarizedIndex: number;
  updatedAt: string;
}

export interface AIRateLimitStatus {
  allowed: boolean;
  reason?: string;
  waitMs: number;
  dailyUsageCount: number;
  isDailyWarning: boolean;
}

export interface AIObservabilityMetric {
  id: string;
  timestamp: number;
  feature: 'chat' | 'vision' | 'insight' | 'key_validation';
  latencyMs: number;
  timeToFirstTokenMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  success: boolean;
  errorCode?: AIErrorType;
  atwaterAdjusted?: boolean;
}

export interface UserNutritionContext {
  name: string;
  riaTone: RiaTone;
  dailyCalorieBudget: number;
  remainingCalories: number;
  consumedCalories: number;
  targetProtein: number;
  consumedProtein: number;
  targetCarbs: number;
  consumedCarbs: number;
  targetFat: number;
  consumedFat: number;
  targetWaterMl: number;
  consumedWaterMl: number;
  stepGoal: number;
  currentSteps: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  heightCm?: number;
  age?: number;
  gender?: string;
  loggedMealsToday: Array<{
    name: string;
    mealType: string;
    calories: number;
    protein: number;
  }>;
}

export interface FoodVisionResult {
  name: string;
  category: 'breads' | 'curries' | 'south_indian' | 'rice' | 'snacks' | 'beverages' | 'fruits' | 'dairy';
  categoryLabel: string;
  servingUnit: string;
  defaultServingSize: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  atwaterCorrected?: boolean;
}

export interface NaturalMealParseItem {
  name: string;
  servingUnit: string;
  quantity: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
}
