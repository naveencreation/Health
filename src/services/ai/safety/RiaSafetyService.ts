import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CrisisCheckResult {
  isCrisis: boolean;
  careMessage?: string;
  helphoneNumber?: string;
}

export interface DisorderedEatingCheckResult {
  isDisorderedEating: boolean;
  triggerType?: 'purging' | 'extreme_fasting' | 'severe_guilt' | 'extreme_restriction';
  guidanceMessage?: string;
  shouldActivateSensitiveMode: boolean;
}

export interface RestrictionCheckResult {
  isBelowSafetyFloor: boolean;
  requestedKcal?: number;
  minAllowed: number;
  guidanceMessage?: string;
}

export interface MedicalScopeResult {
  isMedicalTopic: boolean;
  topic?: 'medication' | 'pregnancy' | 'chronic_disease';
  requiresDisclaimer: boolean;
  disclaimer: string;
}

export interface SupplementSteroidResult {
  isDangerousSubstance: boolean;
  substanceName?: string;
  warningMessage?: string;
}

export interface PromptInjectionResult {
  isClean: boolean;
  sanitizedText: string;
  hadInjectionAttempt: boolean;
}

export class RiaSafetyService {
  // Official Verified Helplines (India National Mental Health Framework)
  public static readonly TELE_MANAS_HELPLINE = '14416';
  public static readonly TELE_MANAS_TOLL_FREE = '1800-891-4416';
  public static readonly KIRAN_HELPLINE = '1800-599-0019';
  public static readonly VANDREVALA_HELPLINE = '+91 9999 666 555';
  public static readonly EMERGENCY_NUMBER = '112';

  // Clinical Calorie Safety Floors (RIA_Chat.md Section 11)
  public static readonly FEMALE_CALORIE_FLOOR = 1200;
  public static readonly MALE_CALORIE_FLOOR = 1500;

  private static readonly CRISIS_PATTERNS = [
    /\b(?:suicid(?:e|al)|kill\s*(?:my\s*self|myself)|end(?:ing)?\s*(?:my\s*life|it\s*all))\b/i,
    /\b(?:want\s*to\s*die|wish\s*i\s*(?:was|were)\s*dead|better\s*off\s*dead)\b/i,
    /\b(?:hurt\s*(?:my\s*self|myself)|harm\s*(?:my\s*self|myself)|self[\s-]*harm)\b/i,
    /\b(?:cut(?:ting)?\s*(?:my\s*wrists?|myself)|slit\s*(?:my\s*wrists?))\b/i,
    /\b(?:overdose|hang\s*(?:my\s*self|myself)|take\s*(?:my|own)\s*life)\b/i,
    /\b(?:don'?t\s*want\s*to\s*live|can'?t\s*go\s*on\s*any\s*more|no\s*reason\s*to\s*live)\b/i,
  ];

  private static readonly PURGING_PATTERNS = [
    /\b(?:purg(?:e|ed|ing)|throw\s*up|threw\s*up|thrown\s*up|vomit(?:ed|ing)?|puk(?:e|ed|ing))\s+(?:after|my\s+meal|dinner|lunch|food|eating)\b/i,
    /\b(?:(?:mak(?:e|ing)|made)\s+myself\s+(?:throw\s*up|puke|vomit))\b/i,
    /\b(?:laxatives?\s*(?:abuse|after\s*eating|to\s*lose\s*weight))\b/i,
  ];

  private static readonly EXTREME_FASTING_PATTERNS = [
    /\b(?:water\s*fast(?:ing)?|dry\s*fast(?:ing)?)\s*(?:for\s*)?(?:[3-9]|\d{2,})\s*days?\b/i,
    /\b(?:not\s+eat(?:ing)?|fast(?:ing)?)\s+(?:for\s+)?(?:[3-9]|\d{2,})\s*days?\b/i,
    /\b(?:how\s+to\s+starve|starve\s+myself|severe\s+starvation)\b/i,
  ];

  private static readonly SEVERE_GUILT_PATTERNS = [
    /\b(?:i\s+hate\s+myself\s+for\s+eating|disgusted\s+with\s+myself\s+for\s+eating)\b/i,
    /\b(?:punish\s+myself\s+for\s+(?:eating|overeating))\b/i,
    /\b(?:guilty\s+about\s+eating\s+anything|food\s+makes\s+me\s+feel\s+worthless)\b/i,
  ];

