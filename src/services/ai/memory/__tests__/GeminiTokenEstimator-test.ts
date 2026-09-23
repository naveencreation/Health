import { GeminiTokenEstimator } from '../GeminiTokenEstimator';

describe('GeminiTokenEstimator.estimateTextTokens', () => {
  test('returns 0 for null, undefined, and empty text', () => {
    expect(GeminiTokenEstimator.estimateTextTokens(null)).toBe(0);
    expect(GeminiTokenEstimator.estimateTextTokens(undefined)).toBe(0);
    expect(GeminiTokenEstimator.estimateTextTokens('')).toBe(0);
  });

  test('estimates ASCII text at ~3.8 chars per token', () => {
    // 8 chars -> ceil(8 / 3.8) = 3
    expect(GeminiTokenEstimator.estimateTextTokens('abcdefgh')).toBe(3);
  });

  test('never returns less than one token for non-empty input', () => {
    expect(GeminiTokenEstimator.estimateTextTokens('a')).toBe(1);
  });

  test('estimates non-ASCII text at ~2.1 chars per token', () => {
    // 4 Devanagari chars -> ceil(4 / 2.1) = 2
    expect(GeminiTokenEstimator.estimateTextTokens('भारत')).toBe(2);
  });

  test('handles mixed ASCII and non-ASCII text', () => {
    // 'hi ' = 3 ASCII (ceil 3/3.8 = 1) + 4 Devanagari (ceil 4/2.1 = 2) = 3
    expect(GeminiTokenEstimator.estimateTextTokens('hi भारत')).toBe(3);
  });
});

describe('GeminiTokenEstimator.estimateMessagesTokens', () => {
  test('returns 0 for empty or null messages', () => {
    expect(GeminiTokenEstimator.estimateMessagesTokens([])).toBe(0);
    expect(GeminiTokenEstimator.estimateMessagesTokens(null as unknown as any[])).toBe(0);
  });

  test('adds a per-turn envelope of 4 tokens', () => {
    // 'hello' (2 tokens) and 'world' (2 tokens), each +4 = 12
    const tokens = GeminiTokenEstimator.estimateMessagesTokens([
      { text: 'hello' },
      { text: 'world' },
    ]);
    expect(tokens).toBe(12);
  });
});

describe('GeminiTokenEstimator.getImagePartTokens', () => {
  test('returns the configured image part token cost', () => {
    expect(GeminiTokenEstimator.getImagePartTokens()).toBe(258);
  });
});
