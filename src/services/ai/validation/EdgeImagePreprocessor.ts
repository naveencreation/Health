import { AI_CONFIG } from '../config/AIConfig';
import { AIErrorMapper } from '../errors/AIErrorMapper';
import { AIError } from '../types/ai.types';

export interface PreprocessedImageResult {
  isValid: boolean;
  cleanBase64: string;
  mimeType: string;
  estimatedBytes: number;
  error?: AIError;
}

export class EdgeImagePreprocessor {
  /**
   * Prepares and validates base64 image data before sending to Gemini multimodal API.
   * Strips URI prefixes, verifies payload bounds, and protects against JS heap exhaustion.
   */
  static processBase64(rawBase64: string, fallbackMime: string = 'image/jpeg'): PreprocessedImageResult {
    if (!rawBase64 || typeof rawBase64 !== 'string') {
      return {
        isValid: false,
        cleanBase64: '',
        mimeType: fallbackMime,
        estimatedBytes: 0,
        error: AIErrorMapper.createError(
          'INVALID_REQUEST',
          'No image data provided for food analysis.',
          undefined,
          false
        ),
      };
    }

    let clean = rawBase64.trim();
    let detectedMime = fallbackMime;

    // 1. Strip data URL header if present (e.g. data:image/jpeg;base64,...)
    if (clean.startsWith('data:')) {
      const commaIndex = clean.indexOf(',');
      if (commaIndex !== -1) {
        const header = clean.slice(0, commaIndex);
        const mimeMatch = header.match(/data:([^;]+);/);
        if (mimeMatch && mimeMatch[1]) {
          detectedMime = mimeMatch[1];
        }
        clean = clean.slice(commaIndex + 1);
      }
    }

    // 2. Strip whitespace and line breaks from base64
    clean = clean.replace(/[\r\n\s]+/g, '');

    // 3. Estimate decoded byte size: (base64 length * 3/4) - padding
    const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
    const estimatedBytes = Math.floor((clean.length * 3) / 4) - padding;

    if (estimatedBytes < 100) {
      return {
        isValid: false,
        cleanBase64: '',
        mimeType: detectedMime,
        estimatedBytes,
        error: AIErrorMapper.createError(
          'INVALID_REQUEST',
          'Image payload appears to be empty or corrupted.',
          undefined,
          false
        ),
      };
    }

    // 4. Check upper payload threshold to protect mobile memory
    if (estimatedBytes > AI_CONFIG.IMAGE.MAX_BASE64_BYTES) {
      return {
        isValid: false,
        cleanBase64: '',
        mimeType: detectedMime,
        estimatedBytes,
        error: AIErrorMapper.createError(
          'INPUT_TOO_LARGE',
          `Image is too large (${Math.round(estimatedBytes / 1024 / 1024)}MB). Please capture a compressed photo.`,
          undefined,
          false
        ),
      };
    }

    return {
      isValid: true,
      cleanBase64: clean,
      mimeType: detectedMime,
      estimatedBytes,
    };
  }
}
