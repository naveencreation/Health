export type RiaTone = 'supportive' | 'focused' | 'scientific';

export type RiaRole = 'user' | 'ria' | 'system';

export type RiaKind =
  | 'text'
  | 'photo'
  | 'meal_card'
  | 'suggestion_card'
  | 'water_card'
  | 'weight_card'
  | 'day_review_card'
  | 'plan_change_card'
  | 'limit_card'
  | 'capacity_notice'
  | 'offline_notice'
  | 'error';

export type RiaStatus = 'sending' | 'streaming' | 'done' | 'interrupted' | 'failed' | 'unsent';

export interface RiaMessage {
  id: string;
  role: RiaRole;
  kind: RiaKind;
  text?: string;
  createdAt: number;
  status: RiaStatus;
  photoThumbUri?: string; // local only
  card?: RiaCard;
  rating?: 'up' | 'down';
  error?: string;
}

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

export interface LoggedMealContextItem {
  id?: string;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  time?: string;
  quantity?: number;
  unit?: string;
}

export interface UserNutritionContext {
  // 1. Profile, Persona & Demographics
  name: string;
  riaTone: RiaTone;
  age?: number;
  gender?: string;
  heightCm?: number;
  isMinor?: boolean;
  streakDays?: number;

  // 2. Nutrition Snapshot
  dailyCalorieBudget: number;
  consumedCalories: number;
  remainingCalories: number;
  calorieStatus?: 'deficit' | 'surplus' | 'on_track';
  calorieDeficitOrSurplus?: number;
  targetProtein: number;
  consumedProtein: number;
  targetCarbs: number;
  consumedCarbs: number;
  targetFat: number;
  consumedFat: number;
  targetFiber?: number;
  consumedFiber?: number;

  // 3. Recent Meals Today
  loggedMealsToday: LoggedMealContextItem[];

  // 4. Onboarding Struggles & Dietary Preferences
  struggles?: string[];
  foodStyle?: string;
  dietaryPreferences?: string[];
  skipsBreakfast?: boolean;
  snacksRegularly?: boolean;

  // 5. Goal, Plan & Pace
  goal?: string;
  goalIntent?: string;
  pace?: string;
  startWeightKg?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  weightDeltaToGoalKg?: number;

  // 6. Water & Step Deltas
  targetWaterMl: number;
  consumedWaterMl: number;
  waterDeltaMl?: number;
  waterPercent?: number;
  stepGoal: number;
  currentSteps: number;
  stepDelta?: number;
  stepPercent?: number;

  // 7. Pro Long-Term Memory Summary
  memorySummary?: string;

  // 8. Safety & Sensitive Mode (Phase R7)
  isSensitiveMode?: boolean;
}

export interface FoodVisionResult {
  name: string;
  category:
    'breads' | 'curries' | 'south_indian' | 'rice' | 'snacks' | 'beverages' | 'fruits' | 'dairy';
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

// ==========================================
// RIA ACTION CARDS (Phase R5 - RIA_Chat.md)
// ==========================================

export type MealCardSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealCardItem {
  id?: string;
  name: string;
  qty: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'catalog' | 'estimate';
}

export type ActionCardState = 'proposed' | 'logged' | 'dismissed' | 'undone';

export interface MealCardData {
  slot: MealCardSlot;
  items: MealCardItem[];
  assumption?: string; // e.g. "1 katori ~ 150 g"
  state: ActionCardState;
  loggedAt?: number;
  undoUntil?: number; // loggedAt + 10s (10000 ms)
  entryIds?: string[]; // IDs created in daily log
  duplicateWarning?: string; // "You logged this 4m ago. Add again?"
  photoThumbUri?: string; // local photo thumbnail for photo-scanned meals
}

export interface SuggestionOption {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  portion?: string;
  tag?: string;
}

export interface SuggestionCardData {
  options: SuggestionOption[];
}

export interface WaterCardData {
  amountMl: number;
  state: ActionCardState;
  loggedAt?: number;
  undoUntil?: number;
  entryId?: string;
}

export interface WeightCardData {
  weightKg: number;
  previousWeightKg?: number;
  deltaKg?: number;
  needsSanityConfirm?: boolean; // >3 kg change in 1 day
  state: 'proposed' | 'logged' | 'dismissed';
  loggedAt?: number;
}

export interface DayReviewCardData {
  caloriesConsumed: number;
  calorieTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
  carbsConsumed: number;
  carbsTarget: number;
  fatConsumed: number;
  fatTarget: number;
  win: string;
  focus: string;
}

export interface PlanChangeCardData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  currentCalories: number;
  currentProtein: number;
  currentCarbs: number;
  currentFat: number;
  reason: string;
  state: 'proposed' | 'applied' | 'dismissed';
}

export type RiaCard =
  | { type: 'meal'; data: MealCardData }
  | { type: 'suggestion'; data: SuggestionCardData }
  | { type: 'water'; data: WaterCardData }
  | { type: 'weight'; data: WeightCardData }
  | { type: 'day_review'; data: DayReviewCardData }
  | { type: 'plan_change'; data: PlanChangeCardData };

