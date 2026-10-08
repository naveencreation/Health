/**
 * Utility to extract clean base64 image data from a local file URI or data URL.
 * Standard Fetch and FileReader polyfills handle reading local file schemes on React Native.
 */
export async function readBase64FromUri(uri: string): Promise<string | undefined> {
  if (!uri) return undefined;

  // If already a data URL (e.g. data:image/jpeg;base64,...)
  if (uri.startsWith('data:')) {
    const parts = uri.split(',');
    return parts.length > 1 && parts[1].length >= 100 ? parts[1] : undefined;
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise<string | undefined>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          resolve(undefined);
          return;
        }
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        if (!base64 || base64.trim().length < 100) {
          resolve(undefined);
        } else {
          resolve(base64.trim());
        }
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[readBase64FromUri] Failed to convert URI to base64:', error);
    }
    return undefined;
  }
}