  private static readonly SUB_800_RESTRICTION_PATTERNS = [
    /\beat(?:ing)?\s*(?:under|<)?\s*(?:[1-7]\d{2})\s*cal(?:ories)?\b/i,
    /\b(?:diet\s*(?:of|with)?\s*(?:[1-7]\d{2})\s*cal(?:ories)?)\b/i,
    /\b(?:eat|consume)\s*(?:only\s*)?(?:[1-7]\d{2})\s*(?:kcal|calories)\b/i,
  ];

  private static readonly STEROID_PED_PATTERNS = [
    /\b(?:trenbolone|tren\b|deca-durabolin|deca\b|dianabol|dbol\b|anavar\b|clenbuterol|clen\b|sarms\b|rad-140|lgd-4033|winstrol|testosterone\s+cycle)\b/i,
  ];

  private static readonly MEDICATION_PATTERNS = [
    /\b(?:insulin|metformin|ozempic|wegovy|mounjaro|semaglutide|tirzepatide|statin|blood\s*pressure\s*med(?:ication)?)\b/i,
    /\b(?:dosage|prescribed\s+dose|mg\s+dose|how\s+many\s+mg)\b/i,
  ];

  private static readonly PREGNANCY_DEFICIT_PATTERNS = [
    /\b(?:pregnant|pregnancy|breastfeeding|nursing\s*mother)\b/i,
  ];

  private static readonly CHRONIC_DISEASE_PATTERNS = [
    /\b(?:chronic\s+kidney\s+disease|dialysis|renal\s+failure|type\s*1\s*diabetes|diabetic\s+ketoacidosis)\b/i,
  ];

  private static readonly PROMPT_INJECTION_PATTERNS = [
    /<\s*\/?\s*system\s*>/gi,
    /<\s*\/?\s*instruction\s*>/gi,
    /\b(?:ignore\s+all\s+(?:previous|prior)\s+instructions)\b/gi,
    /\b(?:you\s+are\s+now\s+in\s+DAN\s+mode|jailbreak)\b/gi,
    /\b(?:disregard\s+(?:system|safety)\s+rules)\b/gi,
    /\b(?:reveal\s+your\s+(?:system\s+prompt|internal\s+instructions))\b/gi,
  ];

  /**
   * 1. Local Crisis Pre-Check (RIA_Chat.md Section 11 & Section 10 Step 2)
   * Evaluates self-harm or suicidal intent wording.
   * If matched: Bypasses the AI model and usage limits, returns static care message with Tele-MANAS (14416).
   */
  public static checkCrisisPreCheck(text: string): CrisisCheckResult {
    if (!text || typeof text !== 'string') {
      return { isCrisis: false };
    }

    const clean = text.trim();
    for (const pattern of this.CRISIS_PATTERNS) {
      if (pattern.test(clean)) {
        return {
          isCrisis: true,
          helphoneNumber: this.TELE_MANAS_HELPLINE,
          careMessage: `I hear that you're going through a very painful time right now, but please know that you are not alone and there is caring support available.

If you are feeling overwhelmed, hopeless, or having thoughts of hurting yourself, please reach out for immediate, free, and confidential help:

• **Tele-MANAS (India)**: Call **${this.TELE_MANAS_HELPLINE}** or **${this.TELE_MANAS_TOLL_FREE}** (24/7 National Mental Health Helpline, Toll-Free)
• **KIRAN**: Call **${this.KIRAN_HELPLINE}** (24/7 Mental Health Helpline)
• **Vandrevala Foundation**: Call **${this.VANDREVALA_HELPLINE}** (24/7 Crisis Support)
• **Emergency**: Call **${this.EMERGENCY_NUMBER}**

Please reach out to a counselor, physician, or a trusted loved one right now. Your life and wellbeing matter deeply.`,
        };
      }
    }

    return { isCrisis: false };
  }

