import { GoogleGenerativeAI } from '@google/generative-ai'

export type MoodType = 'joy' | 'anger' | 'calm' | 'excitement' | 'sadness' | 'neutral'

export interface MoodResult {
    mood: MoodType
    emoji: string
    color: string
    confidence: number
}

const MOOD_MAP: Record<MoodType, { emoji: string; color: string }> = {
    joy: { emoji: '😊', color: '#FFD700' },   // Gold
    anger: { emoji: '😠', color: '#FF4444' },   // Red
    calm: { emoji: '😌', color: '#4A90D9' },   // Blue
    excitement: { emoji: '🔥', color: '#00E676' },   // Green
    sadness: { emoji: '😢', color: '#9B59B6' },   // Purple
    neutral: { emoji: '💬', color: '#888888' },   // Gray
}

const VALID_MOODS = new Set<string>(Object.keys(MOOD_MAP))

let genAI: GoogleGenerativeAI | null = null
let model: any = null

function getModel() {
    if (!model) {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey || apiKey === 'your-gemini-api-key-here') {
            console.warn('⚠️  GEMINI_API_KEY not set. Falling back to basic mood analysis.')
            return null
        }
        genAI = new GoogleGenerativeAI(apiKey)
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    }
    return model
}

/**
 * Analyzes a message using Gemini AI and returns mood + color + emoji.
 * Falls back to a basic keyword analyzer if Gemini is unavailable.
 */
export async function analyzeMood(text: string): Promise<MoodResult> {
    try {
        const geminiModel = getModel()
        if (geminiModel) {
            return await analyzeWithGemini(geminiModel, text)
        }
    } catch (error) {
        console.error('Gemini mood analysis failed, using fallback:', error)
    }

    return analyzeBasic(text)
}

async function analyzeWithGemini(geminiModel: any, text: string): Promise<MoodResult> {
    const prompt = `Analyze the emotional mood of this chat message. Respond with ONLY a JSON object, no markdown, no code fences.

Message: "${text}"

Respond with exactly this JSON format:
{"mood": "<one of: joy, anger, calm, excitement, sadness, neutral>", "confidence": <0.0 to 1.0>}

Rules:
- Pick the SINGLE most dominant mood
- Short greetings like "hi", "hello" → neutral
- Profanity or frustration → anger
- Compliments, laughter, "haha", emojis like 😂 → joy
- Urgency, caps, "!!!", "amazing" → excitement
- Disappointment, loss, "miss you" → sadness
- Long thoughtful messages, advice → calm`

    const result = await geminiModel.generateContent(prompt)
    const responseText = result.response.text().trim()

    // Parse the JSON response
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const mood: MoodType = VALID_MOODS.has(parsed.mood) ? parsed.mood : 'neutral'
    const moodInfo = MOOD_MAP[mood]

    return {
        mood,
        emoji: moodInfo.emoji,
        color: moodInfo.color,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
    }
}

/** Basic keyword-based fallback when Gemini is unavailable */
function analyzeBasic(text: string): MoodResult {
    const lower = text.toLowerCase()

    const patterns: { mood: MoodType; keywords: string[] }[] = [
        { mood: 'joy', keywords: ['happy', 'love', 'great', 'awesome', 'amazing', 'haha', 'lol', '😂', '😊', '❤️', 'wonderful', 'fantastic', 'beautiful', 'thank'] },
        { mood: 'anger', keywords: ['angry', 'hate', 'terrible', 'worst', 'stupid', 'damn', 'ugh', 'furious', 'annoyed', 'frustrated'] },
        { mood: 'excitement', keywords: ['excited', 'wow', 'omg', 'incredible', 'insane', '!!!', 'cant wait', 'hyped', '🔥', '🚀'] },
        { mood: 'sadness', keywords: ['sad', 'miss', 'sorry', 'unfortunately', 'depressed', 'crying', 'heartbroken', '😢', '😭', 'lost'] },
        { mood: 'calm', keywords: ['okay', 'sure', 'alright', 'fine', 'understood', 'makes sense', 'i see', 'interesting', 'hmm'] },
    ]

    let bestMood: MoodType = 'neutral'
    let bestScore = 0

    for (const { mood, keywords } of patterns) {
        let score = 0
        for (const kw of keywords) {
            if (lower.includes(kw)) score++
        }
        if (score > bestScore) {
            bestScore = score
            bestMood = mood
        }
    }

    const moodInfo = MOOD_MAP[bestMood]
    return {
        mood: bestMood,
        emoji: moodInfo.emoji,
        color: moodInfo.color,
        confidence: bestScore > 0 ? Math.min(1, bestScore * 0.3) : 0.1,
    }
}
