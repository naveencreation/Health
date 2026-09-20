import { AI_CONFIG } from '../config/AIConfig';

export class GeminiTokenEstimator {
  /**
   * Pure-JavaScript upper-bound token estimator calibrated for Gemini's SentencePiece tokenization.
   * Handles English words (~3.8 chars/token), Indic scripts (~2.1 chars/token), and images (258 tokens).
   */
  static estimateTextTokens(text: string | null | undefined): number {
    if (!text) return 0;

    let nonAsciiCount = 0;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 127) {
        nonAsciiCount++;
      }
    }

    const asciiCount = text.length - nonAsciiCount;
    // English/ASCII average: 3.8 chars per token
    const asciiTokens = Math.ceil(asciiCount / 3.8);
    // Non-ASCII/Indic average: 2.1 chars per token
    const nonAsciiTokens = Math.ceil(nonAsciiCount / 2.1);

    return Math.max(1, asciiTokens + nonAsciiTokens);
  }

  /**
   * Estimates tokens for an array of chat messages.
   */
  static estimateMessagesTokens(messages: Array<{ text: string }>): number {
    if (!messages || messages.length === 0) return 0;
    return messages.reduce((acc, msg) => acc + this.estimateTextTokens(msg.text) + 4, 0); // +4 token envelope per turn
  }

  /**
   * Multimodal token cost for image parts according to Gemini specifications.
   */
  static getImagePartTokens(): number {
    return AI_CONFIG.TOKEN_BUDGET.IMAGE_PART_TOKENS;
  }
}