  /**
   * 2. Disordered-Eating Signals & Sensitive Mode (RIA_Chat.md Section 11)
   * Detects purging, multi-day fasting, severe food guilt, or sub-800 calorie deprivation.
   * Triggers Sensitive Mode (hides numerical calories in context strip and responses).
   */
  public static checkDisorderedEating(text: string): DisorderedEatingCheckResult {
    if (!text || typeof text !== 'string') {
      return { isDisorderedEating: false, shouldActivateSensitiveMode: false };
    }

    const clean = text.trim();

    // Check purging
    for (const pattern of this.PURGING_PATTERNS) {
      if (pattern.test(clean)) {
        return {
          isDisorderedEating: true,
          triggerType: 'purging',
          shouldActivateSensitiveMode: true,
          guidanceMessage: `Your body always deserves nourishment and gentle care. Purging or taking laxatives after eating places significant strain on your electrolytes, heart, and digestive system.

If you find yourself struggling with feelings around food or eating, please know there is non-judgmental support available. We encourage speaking with a healthcare professional or an eating disorder specialist.

I've switched Ria into **Sensitive Mode** for you—we'll focus on nourishing whole foods and body kindness without tracking numbers or deficits.`,
        };
      }
    }

    // Check multi-day extreme fasting
    for (const pattern of this.EXTREME_FASTING_PATTERNS) {
      if (pattern.test(clean)) {
        return {
          isDisorderedEating: true,
          triggerType: 'extreme_fasting',
          shouldActivateSensitiveMode: true,
          guidanceMessage: `Prolonged multi-day fasting or severe food deprivation can lead to rapid muscle loss, electrolyte imbalances, and metabolic slowdown. Sustainable health comes from consistent, balanced nourishment.

I've activated **Sensitive Mode** so we can focus on wholesome nutrition and hydration without calorie pressure. If you're struggling to eat, please consider consulting a compassionate doctor or nutritionist.`,
        };
      }
    }

    // Check severe food guilt / self-punishment
    for (const pattern of this.SEVERE_GUILT_PATTERNS) {
      if (pattern.test(clean)) {
        return {
          isDisorderedEating: true,
          triggerType: 'severe_guilt',
          shouldActivateSensitiveMode: true,
          guidanceMessage: `Food is nourishment and energy, never something you need to earn or punish yourself for. Having a treat or overeating is completely human and does not define your worth or progress.

I've enabled **Sensitive Mode** for your chat. Let's take a deep breath, hydrate, and focus on nourishing your body kindly at your next meal.`,
        };
      }
    }

    // Check sub-800 restriction
    for (const pattern of this.SUB_800_RESTRICTION_PATTERNS) {
      if (pattern.test(clean)) {
        return {
          isDisorderedEating: true,
          triggerType: 'extreme_restriction',
          shouldActivateSensitiveMode: true,
          guidanceMessage: `Eating under 800 calories per day is an extreme deficit that falls well below clinical safety thresholds and can cause nutritional deficiencies, muscle loss, and metabolic fatigue.

I cannot recommend or plan diets below clinical minimums. I've activated **Sensitive Mode** to help you nourish yourself safely.`,
        };
      }
    }

    return { isDisorderedEating: false, shouldActivateSensitiveMode: false };
  }

  /**
   * 3. Calorie Floor Enforcement & Restriction Requests (RIA_Chat.md Section 11)
   * Adult female floor: 1,200 kcal. Adult male floor: 1,500 kcal.
   * Rejects queries asking for severe deficits below this clinical safety floor.
   */
  public static checkRestrictionQuery(text: string, gender?: string): RestrictionCheckResult {
    const isMale = gender?.toLowerCase() === 'male';
    const minAllowed = isMale ? this.MALE_CALORIE_FLOOR : this.FEMALE_CALORIE_FLOOR;

    if (!text || typeof text !== 'string') {
      return { isBelowSafetyFloor: false, minAllowed };
    }

    // Match patterns asking to eat/target X calories (e.g., "eat 900 calories", "set to 1100 kcal", "plan for 1000 cal")
    const match = text.match(/\b(?:eat|target|budget|plan|give\s*me|diet\s*of)\s*(?:around|about|only)?\s*(\d{3,4})\s*(?:kcal|calories|cal)\b/i);
    if (match && match[1]) {
      const requested = parseInt(match[1], 10);
      if (requested > 0 && requested < minAllowed) {
        return {
          isBelowSafetyFloor: true,
          requestedKcal: requested,
          minAllowed,
          guidanceMessage: `For clinical safety and sustainable metabolism, Calorify does not support targets below **${minAllowed} kcal/day**${gender ? ` for adult ${gender.toLowerCase()}s` : ''}.

A ${requested} kcal budget risks muscle catabolism, micronutrient deficiencies, and hormonal disruption. A safe, sustainable approach would start at **${minAllowed} kcal** with adequate protein. Let's plan around a safe target that protects your energy and health.`,
        };
      }
    }

    return { isBelowSafetyFloor: false, minAllowed };
  }

