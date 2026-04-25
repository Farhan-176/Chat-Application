/**
 * Translation Service Utilities
 * Handles message translation with caching and Gemini API integration
 */

interface CachedTranslation {
  original: string;
  translations: { [language: string]: string };
  timestamp: number;
}

// In-memory cache for translations (cleared on page reload)
const translationCache: Map<string, CachedTranslation> = new Map();

// Cache expiry: 1 hour
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Get cached translation if available and not expired
 */
export function getCachedTranslation(messageId: string, targetLanguage: string): string | null {
  const cached = translationCache.get(messageId);
  
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    translationCache.delete(messageId);
    return null;
  }
  
  return cached.translations[targetLanguage] || null;
}

/**
 * Store translation in cache
 */
export function cacheTranslation(
  messageId: string,
  targetLanguage: string,
  translation: string,
  original: string
): void {
  let cached = translationCache.get(messageId);
  
  if (!cached) {
    cached = {
      original,
      translations: {},
      timestamp: Date.now()
    };
    translationCache.set(messageId, cached);
  }
  
  cached.translations[targetLanguage] = translation;
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Translate message using Gemini API
 * @param text - Message text to translate
 * @param targetLanguage - Language to translate to (e.g., "Spanish", "French")
 * @param sourceLanguage - Optional source language (defaults to auto-detect)
 */
export async function translateMessage(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  const prompt = sourceLanguage === 'auto'
    ? `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else.\n\n${text}`
    : `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text, nothing else.\n\n${text}`;
  
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('No translation response from Gemini');
    }
    
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

/**
 * Common languages for quick translation
 */
export const COMMON_LANGUAGES = [
  { code: 'es', name: 'Spanish', emoji: '🇪🇸' },
  { code: 'fr', name: 'French', emoji: '🇫🇷' },
  { code: 'de', name: 'German', emoji: '🇩🇪' },
  { code: 'it', name: 'Italian', emoji: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', emoji: '🇵🇹' },
  { code: 'ja', name: 'Japanese', emoji: '🇯🇵' },
  { code: 'ko', name: 'Korean', emoji: '🇰🇷' },
  { code: 'zh', name: 'Chinese', emoji: '🇨🇳' },
  { code: 'ru', name: 'Russian', emoji: '🇷🇺' },
  { code: 'ar', name: 'Arabic', emoji: '🇸🇦' }
];
