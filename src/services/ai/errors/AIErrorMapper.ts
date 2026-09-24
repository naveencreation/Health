import { AIError, AIErrorType } from '../types/ai.types';

export class AIErrorMapper {
  /**
   * Converts raw HTTP errors, exceptions, or internal codes into typed, human-friendly AIError objects.
   */
  static fromRawError(error: any, fallbackType: AIErrorType = 'UNKNOWN'): AIError {
    if (!error) {
      return this.createError('UNKNOWN', 'An unknown AI error occurred.');
    }

    // Already a structured AIError
    if (error.type && error.message && typeof error.retryable === 'boolean') {
      return this.enrichUserFacingMetadata(error);
    }

    const rawMessage = error.message || (typeof error === 'string' ? error : '') || String(error || '');
    let status = error.statusCode || error.status || (typeof error.code === 'number' ? error.code : undefined);
    let extractedDetail = '';

    // If message is a JSON string or contains {"error": ...}, extract clean message and status code
    if (typeof rawMessage === 'string' && (rawMessage.trim().startsWith('{') || rawMessage.includes('"error"'))) {
      try {
        const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error) {
            extractedDetail = parsed.error.message || '';
            if (!status && parsed.error.code && typeof parsed.error.code === 'number') {
              status = parsed.error.code;
            }
          }
        }
      } catch {
        // Keep rawMessage
      }
    }

    const searchStr = (rawMessage + ' ' + extractedDetail).toUpperCase();

    // 1. Invalid, Expired, or Unauthorized API Key (Google returns 401 UNAUTHENTICATED, 403 PERMISSION_DENIED, or 400 API_KEY_INVALID)
    if (
      status === 401 ||
      status === 403 ||
      searchStr.includes('API_KEY_INVALID') ||
      searchStr.includes('API KEY NOT VALID') ||
      searchStr.includes('INVALID API KEY') ||
      searchStr.includes('UNAUTHENTICATED') ||
      searchStr.includes('PERMISSION_DENIED') ||
      searchStr.includes('UNREGISTERED CALLERS') ||
      searchStr.includes('API KEY EXPIRED') ||
      (status === 400 && (searchStr.includes('API_KEY') || searchStr.includes('API KEY')))
    ) {
      return this.createError(
        'INVALID_KEY',
        extractedDetail || 'Your Gemini API key is invalid or has expired.',
        status || 401,
        false
      );
    }

    // 2. Rate Limits & Quotas
    if (status === 429 || searchStr.includes('RESOURCE_EXHAUSTED') || searchStr.includes('QUOTA')) {
      if (searchStr.includes('QUOTA') || searchStr.includes('RESOURCE_EXHAUSTED') || searchStr.includes('DAILY')) {
        return this.createError(
          'QUOTA_EXCEEDED',
          extractedDetail || 'Gemini API daily quota limit reached. Free keys reset daily at midnight Pacific Time.',
          429,
          false
        );
      }
      return this.createError(
        'RATE_LIMIT',
        extractedDetail || 'You are sending requests too quickly. Please pause for a moment.',
        429,
        true,
        4
      );
    }

    // 3. Server Overload / Unavailable
    if (
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      searchStr.includes('OVERLOADED') ||
      searchStr.includes('SERVICE UNAVAILABLE')
    ) {
      return this.createError(
        'MODEL_UNAVAILABLE',
        'Google Gemini servers are temporarily overloaded. Please try again in a few moments.',
        status || 503,
        true,
        3
      );
    }

    if (status === 404) {
      return this.createError(
        'MODEL_UNAVAILABLE',
        'The requested Gemini model is currently not available.',
        404,
        false
      );
    }

    // 4. Abort & Network conditions
    if (error.name === 'AbortError' || searchStr.includes('ABORTED') || searchStr.includes('TIMED OUT') || searchStr.includes('TIMEOUT')) {
      if (searchStr.includes('BACKGROUND')) {
        return this.createError('APP_BACKGROUNDED', 'Generation paused because Calorify went to the background.', undefined, false);
      }
      return this.createError('TIMEOUT', 'Connection timed out while waiting for Gemini. Please check your network.', undefined, true);
    }

    if (
      searchStr.includes('NETWORK REQUEST FAILED') ||
      searchStr.includes('FAILED TO FETCH') ||
      searchStr.includes('OFFLINE') ||
      searchStr.includes('ERR_INTERNET_DISCONNECTED') ||
      searchStr.includes('ENOTFOUND') ||
      searchStr.includes('CONNECTION REFUSED')
    ) {
      return this.createError('NETWORK_ERROR', 'Could not reach Google Gemini. Please check your WiFi or mobile data connection.', undefined, true);
    }

    // 5. Malformed Request
    if (status === 400) {
      return this.createError('INVALID_REQUEST', extractedDetail || 'The request to Gemini was malformed. Please try again.', 400, false);
    }

    const cleanFallback =
      extractedDetail && !extractedDetail.startsWith('{')
        ? extractedDetail
        : typeof rawMessage === 'string' && !rawMessage.startsWith('{') && !rawMessage.includes('"error"')
          ? rawMessage
          : 'An unexpected AI error occurred.';

    return this.createError(fallbackType, cleanFallback, status, false);
  }

  /**
   * Helper factory creating fully enriched AIError with user-facing text & action labels.
   */
  static createError(
    type: AIErrorType,
    technicalMessage: string,
    statusCode?: number,
    retryable: boolean = false,
    retryAfterSeconds?: number
  ): AIError {
    const error: AIError = {
      type,
      message: technicalMessage,
      statusCode,
      retryable,
      retryAfterSeconds,
    };
    return this.enrichUserFacingMetadata(error);
  }

  /**
   * Maps internal codes to empathetic, non-technical UI titles, descriptions, and buttons.
   */
  private static enrichUserFacingMetadata(error: AIError): AIError {
    switch (error.type) {
      case 'NO_KEY_CONFIGURED':
        error.userTitle = 'Gemini Key Needed';
        error.userMessage = 'Connect your free Google Gemini API key to unlock Ria AI coaching and instant food photo scanning.';
        error.actionLabel = 'Connect Key';
        break;

      case 'INVALID_KEY':
      case 'EXPIRED_OR_REVOKED_KEY':
        error.userTitle = 'Invalid Gemini Key';
        error.userMessage = 'Google rejected this API key. Please check your key at Google AI Studio or connect a valid key.';
        error.actionLabel = 'Update Key';
        break;

      case 'QUOTA_EXCEEDED':
        error.userTitle = 'Daily Quota Limit';
        error.userMessage = 'Your free Google AI Studio key has hit its daily limit (1,500 requests). Free quotas refresh every 24 hours.';
        error.actionLabel = 'Update Key';
        break;

      case 'RATE_LIMIT':
        error.userTitle = 'Please Wait a Moment';
        error.userMessage = `You are sending requests too quickly. Please wait ${error.retryAfterSeconds || 3} seconds before trying again.`;
        error.actionLabel = 'Try Again';
        break;

      case 'NETWORK_ERROR':
        error.userTitle = 'No Internet Connection';
        error.userMessage = 'Calorify could not reach Google Gemini. Please check your WiFi or mobile data connection and retry.';
        error.actionLabel = 'Retry Analysis';
        break;

      case 'TIMEOUT':
        error.userTitle = 'Request Timed Out';
        error.userMessage = 'Google Gemini took longer than expected to respond. Please check your connection and retry.';
        error.actionLabel = 'Retry Analysis';
        break;

      case 'MODEL_UNAVAILABLE':
      case 'SERVER_ERROR':
        error.userTitle = 'Gemini Unavailable';
        error.userMessage = 'Google Gemini servers are temporarily overloaded or undergoing maintenance. Please try again in a few moments.';
        error.actionLabel = 'Retry Analysis';
        break;

      case 'CLINICAL_SAFETY_INTERCEPT':
        error.userTitle = 'Nourishment Safety Guidance';
        error.userMessage = 'Calorify encourages safe, sustainable nourishment. We cannot provide extreme starvation or deficit guidance. Please consult a healthcare professional.';
        error.actionLabel = 'Learn More';
        break;

      case 'INVALID_STRUCTURED_OUTPUT':
        error.userTitle = 'Photo Analysis Incomplete';
        error.userMessage = error.message.toLowerCase().includes('no recognizable food')
          ? 'Ria could not detect any food or drink in this photo. Please snap a clear photo of your meal.'
          : 'We could not clearly identify the meal or calculate its nutritional macros. Please try capturing under better lighting.';
        error.actionLabel = 'Try Another Photo';
        break;

      case 'APP_BACKGROUNDED':
        error.userTitle = 'Stream Paused';
        error.userMessage = 'Generation paused when you navigated away from Calorify.';
        error.actionLabel = 'Resume';
        break;

      case 'STREAM_INTERRUPTED':
      case 'STREAM_CANCELLED':
        error.userTitle = 'Response Interrupted';
        error.userMessage = 'Generation was stopped.';
        error.actionLabel = 'Regenerate';
        break;

      default:
        error.userTitle = 'AI Service Notice';
        error.userMessage =
          error.message && !error.message.startsWith('{') && !error.message.includes('"error"')
            ? error.message
            : 'An unexpected issue occurred while communicating with Gemini. Please try again.';
        error.actionLabel = error.retryable ? 'Retry' : 'Dismiss';
        break;
    }

    return error;
  }
}
