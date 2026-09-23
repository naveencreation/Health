import { AIOutputValidator } from '../AIOutputValidator';

describe('AIOutputValidator.validateFoodVisionResult', () => {
  test('rejects empty or non-string input', () => {
    for (const input of ['', null, undefined]) {
      const result = AIOutputValidator.validateFoodVisionResult(input as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('INVALID_STRUCTURED_OUTPUT');
    }
  });

  test('rejects unparseable JSON', () => {
    const result = AIOutputValidator.validateFoodVisionResult('not json at all');
    expect(result.isValid).toBe(false);
    expect(result.error?.type).toBe('INVALID_STRUCTURED_OUTPUT');
  });

  test('rejects a non-object JSON payload', () => {
    const result = AIOutputValidator.validateFoodVisionResult('42');
    expect(result.isValid).toBe(false);
  });

  test('strips markdown code fences before parsing', () => {
    const result = AIOutputValidator.validateFoodVisionResult(
      '```json\n{"name":"Paneer","calories":260,"carbs":12,"protein":9,"fat":19}\n```'
    );
    expect(result.isValid).toBe(true);
    expect(result.data?.name).toBe('Paneer');
  });

  test('applies sensible defaults when fields are missing', () => {
    const result = AIOutputValidator.validateFoodVisionResult('{}');
    expect(result.isValid).toBe(true);
    expect(result.data?.name).toBe('Recognized Dish');
    expect(result.data?.category).toBe('curries');
    expect(result.data?.servingUnit).toBe('portion');
    expect(result.data?.defaultServingSize).toBe(1);
  });

  test('clamps out-of-range macros', () => {
    const result = AIOutputValidator.validateFoodVisionResult(
      '{"carbs":1000,"calories":2000}'
    );
    expect(result.data?.carbs).toBe(500);
    expect(result.data?.calories).toBe(2000);
    expect(result.data?.atwaterCorrected).toBe(false);
  });

  test('rebalances calories when Atwater discrepancy exceeds tolerance', () => {
    const result = AIOutputValidator.validateFoodVisionResult(
      '{"carbs":50,"protein":50,"fat":50,"calories":500}'
    );
    // 50*4 + 50*4 + 50*9 = 850
    expect(result.data?.calories).toBe(850);
    expect(result.data?.atwaterCorrected).toBe(true);
    expect(result.correctionLog).toHaveLength(1);
  });

  test('leaves consistent macros untouched', () => {
    const result = AIOutputValidator.validateFoodVisionResult(
      '{"carbs":10,"protein":10,"fat":10,"calories":170}'
    );
    expect(result.data?.calories).toBe(170);
    expect(result.data?.atwaterCorrected).toBe(false);
  });

  test('applies a balanced split when macros are omitted but calories present', () => {
    const result = AIOutputValidator.validateFoodVisionResult('{"calories":200}');
    expect(result.data?.carbs).toBe(25);
    expect(result.data?.protein).toBe(13);
    expect(result.data?.fat).toBe(6);
    expect(result.data?.calories).toBe(200);
    expect(result.data?.atwaterCorrected).toBe(true);
    expect(result.data?.confidence).toBe('medium');
  });
});

describe('AIOutputValidator.validateChatResponse', () => {
  test('rejects empty or whitespace-only responses', () => {
    for (const input of ['', '   ']) {
      const result = AIOutputValidator.validateChatResponse(input);
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('MALFORMED_RESPONSE');
    }
  });

  test('returns normal text without a disclaimer', () => {
    const result = AIOutputValidator.validateChatResponse('Eat more vegetables.');
    expect(result.isValid).toBe(true);
    expect(result.data).toBe('Eat more vegetables.');
    expect(result.disclaimerAppended).toBe(false);
  });

  test('appends a clinical disclaimer when medication terms appear', () => {
    const result = AIOutputValidator.validateChatResponse(
      'You may need insulin adjustments.'
    );
    expect(result.isValid).toBe(true);
    expect(result.disclaimerAppended).toBe(true);
    expect(result.data).toContain('Medical Notice');
  });

  test('does not double-append the disclaimer', () => {
    const result = AIOutputValidator.validateChatResponse(
      'Take metformin. Medical Notice: consult your physician.'
    );
    expect(result.disclaimerAppended).toBe(false);
    expect(result.data?.match(/Medical Notice/g)).toHaveLength(1);
  });
});
