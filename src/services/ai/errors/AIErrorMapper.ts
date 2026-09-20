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

    const message = error.message || String(error);
    const status = error.statusCode || error.status;

    // HTTP Status Codes
    if (status === 400) {
      if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
        return this.createError('INVALID_KEY', 'Your Gemini API key is invalid or has been revoked by Google.', 400, false);
      }
      return this.createError('INVALID_REQUEST', 'The request to Gemini was malformed. Please try again.', 400, false);
    }

    if (status === 403) {
      return this.createError('INVALID_KEY', 'Your Gemini API key does not have permission or has been revoked.', 403, false);
    }

    if (status === 429) {
      if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('resource_exhausted')) {
        return this.createError('QUOTA_EXCEEDED', 'Gemini API daily quota limit reached. Free keys reset daily at midnight Pacific Time.', 429, false);
      }
      return this.createError('RATE_LIMIT', 'You are sending requests too quickly. Please pause for a moment.', 429, true, 4);
    }

    if (status === 500 || status === 503) {
      return this.createError('MODEL_UNAVAILABLE', 'Google Gemini servers are temporarily overloaded. Please try again in a few moments.', status, true, 3);
    }

    // Abort and Network conditions
    if (error.name === 'AbortError' || message.includes('aborted')) {
      if (message.includes('background')) {
        return this.createError('APP_BACKGROUNDED', 'Generation paused because Calorify went to the background.', undefined, false);
      }
      return this.createError('TIMEOUT', 'Connection timed out while waiting for Gemini. Please check your network.', undefined, true);
    }

    if (message.includes('Network request failed') || message.includes('Failed to fetch') || message.includes('offline')) {
      return this.createError('NETWORK_ERROR', 'Could not reach Google Gemini. Please check your WiFi or mobile data connection.', undefined, true);
    }

    return this.createError(fallbackType, message || 'An unexpected AI error occurred.', status, false);
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
        error.userMessage = 'Google rejected this API key. Please check your key at Google AI Studio and reconnect.';
        error.actionLabel = 'Update Key';
        break;

      case 'QUOTA_EXCEEDED':
        error.userTitle = 'Daily Quota Limit';
        error.userMessage = 'Your free Google AI Studio key has hit its daily limit (1,500 requests). Free quotas refresh every 24 hours.';
        error.actionLabel = 'Manage Key';
        break;

      case 'RATE_LIMIT':
        error.userTitle = 'Chatting Too Fast';
        error.userMessage = `Please wait ${error.retryAfterSeconds || 3} seconds before sending another request to avoid provider limits.`;
        error.actionLabel = 'Try Again';
        break;

      case 'NETWORK_ERROR':
        error.userTitle = 'No Internet Connection';
        error.userMessage = 'Calorify could not reach Gemini. Please check your internet connection and retry.';
        error.actionLabel = 'Retry';
        break;

      case 'TIMEOUT':
        error.userTitle = 'Request Timed Out';
        error.userMessage = 'Google Gemini took longer than expected to respond. High network congestion may be occurring.';
        error.actionLabel = 'Retry';
        break;

      case 'CLINICAL_SAFETY_INTERCEPT':
        error.userTitle = 'Nourishment Safety Guidance';
        error.userMessage = 'Calorify encourages safe, sustainable nourishment. We cannot provide extreme starvation or deficit guidance. Please consult a healthcare professional.';
        error.actionLabel = 'Learn More';
        break;

      case 'INVALID_STRUCTURED_OUTPUT':
        error.userTitle = 'Photo Analysis Incomplete';
        error.userMessage = 'We could not clearly identify the meal or calculate its nutritional macros. Please try capturing under better lighting.';
        error.actionLabel = 'Take Another Photo';
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
        error.userMessage = error.message || 'An unexpected issue occurred while communicating with Gemini.';
        error.actionLabel = error.retryable ? 'Retry' : 'Dismiss';
        break;
    }

    return error;
  }
}
