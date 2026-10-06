import { EdgeImagePreprocessor } from '../EdgeImagePreprocessor';

describe('EdgeImagePreprocessor.processBase64', () => {
  test('rejects null/undefined/empty input', () => {
    for (const input of ['', null, undefined]) {
      const result = EdgeImagePreprocessor.processBase64(input as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('INVALID_REQUEST');
    }
  });

  test('strips a data URL header and detects the MIME type', () => {
    const payload = 'A'.repeat(200);
    const result = EdgeImagePreprocessor.processBase64(`data:image/png;base64,${payload}`);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/png');
    expect(result.cleanBase64).toBe(payload);
  });

  test('uses the fallback MIME type when no header is present', () => {
    const result = EdgeImagePreprocessor.processBase64('A'.repeat(200));
    expect(result.mimeType).toBe('image/jpeg');
  });

  test('strips internal whitespace from base64', () => {
    const result = EdgeImagePreprocessor.processBase64('A'.repeat(100) + ' ' + 'A'.repeat(100));
    expect(result.isValid).toBe(true);
    expect(result.cleanBase64).toBe('A'.repeat(200));
  });

  test('rejects a payload that is too small', () => {
    const result = EdgeImagePreprocessor.processBase64('AAAA');
    expect(result.isValid).toBe(false);
    expect(result.error?.type).toBe('INVALID_REQUEST');
  });

  test('rejects a payload exceeding the byte limit', () => {
    const result = EdgeImagePreprocessor.processBase64('A'.repeat(3_000_000));
    expect(result.isValid).toBe(false);
    expect(result.error?.type).toBe('INPUT_TOO_LARGE');
  });

  test('computes the estimated decoded byte size', () => {
    // 200 base64 chars -> floor(200 * 3 / 4) = 150 bytes
    const result = EdgeImagePreprocessor.processBase64('A'.repeat(200));
    expect(result.isValid).toBe(true);
    expect(result.estimatedBytes).toBe(150);
  });
});