  /**
   * 4. Medical Topics, Pregnancy & Breastfeeding Defenses (RIA_Chat.md Section 11)
   * General info only, no dosing, no deficit advice for pregnancy/breastfeeding.
   */
  public static checkMedicalScope(text: string): MedicalScopeResult {
    const disclaimer =
      '\n\n*Medical Notice: Ria provides nutritional guidance only, not clinical prescriptions or medical diagnoses. Please consult your physician regarding medications, pregnancy, or clinical conditions.*';

    if (!text || typeof text !== 'string') {
      return { isMedicalTopic: false, requiresDisclaimer: false, disclaimer };
    }

    const clean = text.trim();

    // Pregnancy / Breastfeeding
    for (const pattern of this.PREGNANCY_DEFICIT_PATTERNS) {
      if (pattern.test(clean)) {
        return {
          isMedicalTopic: true,
          topic: 'pregnancy',
          requiresDisclaimer: true,
          disclaimer,
        };
      }
    }

    // Prescription medications / Dosing
    for (const pattern of this.MEDICATION_PATTERNS) {
      if (pattern.test(clean)) {
        return {
          isMedicalTopic: true,
          topic: 'medication',
          requiresDisclaimer: true,
          disclaimer,
        };
      }
    }

    // Chronic diseases
    for (const pattern of this.CHRONIC_DISEASE_PATTERNS) {
      if (pattern.test(clean)) {
        return {
          isMedicalTopic: true,
          topic: 'chronic_disease',
          requiresDisclaimer: true,
          disclaimer,
        };
      }
    }

    return { isMedicalTopic: false, requiresDisclaimer: false, disclaimer };
  }

  /**
   * 5. Supplements & Anabolic Steroids Guard (RIA_Chat.md Section 11)
   * Neutral, safety-first stance; never recommends steroid cycles or unverified PEDs.
   */
  public static checkSupplementsAndSteroids(text: string): SupplementSteroidResult {
    if (!text || typeof text !== 'string') {
      return { isDangerousSubstance: false };
    }

    for (const pattern of this.STEROID_PED_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        return {
          isDangerousSubstance: true,
          substanceName: match[0],
          warningMessage: `As your wellness coach, I focus strictly on safe, natural nutrition and healthy lifestyle habits. I cannot recommend, advise on, or design cycles for anabolic steroids, SARMs, or unverified performance-enhancing drugs.

These substances carry significant clinical health risks including cardiovascular strain, hormonal disruption, and organ toxicity. For safe, drug-free progress, I'm here to help you optimize protein, wholesome energy, and recovery.`,
        };
      }
    }

    return { isDangerousSubstance: false };
  }

  /**
   * 6. Minor Age Guidance (Ages 13 to 17) (RIA_Chat.md Section 11)
   * Maintain-only guidance, no weight-loss pushing, no plan change cards.
   */
  public static checkMinorPolicy(age?: number): {
    isMinor: boolean;
    allowDeficitOrPlanChange: boolean;
    guidanceMessage?: string;
  } {
    if (typeof age === 'number' && age >= 13 && age < 18) {
      return {
        isMinor: true,
        allowDeficitOrPlanChange: false,
        guidanceMessage:
          'Calorify provides maintain-only, growth-supportive nutrition guidance for teens aged 13–17. We do not support weight-loss deficits or calorie reduction plans for minors.',
      };
    }
    return {
      isMinor: false,
      allowDeficitOrPlanChange: true,
    };
  }

  /**
   * 7. Prompt Injection Defense (RIA_Chat.md Section 11)
   * Neutralizes delimiters and system hijacking strings.
   */
  public static checkPromptInjection(rawInput: string): PromptInjectionResult {
    if (!rawInput || typeof rawInput !== 'string') {
      return { isClean: true, sanitizedText: '', hadInjectionAttempt: false };
    }

    let cleaned = rawInput;
    let hadInjectionAttempt = false;

    for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(cleaned)) {
        hadInjectionAttempt = true;
        cleaned = cleaned.replace(pattern, '[filtered]');
      }
    }

    return {
      isClean: !hadInjectionAttempt,
      sanitizedText: cleaned,
      hadInjectionAttempt,
    };
  }

  /**
   * Sensitive Mode Persistent State Accessors
   */
  public static async isSensitiveModeActive(userId?: string): Promise<boolean> {
    try {
      const key = `@calori_ria_sensitive_mode_${userId || 'guest'}`;
      const stored = await AsyncStorage.getItem(key);
      return stored === 'true';
    } catch {
      return false;
    }
  }

  public static async setSensitiveModeActive(active: boolean, userId?: string): Promise<void> {
    try {
      const key = `@calori_ria_sensitive_mode_${userId || 'guest'}`;
      await AsyncStorage.setItem(key, active ? 'true' : 'false');
    } catch (err) {
      console.warn('[RiaSafetyService] Failed to persist sensitive mode:', err);
    }
  }
}
