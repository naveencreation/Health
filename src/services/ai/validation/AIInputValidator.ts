import { InputValidationResult } from '../types/ai.types';
import { AIErrorMapper } from '../errors/AIErrorMapper';
import { AI_CONFIG } from '../config/AIConfig';

// Triggers for extreme starvation, purging, or self-harm eating behaviors
const CLINICAL_SAFETY_PATTERNS = [
  /\b(?:purge|purging|throw\s*up|vomit)\s+(?:after|my\s+meal|dinner|food|eating)\b/i,
  /\b(?:water\s*fast(?:ing)?|dry\s*fast(?:ing)?)\s*(?:for\s*)?(?:[3-9]|\d{2,})\s*days?\b/i,
  /\beat(?:ing)?\s*(?:under|<)?\s*(?:[1-4]\d{2})\s*cal(?:ories)?\b/i, // < 500 kcal
  /\b(?:how\s+to\s+starve|starve\s+myself|severe\s+starvation)\b/i,
  /\b(?:laxative\s+abuse|i\s+hate\s+myself\s+for\s+eating)\b/i,
];

// Suspicious prompt injection delimiters attempting to hijack system instructions
const PROMPT_INJECTION_PATTERNS = [
  /<\s*\/?\s*system\s*>/i,
  /<\s*\/?\s*instruction\s*>/i,
  /\b(?:ignore\s+all\s+(?:previous|prior)\s+instructions)\b/i,
  /\b(?:you\s+are\s+now\s+in\s+DAN\s+mode|jailbreak)\b/i,
  /\b(?:disregard\s+(?:system|safety)\s+rules)\b/i,
];

export class AIInputValidator {
  /**
   * Validates and sanitizes text inputs before forwarding to the AI layer.
   */
  static validateUserText(rawInput: string): InputValidationResult {
    if (!rawInput || typeof rawInput !== 'string') {
      return {
        isValid: false,
        sanitizedText: '',
        error: AIErrorMapper.createError('EMPTY_INPUT', 'Input text cannot be empty.', undefined, false),
      };
    }

    // 1. Strip invisible control unicode & zero-width characters
    let cleaned = rawInput
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    // 2. Minimum length check
    if (cleaned.length < AI_CONFIG.INPUT.MIN_TEXT_LENGTH) {
      return {
        isValid: false,
        sanitizedText: cleaned,
        error: AIErrorMapper.createError(
          'EMPTY_INPUT',
          'Please type a message before sending.',
          undefined,
          false
        ),
      };
    }

    // 3. Maximum length clamp
    if (cleaned.length > AI_CONFIG.INPUT.MAX_TEXT_LENGTH) {
      return {
        isValid: false,
        sanitizedText: cleaned.slice(0, AI_CONFIG.INPUT.MAX_TEXT_LENGTH),
        error: AIErrorMapper.createError(
          'INPUT_TOO_LARGE',
          `Message is too long. Please keep questions under ${AI_CONFIG.INPUT.MAX_TEXT_LENGTH} characters.`,
          undefined,
          false
        ),
      };
    }

    // 4. Compress repetitive character spam (e.g. "heeeeeeey" -> "heeey")
    cleaned = cleaned.replace(/(.)\1{5,}/g, '$1$1$1');

    // 5. Clinical Safety Check (Eating Disorder / Dangerous Calorie Deficit Guard)
    for (const pattern of CLINICAL_SAFETY_PATTERNS) {
      if (pattern.test(cleaned)) {
        return {
          isValid: false,
          sanitizedText: cleaned,
          isEmergencyIntervention: true,
          clinicalSafetyWarning:
            'Calorify strongly prioritizes healthy, sustainable nourishment. We cannot provide instructions for severe caloric deprivation or purging. If you or someone you know is struggling with eating or body image, support is available via the National Eating Disorders Association (NEDA) at nationaleatingdisorders.org.',
          error: AIErrorMapper.createError(
            'CLINICAL_SAFETY_INTERCEPT',
            'Severe caloric restriction or purging query intercepted for user safety.',
            undefined,
            false
          ),
        };
      }
    }

    // 6. Neutralize Prompt Injection Delimiters
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      cleaned = cleaned.replace(pattern, '[filtered instruction]');
    }

    return {
      isValid: true,
      sanitizedText: cleaned,
    };
  }

  /**
   * Wraps sanitized input inside a non-forgeable boundary delimiter tag.
   */
  static wrapUntrustedInput(sanitizedText: string): string {
    return `<user_untrusted_input>\n${sanitizedText}\n</user_untrusted_input>`;
  }
}
