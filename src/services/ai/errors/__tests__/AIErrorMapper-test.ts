import { AIErrorMapper } from '../AIErrorMapper';

describe('AIErrorMapper.fromRawError', () => {
  test('maps null/undefined to a generic UNKNOWN error', () => {
    const error = AIErrorMapper.fromRawError(null);
    expect(error.type).toBe('UNKNOWN');
    expect(error.message).toBe('An unknown AI error occurred.');
  });

  test('passes through an already-structured AIError', () => {
    const error = AIErrorMapper.fromRawError({
      type: 'RATE_LIMIT',
      message: 'too fast',
      retryable: true,
    } as const);
    expect(error.type).toBe('RATE_LIMIT');
    expect(error.userTitle).toBe('Chatting Too Fast');
  });

  test('maps 400 with an API-key message to INVALID_KEY', () => {
    const error = AIErrorMapper.fromRawError({
      statusCode: 400,
      message: 'API_KEY_INVALID',
    });
    expect(error.type).toBe('INVALID_KEY');
    expect(error.retryable).toBe(false);
  });

  test('maps a generic 400 to INVALID_REQUEST', () => {
    const error = AIErrorMapper.fromRawError({ statusCode: 400, message: 'bad' });
    expect(error.type).toBe('INVALID_REQUEST');
  });

  test('maps 403 to INVALID_KEY', () => {
    const error = AIErrorMapper.fromRawError({ statusCode: 403, message: 'forbidden' });
    expect(error.type).toBe('INVALID_KEY');
  });

  test('maps 429 quota to QUOTA_EXCEEDED', () => {
    const error = AIErrorMapper.fromRawError({ statusCode: 429, message: 'quota exceeded' });
    expect(error.type).toBe('QUOTA_EXCEEDED');
    expect(error.retryable).toBe(false);
  });

  test('maps 429 rate limit to RATE_LIMIT with retry', () => {
    const error = AIErrorMapper.fromRawError({ statusCode: 429, message: 'too many requests' });
    expect(error.type).toBe('RATE_LIMIT');
    expect(error.retryable).toBe(true);
    expect(error.retryAfterSeconds).toBe(4);
  });

  test('maps 500/503 to MODEL_UNAVAILABLE', () => {
    for (const statusCode of [500, 503]) {
      const error = AIErrorMapper.fromRawError({ statusCode, message: 'server' });
      expect(error.type).toBe('MODEL_UNAVAILABLE');
      expect(error.retryable).toBe(true);
    }
  });

  test('maps a background abort to APP_BACKGROUNDED', () => {
    const error = AIErrorMapper.fromRawError({
      name: 'AbortError',
      message: 'background',
    });
    expect(error.type).toBe('APP_BACKGROUNDED');
  });

  test('maps a plain abort to TIMEOUT', () => {
    const error = AIErrorMapper.fromRawError({ name: 'AbortError', message: 'aborted' });
    expect(error.type).toBe('TIMEOUT');
    expect(error.retryable).toBe(true);
  });

  test('maps network failures to NETWORK_ERROR', () => {
    const error = AIErrorMapper.fromRawError({ message: 'Network request failed' });
    expect(error.type).toBe('NETWORK_ERROR');
  });

  test('falls back to the provided fallback type with the raw message', () => {
    const error = AIErrorMapper.fromRawError({ message: 'custom error' }, 'SERVER_ERROR');
    expect(error.type).toBe('SERVER_ERROR');
    expect(error.message).toBe('custom error');
  });
});

describe('AIErrorMapper.createError', () => {
  test('enriches NO_KEY_CONFIGURED with user-facing copy', () => {
    const error = AIErrorMapper.createError('NO_KEY_CONFIGURED', 'no key');
    expect(error.userTitle).toBe('Gemini Key Needed');
    expect(error.actionLabel).toBe('Connect Key');
  });

  test('enriches INVALID_KEY with user-facing copy', () => {
    const error = AIErrorMapper.createError('INVALID_KEY', 'bad key');
    expect(error.userTitle).toBe('Invalid Gemini Key');
    expect(error.actionLabel).toBe('Update Key');
  });

  test('uses a generic notice for unknown types', () => {
    const error = AIErrorMapper.createError('UNKNOWN', 'something broke');
    expect(error.userTitle).toBe('AI Service Notice');
    expect(error.actionLabel).toBe('Dismiss');
  });
});
