import { FoodVisionResult, OutputValidationResult } from '../types/ai.types';
import { AIErrorMapper } from '../errors/AIErrorMapper';
import { AI_CONFIG } from '../config/AIConfig';

const CLINICAL_DISCLAIMER_TAG =
  '\n\n*Medical Notice: Ria provides nutritional guidance only, not clinical prescriptions or medical diagnoses. Please consult your physician regarding medications or clinical conditions.*';

const MEDICATION_TERMS = [
  /\b(?:insulin|metformin|ozempic|wegovy|mounjaro|statin|steroids|blood\s*pressure\s*med)\b/i,
  /\b(?:prescribed|dosage|milligram|mg\s+dose)\b/i,
];

export class AIOutputValidator {
  /**
   * Validates and applies thermodynamic macro consistency checks to Food Vision outputs.
   */
  static validateFoodVisionResult(rawJsonText: string): OutputValidationResult<FoodVisionResult> {
    if (!rawJsonText || typeof rawJsonText !== 'string') {
      return {
        isValid: false,
        error: AIErrorMapper.createError(
          'INVALID_STRUCTURED_OUTPUT',
          'Gemini returned an empty response for food vision.',
          undefined,
          false
        ),
      };
    }

    let parsed: any;
    try {
      // Handle markdown code fences if model wrapped in ```json ... ```
      const cleanedJson = rawJsonText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleanedJson);
    } catch {
      return {
        isValid: false,
        error: AIErrorMapper.createError(
          'INVALID_STRUCTURED_OUTPUT',
          'Could not parse structured food JSON from Gemini.',
          undefined,
          false
        ),
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        isValid: false,
        error: AIErrorMapper.createError(
          'INVALID_STRUCTURED_OUTPUT',
          'Vision payload was not a valid object.',
          undefined,
          false
        ),
      };
    }

    const corrections: string[] = [];
    let wasCorrected = false;

    const name = String(parsed.name || 'Recognized Dish').trim().slice(0, 80);
    const category = parsed.category || 'curries';
    const categoryLabel = parsed.categoryLabel || 'Meals & Dishes';
    const servingUnit = String(parsed.servingUnit || 'portion').trim().slice(0, 40);
    const defaultServingSize = Math.max(1, Number(parsed.defaultServingSize) || 1);

    // Sanitize Macro Quantities
    let carbs = Math.max(0, Math.min(500, Math.round(Number(parsed.carbs) || 0)));
    let protein = Math.max(0, Math.min(300, Math.round(Number(parsed.protein) || 0)));
    let fat = Math.max(0, Math.min(300, Math.round(Number(parsed.fat) || 0)));
    let fiber = Math.max(0, Math.min(80, Math.round(Number(parsed.fiber) || 0)));
    let reportedCalories = Math.max(10, Math.min(4000, Math.round(Number(parsed.calories) || 0)));

    // Thermodynamic Atwater Equation Consistency Check
    // Expected kcal = (4 * C) + (4 * P) + (9 * F)
    const expectedAtwaterCalories =
      carbs * AI_CONFIG.ATWATER.CARB_CALORIES_PER_GRAM +
      protein * AI_CONFIG.ATWATER.PROTEIN_CALORIES_PER_GRAM +
      fat * AI_CONFIG.ATWATER.FAT_CALORIES_PER_GRAM;

    if (expectedAtwaterCalories > 0 && reportedCalories > 0) {
      const discrepancy = Math.abs(reportedCalories - expectedAtwaterCalories) / reportedCalories;
      const tolerance = AI_CONFIG.ATWATER.MAX_DISCREPANCY_TOLERANCE_PERCENT / 100;

      if (discrepancy > tolerance) {
        corrections.push(
          `Atwater Thermodynamic Discrepancy: Model reported ${reportedCalories} kcal, but ${carbs}g C, ${protein}g P, ${fat}g F totals ${expectedAtwaterCalories} kcal. Rebalanced to ${expectedAtwaterCalories} kcal.`
        );
        reportedCalories = expectedAtwaterCalories;
        wasCorrected = true;
      }
    } else if (reportedCalories > 0 && expectedAtwaterCalories === 0) {
      // If macros were zero but calories were high, estimate a balanced split
      carbs = Math.round((reportedCalories * 0.5) / 4);
      protein = Math.round((reportedCalories * 0.25) / 4);
      fat = Math.round((reportedCalories * 0.25) / 9);
      wasCorrected = true;
      corrections.push('Model omitted macronutrients; applied balanced baseline.');
    }

    const validatedResult: FoodVisionResult = {
      name,
      category,
      categoryLabel,
      servingUnit,
      defaultServingSize,
      calories: reportedCalories,
      carbs,
      protein,
      fat,
      fiber,
      confidence: parsed.confidence || (wasCorrected ? 'medium' : 'high'),
      notes: parsed.notes || '',
      atwaterCorrected: wasCorrected,
    };

    return {
      isValid: true,
      data: validatedResult,
      wasCorrected,
      correctionLog: corrections,
    };
  }

  /**
   * Validates plain-text chat response and appends clinical safety disclaimer if medical terms appear.
   */
  static validateChatResponse(rawText: string): OutputValidationResult<string> {
    if (!rawText || !rawText.trim()) {
      return {
        isValid: false,
        error: AIErrorMapper.createError(
          'MALFORMED_RESPONSE',
          'Gemini returned an empty message.',
          undefined,
          true
        ),
      };
    }

    let cleaned = rawText.trim();
    let disclaimerAppended = false;

    for (const pattern of MEDICATION_TERMS) {
      if (pattern.test(cleaned)) {
        if (!cleaned.includes('Medical Notice')) {
          cleaned += CLINICAL_DISCLAIMER_TAG;
          disclaimerAppended = true;
        }
        break;
      }
    }

    return {
      isValid: true,
      data: cleaned,
      disclaimerAppended,
    };
  }
}
