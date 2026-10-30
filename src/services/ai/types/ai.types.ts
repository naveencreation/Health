export type RiaTone = 'supportive' | 'focused' | 'scientific';

export interface ChatMessage {
  id: string;
  sender: 'ria' | 'user';
  text: string;
  timestamp: string;
  isError?: boolean;
  isStreaming?: boolean;
  isInterrupted?: boolean;
  card?: RiaCard;
}

export interface ConversationRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  archived?: boolean;
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

export interface RiaUserFacts {
  dietaryPattern?:
    | 'vegetarian'
    | 'vegan'
    | 'eggetarian'
    | 'non_vegetarian'
    | 'pescatarian'
    | 'keto'
    | 'jain';
  allergies?: string[];
  dislikes?: string[];
  favoriteFoods?: string[];
  fastingProtocol?: {
    active: boolean;
    type?: string;
    windowStart?: string;
    windowEnd?: string;
  };
  workoutTiming?: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
  cookingPreference?: 'cooks_at_home' | 'eats_out' | 'mess_tiffin' | 'meal_prep';
  lastExtractedTimestamp?: number;
}

export interface MetabolicInsight {
  observedTdee: number;
  standardTdeeEstimate: number;
  differenceKcal: number;
  confidence: 'preliminary' | 'moderate' | 'high';
  status: 'plateau' | 'healthy_progress' | 'rapid_loss' | 'surplus_gain' | 'maintenance';
  adaptationRatePct: number;
  recommendedCalorieBudget: number;
  recommendationReason: string;
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
  userFacts?: RiaUserFacts;
  metabolicInsight?: MetabolicInsight;
  loggedMealsToday: Array<{
    name: string;
    mealType: string;
    calories: number;
    protein: number;
  }>;
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
// RIA ACTION CARDS (Spec-Driven Generative UI)
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

export interface VisualMacroSplitCardData {
  title: string;
  subtitle?: string;
  totalKcal: number;
  targetKcal?: number;
  proteinGrams: number;
  targetProteinGrams?: number;
  carbsGrams: number;
  targetCarbsGrams?: number;
  fatGrams: number;
  targetFatGrams?: number;
  insight?: string;
}

export interface PlateDistributionCardData {
  mealName: string;
  slot?: MealCardSlot;
  proteinPct: number;    // e.g. 30 (%)
  carbsPct: number;      // e.g. 35 (%)
  veggiesPct: number;    // e.g. 25 (%)
  fatsPct: number;       // e.g. 10 (%)
  totalKcal: number;
  balanceScore: number;  // 1-100
  recommendation: string;
}

export type RiaCard =
  | { type: 'meal'; data: MealCardData }
  | { type: 'suggestion'; data: SuggestionCardData }
  | { type: 'water'; data: WaterCardData }
  | { type: 'weight'; data: WeightCardData }
  | { type: 'day_review'; data: DayReviewCardData }
  | { type: 'plan_change'; data: PlanChangeCardData }
  | { type: 'visual_macro_split'; data: VisualMacroSplitCardData }
  | { type: 'plate_distribution'; data: PlateDistributionCardData };
