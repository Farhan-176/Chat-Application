import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null
let model: any = null

const FALLBACK_DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    hola: 'hello',
    gracias: 'thank you',
    adios: 'goodbye',
    bonjour: 'hello',
    merci: 'thank you',
    salut: 'hi',
  },
  es: {
    hello: 'hola',
    hi: 'hola',
    goodbye: 'adios',
    thanks: 'gracias',
    'thank you': 'gracias',
  },
}

function getModel() {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return null
    }
    genAI = new GoogleGenerativeAI(apiKey)
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  }
  return model
}

const sanitizeLanguageCode = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 12) || 'en'
}

const simpleFallbackTranslate = (text: string, targetLanguage: string) => {
  const dictionary = FALLBACK_DICTIONARY[targetLanguage]
  if (!dictionary) {
    return text
  }

  let translated = text
  Object.entries(dictionary).forEach(([source, target]) => {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    translated = translated.replace(new RegExp(`\\b${escaped}\\b`, 'ig'), target)
  })
  return translated
}

export interface TranslationResult {
  text: string
  sourceLanguage: string
  targetLanguage: string
  provider: 'gemini' | 'fallback'
}

export async function translateText(text: string, targetLanguageRaw: string): Promise<TranslationResult> {
  const targetLanguage = sanitizeLanguageCode(targetLanguageRaw)
  const cleanText = String(text || '').trim()

  if (!cleanText) {
    return {
      text: '',
      sourceLanguage: 'und',
      targetLanguage,
      provider: 'fallback',
    }
  }

  try {
    const geminiModel = getModel()
    if (geminiModel) {
      const prompt = `You are a translation engine.
Translate the message to language code "${targetLanguage}".
Return ONLY valid JSON with keys: translatedText, sourceLanguage.
Keep tone and intent. Preserve URLs, mentions, and emojis.

Message:
"""
${cleanText}
"""`

      const result = await geminiModel.generateContent(prompt)
      const raw = result.response.text().trim()
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)

      const translatedText = String(parsed?.translatedText || '').trim() || cleanText
      const sourceLanguage = sanitizeLanguageCode(String(parsed?.sourceLanguage || 'auto'))

      return {
        text: translatedText,
        sourceLanguage,
        targetLanguage,
        provider: 'gemini',
      }
    }
  } catch (error) {
    console.error('Gemini translation failed, using fallback:', error)
  }

  return {
    text: simpleFallbackTranslate(cleanText, targetLanguage),
    sourceLanguage: 'auto',
    targetLanguage,
    provider: 'fallback',
  }
}

export { sanitizeLanguageCode }
