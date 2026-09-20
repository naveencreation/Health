/**
 * Centralized, Configurable AI Configuration for Calorify
 * Model: gemini-3.5-flash-lite (BYOK Architecture)
 */

export const AI_CONFIG = {
  // Model & Endpoint
  MODEL: 'gemini-3.5-flash-lite',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',

  // Token Budgets (Cap: 8,000 tokens for optimal latency & free-tier efficiency)
  TOKEN_BUDGET: {
    TOTAL_REQUEST_CAP: 8000,
    SYSTEM_INSTRUCTION_RESERVE: 450,
    USER_TELEMETRY_RESERVE: 250,
    CONVERSATION_SUMMARY_RESERVE: 150,
    MAX_HISTORY_TOKENS: 1200,
    MAX_INPUT_TOKENS: 500,
    RESERVED_OUTPUT_CHAT: 1000,
    RESERVED_OUTPUT_VISION: 350,
    RESERVED_OUTPUT_INSIGHT: 150,
    // Multimodal image part token cost according to Google Gemini documentation
    IMAGE_PART_TOKENS: 258,
  },

  // Context & Memory Constraints
  MEMORY: {
    MAX_ACTIVE_HISTORY_TURNS: 6, // 3 user + 3 ria turns in sliding window
    SUMMARIZATION_THRESHOLD: 10,  // When history hits 10 messages, trigger background summary
    MAX_PERSISTED_MESSAGES: 30,
    SUMMARY_MAX_WORDS: 60,
  },

  // Input Validation Bounds
  INPUT: {
    MIN_TEXT_LENGTH: 2,
    MAX_TEXT_LENGTH: 1500,
    MAX_CONSECUTIVE_REPEATED_CHARS: 5,
  },

  // Rate Limiting (Protects Google AI Studio free tier: 15 RPM / 1,500 RPD)
  RATE_LIMIT: {
    MIN_SEND_COOLDOWN_MS: 3000, // 3s cooldown between sends
    MAX_REQUESTS_PER_MINUTE: 10, // Safety margin well below 15 RPM
    DAILY_QUOTA_SAFETY_LIMIT: 1200, // Alert before hitting 1,500 hard daily ceiling
    DAILY_QUOTA_WARNING_THRESHOLD: 1000,
  },

  // Network Timeouts (Milliseconds)
  TIMEOUT: {
    CONNECTION_TIMEOUT_MS: 8000,
    TIME_TO_FIRST_TOKEN_MS: 10000,
    IDLE_STREAM_TIMEOUT_MS: 5000,
    TOTAL_REQUEST_TIMEOUT_MS: 25000,
  },

  // Retry Matrix
  RETRY: {
    MAX_ATTEMPTS: 2,
    BASE_DELAY_MS: 1000,
    MAX_DELAY_MS: 6000,
    JITTER_MIN_MS: 100,
    JITTER_MAX_MS: 400,
  },

  // Multimodal Image Preprocessing
  IMAGE: {
    MAX_DIMENSION: 1024,
    JPEG_QUALITY: 0.8,
    MAX_BASE64_BYTES: 2 * 1024 * 1024, // 2MB
  },

  // Thermodynamic Atwater Macro Validation
  ATWATER: {
    CARB_CALORIES_PER_GRAM: 4,
    PROTEIN_CALORIES_PER_GRAM: 4,
    FAT_CALORIES_PER_GRAM: 9,
    MAX_DISCREPANCY_TOLERANCE_PERCENT: 18, // Flag/rebalance if discrepancy exceeds 18%
  },

  // Clinical Safety Hard Bounds
  CLINICAL: {
    MIN_FEMALE_DAILY_CALORIES: 1000,
    MIN_MALE_DAILY_CALORIES: 1200,
  },
} as const;

export type AIConfigType = typeof AI_CONFIG;
